/**
 * Yamora Wafers — Shiprocket Webhook Receiver & Status Synchronization Processor
 *
 * Realtime webhook listener that processes courier events, updates MongoDB Shipment
 * & Order status, logs audit trails, and triggers customer WhatsApp/Email alerts.
 */

const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const LogisticsSettings = require('../models/LogisticsSettings');
const LogisticsAuditLog = require('../models/LogisticsAuditLog');
const sendResponse = require('../utils/response');
const ErrorResponse = require('../utils/errorResponse');
const { notifyOrderStatus } = require('../utils/notify');
const rtoService = require('../services/rto.service');
const logger = require('../config/logger');

/**
 * Shiprocket Status Code Mapping to System Statuses
 * 6 = Shipped / In Transit, 7 = Delivered, 8 = Canceled, 9 = RTO Initiated, 17 = Out For Delivery, 18 = In Transit
 */
const mapShiprocketStatus = (statusCode, currentStatus = '') => {
  const statusStr = String(currentStatus).toUpperCase();

  if (statusStr.includes('RTO') || statusCode === 9) return 'RTO';
  if (statusStr.includes('DELIVERED') || statusCode === 7) return 'Delivered';
  if (statusStr.includes('OUT FOR DELIVERY') || statusCode === 17) return 'Out For Delivery';
  if (statusStr.includes('TRANSIT') || statusCode === 6 || statusCode === 18) return 'In Transit';
  if (statusStr.includes('PICKED UP') || statusCode === 19) return 'Picked Up';
  if (statusStr.includes('CANCEL')) return 'Cancelled';
  if (statusStr.includes('LOST')) return 'Failed';

  return currentStatus || 'In Transit';
};

// @desc    Shiprocket Realtime Webhook Receiver
// @route   POST /api/v1/logistics/webhook
// @access  Public (Protected by Token/Signature)
exports.handleShiprocketWebhook = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const webhookToken = req.headers['x-shiprocket-secret'] || req.headers['x-shiprocket-signature'] || req.query.token;

    const settings = await LogisticsSettings.findOne();
    const expectedToken = settings?.shiprocket?.webhookSecret || 'yamora_logistics_wh_sec_2026';

    // Verify Secret Token
    if (webhookToken && webhookToken !== expectedToken) {
      logger.warn(`[ShiprocketWebhook] Unauthorized webhook request with invalid token: ${webhookToken}`);
      return next(new ErrorResponse('Unauthorized Webhook Signature', 401));
    }

    const {
      awb: awbCode,
      shipment_id: shipmentId,
      order_id: orderId,
      current_status: currentStatus,
      current_status_id: statusCode,
      etd,
      scans
    } = payload;

    if (!awbCode && !shipmentId && !orderId) {
      return sendResponse(res, 200, { success: true, message: 'Ignored empty webhook payload' });
    }

    logger.info(`[ShiprocketWebhook] Processing status "${currentStatus}" for AWB: ${awbCode || shipmentId || orderId}`);

    // Lookup Shipment Document by AWB, Shipment ID, or Order ID
    const query = {};
    if (awbCode) query.awbCode = awbCode;
    else if (shipmentId) query.shiprocketShipmentId = shipmentId;
    else if (orderId) query.orderId = orderId;

    const shipmentDoc = await Shipment.findOne(query);
    if (!shipmentDoc) {
      logger.warn(`[ShiprocketWebhook] No shipment document matched query: ${JSON.stringify(query)}`);
      return sendResponse(res, 200, { success: true, message: 'Shipment not found in local DB' });
    }

    const mappedStatus = mapShiprocketStatus(statusCode, currentStatus);

    // Prevent duplicate updates (Idempotency Guard)
    if (shipmentDoc.providerStatus === currentStatus && shipmentDoc.status === mappedStatus) {
      return sendResponse(res, 200, { success: true, message: 'Duplicate status update ignored' });
    }

    // Update Shipment
    const prevStatus = shipmentDoc.status;
    shipmentDoc.status = mappedStatus;
    shipmentDoc.providerStatus = currentStatus || mappedStatus;
    shipmentDoc.statusStatusCode = statusCode || shipmentDoc.statusStatusCode;
    if (etd) shipmentDoc.estimatedDelivery = new Date(etd);
    if (mappedStatus === 'Delivered') shipmentDoc.deliveredDate = new Date();
    shipmentDoc.lastSyncedAt = new Date();

    // Push tracking activity log
    shipmentDoc.trackingHistory.push({
      status: mappedStatus,
      activity: currentStatus || `Status updated to ${mappedStatus}`,
      location: scans?.[0]?.location || '',
      date: new Date(),
      rawData: payload
    });

    await shipmentDoc.save();

    // Synchronize Order status & timeline
    const orderDoc = await Order.findOne({ id: shipmentDoc.orderId });
    if (orderDoc) {
      if (mappedStatus === 'Delivered') {
        orderDoc.status      = 'Delivered';
        orderDoc.payment.status = 'Paid';
        orderDoc.timeline.push({
          status: 'Delivered',
          time:   new Date(),
          note:   `Courier Update (${shipmentDoc.courierName || 'Shiprocket'}): ${currentStatus || mappedStatus}`
        });
        await orderDoc.save();
        await notifyOrderStatus(orderDoc, 'Delivered').catch(() => {});

      } else if (mappedStatus === 'Out For Delivery') {
        orderDoc.status = 'Out for Delivery';
        orderDoc.timeline.push({
          status: 'Out for Delivery',
          time:   new Date(),
          note:   `Courier Update: Out for delivery.`
        });
        await orderDoc.save();
        await notifyOrderStatus(orderDoc, 'Out for Delivery').catch(() => {});

      } else if (mappedStatus === 'In Transit' || mappedStatus === 'Picked Up') {
        orderDoc.status = 'Shipped';
        orderDoc.timeline.push({
          status: 'Shipped',
          time:   new Date(),
          note:   `Courier Update (${shipmentDoc.courierName || 'Shiprocket'}): ${currentStatus || mappedStatus}`
        });
        await orderDoc.save();
        await notifyOrderStatus(orderDoc, 'Shipped').catch(() => {});

      } else if (mappedStatus === 'RTO') {
        // ── Delegate entirely to the centralized RTO service ─────────────────
        // It handles: order status (RTO In Transit), timeline, auto-refund for
        // prepaid orders, rich customer notification, admin alert, audit log.
        const courierReason = payload?.scans?.[0]?.activity || currentStatus || '';
        await rtoService.handleRTOInitiated(orderDoc, shipmentDoc, courierReason);
        // Save shipment to persist rtoInitiatedAt, courierReasonRaw, rtoRefundAutoCreated
        await shipmentDoc.save();

      } else if (mappedStatus === 'Cancelled') {
        orderDoc.status = 'Cancelled';
        orderDoc.timeline.push({
          status: 'Cancelled',
          time:   new Date(),
          note:   `Courier Update: Shipment cancelled.`
        });
        await orderDoc.save();
        await notifyOrderStatus(orderDoc, 'Cancelled').catch(() => {});
      }
    }

    // Log Audit Trail
    await LogisticsAuditLog.create({
      action: 'webhook_status_update',
      shipmentId: String(shipmentDoc._id),
      orderId: shipmentDoc.orderId,
      user: 'Shiprocket Webhook',
      userRole: 'system',
      previousValue: prevStatus,
      newValue: mappedStatus,
      details: `Updated status from "${prevStatus}" to "${mappedStatus}" via Shiprocket Webhook.`
    });

    sendResponse(res, 200, {
      success: true,
      message: `Shipment ${shipmentDoc.orderId} updated to ${mappedStatus}`
    });
  } catch (error) {
    logger.error(`[ShiprocketWebhook Error] ${error.message}`);
    next(error);
  }
};

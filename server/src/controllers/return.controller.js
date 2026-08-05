/**
 * Yamora Wafers — Return Management & Reverse Logistics Controller
 *
 * Endpoints:
 *  POST /api/v1/orders/:id/refund                          — customer requests return
 *  POST /api/v1/admin/refunds/:refundId/approve-return     — admin approves + Shiprocket reverse pickup
 *  POST /api/v1/admin/refunds/:refundId/mark-received      — admin marks customer-return received
 *  POST /api/v1/admin/logistics/shipments/:id/rto-received — admin marks RTO package received
 *  POST /api/v1/admin/orders/:orderId/reattempt-delivery   — admin creates Shipment B for re-delivery
 */

'use strict';

const mongoose = require('mongoose');
const Refund   = require('../models/Refund');
const Order    = require('../models/Order');
const Shipment = require('../models/Shipment');
const Counter  = require('../models/Counter');
const LogisticsAuditLog  = require('../models/LogisticsAuditLog');
const logisticsService   = require('../services/logistics/LogisticsService');
const refundService      = require('../services/refund.service');
const sendResponse = require('../utils/response');
const ErrorResponse = require('../utils/errorResponse');
const { notify, notifyOrderStatus, notifyAdmin } = require('../utils/notify');
const logger = require('../config/logger');

/** Maximum number of delivery attempts per order (original + re-attempts). */
const MAX_ATTEMPT_NUMBER = 3;

/* =========================================================================
   CUSTOMER
   ========================================================================= */

// @desc    Submit Return / Replacement Request
// @route   POST /api/v1/orders/:id/refund
// @access  Private (Customer)
exports.requestReturn = async (req, res, next) => {
  try {
    const { type = 'Refund', reason, userNote, proofPhotos } = req.body;
    const orderId = req.params.id;

    const order = await Order.findOne({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(orderId) ? orderId : null }, { id: orderId }]
    });

    if (!order) return next(new ErrorResponse('Order not found', 404));

    if (req.user.role === 'customer' && String(order.customerId) !== String(req.user._id)) {
      return next(new ErrorResponse('Not authorized to access this order', 403));
    }

    const existing = await Refund.findOne({ orderId: order.id, status: { $nin: ['Rejected', 'Cancelled', 'Refunded'] } });
    if (existing) {
      return next(new ErrorResponse(`A return/refund request is already ${existing.status} for this order.`, 400));
    }

    const seq      = await Counter.next('refundNumber');
    const refundId = `REF-${String(seq).padStart(6, '0')}`;

    const refundDoc = await Refund.create({
      refundId,
      orderId:       order.id,
      customerId:    order.customerId || req.user._id,
      customerName:  order.userName,
      customerPhone: order.userPhone,
      orderTotal:    order.totals.total,
      requestedAmount: order.totals.total,
      type,
      reason,
      description: userNote,
      images: Array.isArray(proofPhotos) ? proofPhotos : [],
      source: 'customer',
      status: 'Submitted',
      timeline: [{
        status: 'Submitted',
        note:   `Return request submitted by customer: ${reason}`,
        by:     order.userName,
        at:     new Date()
      }]
    });

    order.status = 'Refund Requested';
    order.timeline.push({ status: 'Refund Requested', time: new Date(), note: `Customer requested return (${type}): ${reason}` });
    await order.save();

    await LogisticsAuditLog.create({
      action:   'return_requested',
      orderId:  order.id,
      user:     order.userName,
      userRole: 'customer',
      details:  `Return requested (${type}): ${reason}`
    }).catch(() => {});

    sendResponse(res, 201, {
      success: true,
      message: 'Return request submitted successfully. Our team will review it within 24 hours.',
      data:    refundDoc
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================================
   ADMIN — Customer-Initiated Return
   ========================================================================= */

// @desc    Admin Approve Return & Schedule Reverse Pickup (customer-initiated)
// @route   POST /api/v1/admin/refunds/:refundId/approve-return
// @access  Private (Admin)
exports.approveReturnAndReversePickup = async (req, res, next) => {
  try {
    const { refundId } = req.params;
    const refundDoc = await Refund.findOne({ refundId });
    if (!refundDoc) return next(new ErrorResponse('Return request not found', 404));

    const order = await Order.findOne({ id: refundDoc.orderId });
    if (!order) return next(new ErrorResponse('Associated order not found', 404));

    refundDoc.status       = 'Approved';
    refundDoc.approvedAmount = refundDoc.requestedAmount || order.totals.total;
    refundDoc.approvedBy   = req.user.name || 'Admin';
    refundDoc.approvedAt   = new Date();
    refundDoc.timeline.push({
      status: 'Approved',
      note:   'Return approved by admin. Reverse pickup pending.',
      by:     req.user.name || 'Admin',
      at:     new Date()
    });
    await refundDoc.save();

    order.status = 'Refund Approved';
    order.timeline.push({ status: 'Refund Approved', time: new Date(), note: `Return approved by ${req.user.name || 'Admin'}.` });
    await order.save();

    // Trigger Shiprocket Reverse Pickup
    let reversePickupResult = null;
    try {
      const settings = await logisticsService.getSettings();
      if (settings.shiprocket.enabled) {
        const token    = await logisticsService.getAuthToken('shiprocket');
        const provider = logisticsService.getProvider('shiprocket');
        const reversePayload = {
          order_id:              `RET-${order.id}`,
          order_date:            new Date().toISOString().replace('T', ' ').substring(0, 19),
          pickup_customer_name:  order.userName,
          pickup_address:        order.address?.addressLine || 'Address',
          pickup_city:           order.address?.city        || 'City',
          pickup_pincode:        order.address?.pincode     || '395006',
          pickup_state:          order.address?.state       || 'Gujarat',
          pickup_phone:          order.userPhone            || '9999999999',
          order_items: order.items.map(item => ({
            name:          item.flavorName,
            sku:           `${item.flavorId}-${item.packId}`,
            units:         item.quantity,
            selling_price: item.unitPrice
          })),
          payment_method: 'Prepaid',
          total_discount: 0,
          sub_total:      refundDoc.approvedAmount
        };
        reversePickupResult = await provider._request('/orders/create/return', 'POST', reversePayload, token)
          .catch(err => { logger.warn(`[ReversePickup] ${err.message}`); return null; });
      }
    } catch (reverseErr) {
      logger.warn(`[ReversePickup] Failed: ${reverseErr.message}`);
    }

    await LogisticsAuditLog.create({
      action:   'return_approved',
      orderId:  order.id,
      user:     req.user.name || 'Admin',
      userRole: req.user.role,
      details:  `Return approved for ₹${refundDoc.approvedAmount}.`
    }).catch(() => {});

    sendResponse(res, 200, {
      success: true,
      message: 'Return request approved. Customer notified.',
      data:    { refund: refundDoc, reversePickup: reversePickupResult }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark Customer-Return Package Received & Quality Inspected
// @route   POST /api/v1/admin/refunds/:refundId/mark-received
// @access  Private (Admin)
exports.markReturnReceived = async (req, res, next) => {
  try {
    const { refundId } = req.params;
    const { condition = 'Reusable' } = req.body; // 'Reusable' | 'Damaged'

    const refundDoc = await Refund.findOne({ refundId });
    if (!refundDoc) return next(new ErrorResponse('Return request not found', 404));

    const order = await Order.findOne({ id: refundDoc.orderId });
    if (!order) return next(new ErrorResponse('Order not found', 404));

    refundDoc.itemReceivedAt  = new Date();
    refundDoc.status          = 'Item Received';
    refundDoc.timeline.push({
      status: 'Item Received',
      note:   `Package received. Condition: ${condition}.`,
      by:     req.user.name || 'Admin',
      at:     new Date()
    });
    await refundDoc.save();

    order.timeline.push({ status: 'Item Received', time: new Date(), note: `Returned package received. Condition: ${condition}.` });
    await order.save();

    await LogisticsAuditLog.create({
      action:   'return_item_received',
      orderId:  order.id,
      user:     req.user.name || 'Admin',
      userRole: req.user.role,
      details:  `Returned package received & inspected (condition: ${condition}).`
    }).catch(() => {});

    sendResponse(res, 200, {
      success: true,
      message: `Package received and quality inspected (${condition}).`,
      data:    refundDoc
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================================
   ADMIN — RTO (Return to Origin) Workflow
   ========================================================================= */

/**
 * @desc    Admin marks an RTO package as physically received at warehouse.
 *          Records the reason, item condition, and chosen disposition.
 *          Disposition drives the next action:
 *            - "Refund Customer"      → ensure a Refund doc exists & move it to "Under Review"
 *            - "Re-attempt Delivery"  → flag the shipment; admin then calls /reattempt-delivery
 *            - "Close Order"          → close the order, cancel any pending Refund
 *
 * @route   POST /api/v1/admin/logistics/shipments/:shipmentId/rto-received
 * @access  Private (Admin)
 */
exports.markRTOReceived = async (req, res, next) => {
  try {
    const { shipmentId } = req.params;
    const {
      rtoReason       = 'Other',
      rtoItemCondition = 'Reusable',
      rtoDisposition   = 'Refund Customer',
      rtoNotes         = ''
    } = req.body;

    // ── Validate inputs ──────────────────────────────────────────────────────
    const validReasons     = ['Customer Not Available','Customer Refused','Wrong Address','Phone Unreachable','Address Incomplete','Courier Issue','Other'];
    const validConditions  = ['Reusable','Damaged'];
    const validDispositions = ['Refund Customer','Re-attempt Delivery','Close Order'];

    if (!validReasons.includes(rtoReason))
      return next(new ErrorResponse(`Invalid rtoReason. Valid: ${validReasons.join(', ')}`, 400));
    if (!validConditions.includes(rtoItemCondition))
      return next(new ErrorResponse(`Invalid rtoItemCondition. Valid: ${validConditions.join(', ')}`, 400));
    if (!validDispositions.includes(rtoDisposition))
      return next(new ErrorResponse(`Invalid rtoDisposition. Valid: ${validDispositions.join(', ')}`, 400));

    // ── Load shipment & order ─────────────────────────────────────────────────
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return next(new ErrorResponse('Shipment not found', 404));
    if (!['RTO', 'RTO In Transit', 'RTO Delivered'].includes(shipment.status)) {
      return next(new ErrorResponse(`Shipment status is "${shipment.status}". Only RTO shipments can be marked as received.`, 400));
    }

    const order = await Order.findOne({ id: shipment.orderId });
    if (!order) return next(new ErrorResponse('Associated order not found', 404));

    // ── Record RTO receipt on Shipment ───────────────────────────────────────
    shipment.rtoReason        = rtoReason;
    shipment.rtoItemCondition = rtoItemCondition;
    shipment.rtoDisposition   = rtoDisposition;
    shipment.rtoReceivedAt    = new Date();
    shipment.rtoReceivedBy    = req.user.name || 'Admin';
    shipment.rtoNotes         = rtoNotes;
    shipment.status           = 'RTO Delivered'; // final courier status
    await shipment.save();

    // ── Update Order status to "RTO Received" ────────────────────────────────
    order.status = 'RTO Received';
    order.timeline.push({
      status: 'RTO Received',
      time:   new Date(),
      note:   `RTO package received by admin. Reason: ${rtoReason}. Condition: ${rtoItemCondition}. Disposition: ${rtoDisposition}.${rtoNotes ? ` Notes: ${rtoNotes}` : ''}`
    });

    let refundDoc   = null;
    let resultNote  = '';

    // ── Execute disposition ──────────────────────────────────────────────────
    if (rtoDisposition === 'Refund Customer') {
      // Find the auto-created or customer refund, move it to Under Review
      refundDoc = await Refund.findOne({
        orderId: order.id,
        status:  { $nin: ['Rejected', 'Cancelled', 'Refunded'] }
      });

      if (refundDoc) {
        refundDoc.status = 'Under Review';
        refundDoc.timeline.push({
          status: 'Under Review',
          note:   `RTO package received. Admin picked up review. Condition: ${rtoItemCondition}.`,
          by:     req.user.name || 'Admin',
          at:     new Date()
        });
        await refundDoc.save();
        resultNote = `Existing refund ${refundDoc.refundId} moved to Under Review.`;
      } else {
        // No refund doc yet (e.g. COD order where no auto-refund was created)
        const seq  = await Counter.next('refundNumber');
        const rId  = `REF-${String(seq).padStart(6, '0')}`;
        refundDoc  = await Refund.create({
          refundId:        rId,
          orderId:         order.id,
          customerId:      order.customerId,
          customerName:    order.userName,
          customerPhone:   order.userPhone || '',
          orderTotal:      order.totals.total,
          requestedAmount: order.totals.total,
          reason:          'Other',
          description:     `Admin-created on RTO receipt. Reason: ${rtoReason}. Condition: ${rtoItemCondition}.`,
          source:          'admin',
          status:          'Under Review',
          timeline: [{
            status: 'Under Review',
            note:   `Created by admin on RTO receipt.`,
            by:     req.user.name || 'Admin',
            at:     new Date()
          }]
        });
        resultNote = `New refund ${rId} created and moved to Under Review.`;
      }

      order.status = 'RTO Refund Pending';
      order.timeline.push({ status: 'RTO Refund Pending', time: new Date(), note: resultNote });

      // Notify customer
      await notify(order.customerId, {
        title:   `Refund update for Order ${order.displayId || order.id}`,
        message: `We've received your returned parcel for order ${order.displayId || order.id}. Your refund is under review and will be processed soon.`,
        type:    'OrderStatus'
      }).catch(() => {});

    } else if (rtoDisposition === 'Re-attempt Delivery') {
      order.status = 'Re-delivery Pending';
      order.timeline.push({ status: 'Re-delivery Pending', time: new Date(), note: 'Admin chose re-attempt delivery. Awaiting new shipment creation.' });

      // Cancel any pending auto-refund so finance doesn't accidentally process it
      const pendingRefund = await Refund.findOne({
        orderId: order.id,
        source:  'rto_auto',
        status:  { $nin: ['Rejected', 'Cancelled', 'Refunded'] }
      });
      if (pendingRefund) {
        pendingRefund.status = 'Cancelled';
        pendingRefund.timeline.push({
          status: 'Cancelled',
          note:   'Cancelled because admin chose Re-attempt Delivery for this RTO order.',
          by:     req.user.name || 'Admin',
          at:     new Date()
        });
        await pendingRefund.save();
        resultNote = `Auto-refund ${pendingRefund.refundId} cancelled (re-delivery chosen).`;
      }

      // Notify customer
      await notify(order.customerId, {
        title:   `Re-delivery for Order ${order.displayId || order.id}`,
        message: `Great news! We've received your parcel back and are arranging a re-delivery for order ${order.displayId || order.id}. We'll notify you once it's shipped.`,
        type:    'OrderStatus'
      }).catch(() => {});

    } else if (rtoDisposition === 'Close Order') {
      order.status      = 'Completed';
      order.closedReason = 'RTO Closed by Admin';
      order.timeline.push({ status: 'Completed', time: new Date(), note: 'Order closed by admin after RTO receipt. No refund or re-delivery.' });

      // Cancel any pending refund
      const pendingRefund = await Refund.findOne({
        orderId: order.id,
        status:  { $nin: ['Rejected', 'Cancelled', 'Refunded'] }
      });
      if (pendingRefund) {
        pendingRefund.status = 'Cancelled';
        pendingRefund.timeline.push({
          status: 'Cancelled',
          note:   'Cancelled because admin closed the order after RTO.',
          by:     req.user.name || 'Admin',
          at:     new Date()
        });
        await pendingRefund.save();
        resultNote = `Refund ${pendingRefund.refundId} cancelled (order closed).`;
      }
    }

    await order.save();

    await LogisticsAuditLog.create({
      action:    'rto_received',
      orderId:   order.id,
      shipmentId: shipmentId,
      user:      req.user.name || 'Admin',
      userRole:  req.user.role,
      details:   `RTO received. Reason: ${rtoReason}. Condition: ${rtoItemCondition}. Disposition: ${rtoDisposition}. ${resultNote}`
    }).catch(() => {});

    await notifyAdmin({
      title:   `RTO Received: Order ${order.displayId || order.id}`,
      message: `RTO package processed. Reason: ${rtoReason}. Condition: ${rtoItemCondition}. Disposition: ${rtoDisposition}. ${resultNote}`,
      type:    'RTO'
    }).catch(() => {});

    sendResponse(res, 200, {
      success: true,
      message: `RTO package received. Disposition: ${rtoDisposition}.${resultNote ? ` ${resultNote}` : ''}`,
      data:    { shipment, order, refund: refundDoc }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Shipment B for re-delivery after RTO.
 *          - Validates order is in "Re-delivery Pending" state.
 *          - Enforces a 3-attempt cap (original + 2 re-attempts).
 *          - Marks Shipment A (and any prior shipments) as isActive = false.
 *          - Creates a new Shipment doc with attemptNumber = previous + 1.
 *          - Calls Shiprocket to create a new forward shipment.
 *          - Sets Order.status → "Assigned to Logistics".
 *
 * @route   POST /api/v1/admin/orders/:orderId/reattempt-delivery
 * @access  Private (Admin)
 */
exports.reAttemptDelivery = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { address } = req.body; // optional updated address

    // ── Load & validate order ─────────────────────────────────────────────────
    const order = await Order.findOne({ id: orderId });
    if (!order) return next(new ErrorResponse('Order not found', 404));

    if (!['Re-delivery Pending', 'RTO Received', 'RTO In Transit'].includes(order.status)) {
      return next(new ErrorResponse(
        `Cannot re-attempt delivery. Order status is "${order.status}". Expected "Re-delivery Pending".`, 400
      ));
    }

    // ── Enforce attempt cap ───────────────────────────────────────────────────
    const existingShipments = await Shipment.find({ order: order._id }).sort({ attemptNumber: -1 });
    const lastAttempt       = existingShipments[0];
    const nextAttemptNumber = (lastAttempt?.attemptNumber || 1) + 1;

    if (nextAttemptNumber > MAX_ATTEMPT_NUMBER) {
      return next(new ErrorResponse(
        `Maximum re-attempt limit of ${MAX_ATTEMPT_NUMBER} reached for this order. Only a refund is possible.`, 400
      ));
    }

    // ── Deactivate all previous shipments ────────────────────────────────────
    await Shipment.updateMany(
      { order: order._id },
      { $set: { isActive: false } }
    );

    // ── Resolve delivery address ──────────────────────────────────────────────
    const deliveryAddress = address || order.address;
    const shipmentTag     = `Shipment ${String.fromCharCode(64 + nextAttemptNumber)}`; // A, B, C

    // ── Create new Shipment doc (Shipment B / C) ──────────────────────────────
    const newShipment = await Shipment.create({
      order:        order._id,
      orderId:      order.id,
      provider:     lastAttempt?.provider || 'shiprocket',
      attemptNumber: nextAttemptNumber,
      shipmentTag,
      isActive:     true,
      status:       'Shipment Created',
      dimensions:   lastAttempt?.dimensions || { length: 15, breadth: 15, height: 10, weight: 0.5 },
      packageSpecs: lastAttempt?.packageSpecs || {}
    });

    // ── Create Shiprocket shipment ────────────────────────────────────────────
    let shiprocketResult = null;
    try {
      const settings = await logisticsService.getSettings();
      if (settings.shiprocket?.enabled) {
        const defaultPickup = settings.pickupLocations.find(l => l.isDefault) || settings.pickupLocations[0];
        const token    = await logisticsService.getAuthToken('shiprocket');
        const provider = logisticsService.getProvider('shiprocket');

        const shiprocketPayload = {
          order_id:              `${order.id}-ATT${nextAttemptNumber}`,
          order_date:            new Date().toISOString().replace('T', ' ').substring(0, 19),
          pickup_location:       defaultPickup?.pickupLocation || 'Primary Warehouse',
          billing_customer_name: order.userName,
          billing_address:       deliveryAddress.addressLine,
          billing_city:          deliveryAddress.city,
          billing_pincode:       deliveryAddress.pincode,
          billing_state:         deliveryAddress.state,
          billing_country:       'India',
          billing_phone:         order.userPhone || '9999999999',
          shipping_is_billing:   true,
          order_items: order.items.map(item => ({
            name:          item.flavorName,
            sku:           `${item.flavorId}-${item.packId}`,
            units:         item.quantity,
            selling_price: item.unitPrice
          })),
          payment_method: order.payment?.method === 'COD' ? 'COD' : 'Prepaid',
          sub_total:      order.totals.total,
          length:         newShipment.dimensions.length,
          breadth:        newShipment.dimensions.breadth,
          height:         newShipment.dimensions.height,
          weight:         newShipment.dimensions.weight
        };

        shiprocketResult = await provider.createOrder(token, shiprocketPayload).catch(err => {
          logger.warn(`[ReAttempt] Shiprocket order creation warning: ${err.message}`);
          return null;
        });

        if (shiprocketResult) {
          newShipment.shiprocketOrderId   = shiprocketResult.order_id;
          newShipment.shiprocketShipmentId = shiprocketResult.shipment_id;
          newShipment.status              = 'Confirmed';
          await newShipment.save();
        }
      }
    } catch (srErr) {
      logger.warn(`[ReAttempt] Shiprocket integration warning: ${srErr.message}`);
    }

    // ── Update order ──────────────────────────────────────────────────────────
    order.status = 'Assigned to Logistics';
    if (address) {
      order.address = address; // persist updated address
    }
    order.timeline.push({
      status: 'Assigned to Logistics',
      time:   new Date(),
      note:   `Re-attempt delivery #${nextAttemptNumber} created (${shipmentTag}). ${address ? 'Delivery address updated.' : ''}`
    });
    await order.save();

    // ── Notify customer ───────────────────────────────────────────────────────
    await notify(order.customerId, {
      title:   `Order ${order.displayId || order.id} is being reshipped`,
      message: `Great news! Your order ${order.displayId || order.id} is being sent out again (attempt #${nextAttemptNumber}). We will notify you once it is shipped.`,
      type:    'OrderStatus'
    }).catch(() => {});

    // ── Audit log ─────────────────────────────────────────────────────────────
    await LogisticsAuditLog.create({
      action:    'reattempt_delivery_created',
      orderId:   order.id,
      shipmentId: String(newShipment._id),
      user:      req.user.name || 'Admin',
      userRole:  req.user.role,
      details:   `Re-attempt #${nextAttemptNumber} (${shipmentTag}) created. Previous shipments deactivated. Address: ${deliveryAddress.city}, ${deliveryAddress.pincode}.`
    }).catch(() => {});

    sendResponse(res, 201, {
      success: true,
      message: `${shipmentTag} created successfully. Delivery attempt #${nextAttemptNumber} of ${MAX_ATTEMPT_NUMBER}.`,
      data:    { shipment: newShipment, order, shiprocketResult }
    });
  } catch (error) {
    next(error);
  }
};

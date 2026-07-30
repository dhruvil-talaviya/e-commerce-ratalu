/**
 * Yamora Wafers — Return Management & Reverse Logistics Controller
 *
 * End-to-End Reverse Logistics Workflow:
 * Customer Request -> Admin Approval -> Shiprocket Reverse Pickup -> Quality Check -> Restock -> Refund
 */

const mongoose = require('mongoose');
const Refund = require('../models/Refund');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Shipment = require('../models/Shipment');
const LogisticsAuditLog = require('../models/LogisticsAuditLog');
const logisticsService = require('../services/logistics/LogisticsService');
const refundService = require('../services/refund.service');
const { sendResponse, ErrorResponse } = require('../utils/response');
const { notify } = require('../utils/notify');
const logger = require('../config/logger');

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

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Verify order ownership
    if (req.user.role === 'customer' && String(order.customerId) !== String(req.user._id)) {
      return next(new ErrorResponse('Not authorized to access this order', 403));
    }

    const existing = await Refund.findOne({ orderId: order.id, status: { $nin: ['Rejected', 'Failed'] } });
    if (existing) {
      return next(new ErrorResponse(`A return/refund request is already ${existing.status} for this order.`, 400));
    }

    const refundId = await refundService.nextRefundId();

    const refundDoc = await Refund.create({
      refundId,
      orderId: order.id,
      customerId: order.customerId || req.user._id,
      customerName: order.userName,
      customerPhone: order.userPhone,
      type,
      requestedAmount: order.totals.total,
      reason,
      userNote,
      proofPhotos: Array.isArray(proofPhotos) ? proofPhotos : [],
      status: 'Requested',
      history: [{
        status: 'Requested',
        time: new Date(),
        note: `Return request submitted by customer: ${reason}`,
        by: order.userName
      }]
    });

    await LogisticsAuditLog.create({
      action: 'return_requested',
      orderId: order.id,
      user: order.userName,
      userRole: 'customer',
      details: `Return requested (${type}): ${reason}`
    });

    sendResponse(res, 201, {
      success: true,
      message: 'Return request submitted successfully. Our team will review it within 24 hours.',
      data: refundDoc
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Approve Return & Schedule Reverse Pickup
// @route   POST /api/v1/admin/refunds/:refundId/approve-return
// @access  Private (Super Admin / Admin)
exports.approveReturnAndReversePickup = async (req, res, next) => {
  try {
    const { refundId } = req.params;
    const refundDoc = await Refund.findOne({ refundId });
    if (!refundDoc) return next(new ErrorResponse('Return request not found', 404));

    const order = await Order.findOne({ id: refundDoc.orderId });
    if (!order) return next(new ErrorResponse('Associated order not found', 404));

    refundDoc.status = 'Approved';
    refundDoc.approvedAmount = refundDoc.requestedAmount || order.totals.total;
    refundDoc.approvedBy = req.user.name || 'Admin';
    refundDoc.approvedAt = new Date();
    refundDoc.history.push({
      status: 'Approved',
      time: new Date(),
      note: `Return approved by admin. Reverse pickup pending.`,
      by: req.user.name || 'Admin'
    });
    await refundDoc.save();

    // Trigger Shiprocket Reverse Pickup Creation if configured
    let reversePickupResult = null;
    try {
      const settings = await logisticsService.getSettings();
      if (settings.shiprocket.enabled) {
        const token = await logisticsService.getAuthToken('shiprocket');
        const provider = logisticsService.getProvider('shiprocket');

        const reversePayload = {
          order_id: `RET-${order.id}`,
          order_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
          pickup_customer_name: order.userName,
          pickup_address: order.address?.addressLine || 'Address',
          pickup_city: order.address?.city || 'City',
          pickup_pincode: order.address?.pincode || '395006',
          pickup_state: order.address?.state || 'Gujarat',
          pickup_phone: order.userPhone || '9999999999',
          order_items: order.items.map(item => ({
            name: item.flavorName,
            sku: `${item.flavorId}-${item.packId}`,
            units: item.quantity,
            selling_price: item.unitPrice
          })),
          payment_method: 'Prepaid',
          total_discount: 0,
          sub_total: refundDoc.approvedAmount
        };

        reversePickupResult = await provider._request('/orders/create/return', 'POST', reversePayload, token).catch(err => {
          logger.warn(`[ReversePickup] Reverse order creation notice: ${err.message}`);
          return null;
        });
      }
    } catch (reverseErr) {
      logger.warn(`[ReversePickup] Failed to auto-create reverse pickup: ${reverseErr.message}`);
    }

    await LogisticsAuditLog.create({
      action: 'return_approved',
      orderId: order.id,
      user: req.user.name || 'Admin',
      userRole: req.user.role,
      details: `Return approved for ₹${refundDoc.approvedAmount}.`
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Return request approved. Customer notified.',
      data: { refund: refundDoc, reversePickup: reversePickupResult }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark Returned Package Received & Quality Inspected (Reusable / Discarded)
// @route   POST /api/v1/admin/refunds/:refundId/mark-received
// @access  Private (Super Admin / Admin)
exports.markReturnReceived = async (req, res, next) => {
  try {
    const { refundId } = req.params;
    const { condition = 'Reusable', disposition = 'Reusable' } = req.body;

    const refundDoc = await Refund.findOne({ refundId });
    if (!refundDoc) return next(new ErrorResponse('Return request not found', 404));

    const order = await Order.findOne({ id: refundDoc.orderId });
    if (!order) return next(new ErrorResponse('Order not found', 404));

    refundDoc.itemReceivedAt = new Date();
    refundDoc.itemReceivedBy = req.user.name || 'Admin';
    refundDoc.itemCondition = condition;
    refundDoc.disposition = disposition; // 'Reusable' | 'Discarded'
    refundDoc.status = 'Item Received';
    refundDoc.history.push({
      status: 'Item Received',
      time: new Date(),
      note: `Returned package received. Quality Inspection: ${condition} (Disposition: ${disposition}).`,
      by: req.user.name || 'Admin'
    });
    await refundDoc.save();

    await LogisticsAuditLog.create({
      action: 'return_item_received',
      orderId: order.id,
      user: req.user.name || 'Admin',
      userRole: req.user.role,
      details: `Returned package received & quality inspected (${condition}, ${disposition}).`
    });

    sendResponse(res, 200, {
      success: true,
      message: `Package received and quality inspected (${disposition}).`,
      data: refundDoc
    });
  } catch (error) {
    next(error);
  }
};

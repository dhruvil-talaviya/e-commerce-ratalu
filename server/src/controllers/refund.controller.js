const Refund = require('../models/Refund');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');
const { notify } = require('../utils/notify');
const service = require('../services/refund.service');

const actor = (req) => req.user?.username || req.user?.name || 'Admin';
const clientIp = (req) => req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every admin action on a refund is recorded — the spec requires an audit trail. */
const audit = (req, action, options = {}) =>
  AuditLog.create([{
    user: actor(req),
    role: req.user?.role || 'Admin',
    action,
    ipAddress: clientIp(req),
    device: req.headers['user-agent'] || 'Unknown Device',
    apiEndpoint: req.originalUrl,
    correlationId: req.headers['x-correlation-id'] || ''
  }], options).catch(() => {});

/* ================================================================== */
/* CUSTOMER                                                           */
/* ================================================================== */

// @desc    Can this order be refunded, and up to how much?
// @route   GET /api/v1/orders/:id/refund-eligibility
// @access  Private (Customer)
exports.getEligibility = async (req, res, next) => {
  try {
    const order = await Order.findOne({ id: req.params.id });
    if (!order) return next(new ErrorResponse('Order not found', 404));

    if (String(order.customerId) !== String(req.user._id)) {
      return next(new ErrorResponse('This is not your order', 403));
    }

    const settings = (await Settings.findOne().lean()) || {};
    const result = await service.checkEligibility(order, settings);

    sendResponse(res, 200, {
      success: true,
      data: {
        ...result,
        reasons: Refund.REASONS,
        returnWindowDays: settings.returnWindowDays ?? 7
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Open a refund / return request
// @route   POST /api/v1/orders/:id/refund
// @access  Private (Customer)
exports.createRequest = async (req, res, next) => {
  try {
    const { reason, description, type, images, videos, items } = req.body;

    if (!reason || !Refund.REASONS.includes(reason)) {
      return next(new ErrorResponse('Please choose a valid reason for the refund.', 400));
    }

    const order = await Order.findOne({ id: req.params.id });
    if (!order) return next(new ErrorResponse('Order not found', 404));

    // Ownership — never trust the id in the URL.
    if (String(order.customerId) !== String(req.user._id)) {
      return next(new ErrorResponse('This is not your order', 403));
    }

    const settings = (await Settings.findOne().lean()) || {};
    const eligibility = await service.checkEligibility(order, settings);

    // The same guard the UI uses, enforced server-side. The button being
    // disabled is a convenience; this is the control.
    if (!eligibility.eligible) {
      return next(new ErrorResponse(eligibility.reason, 400));
    }

    /**
     * The customer names the lines; the amount is computed from the ORDER, never
     * taken from the request body. Otherwise a crafted payload could ask for
     * more than was paid.
     */
    let requestedItems = [];
    let requestedAmount = order.totals.total;

    if (Array.isArray(items) && items.length > 0) {
      requestedItems = items
        .map((sel) => {
          const line = order.items.find(
            (i) => i.flavorId === sel.flavorId && i.packId === sel.packId
          );
          if (!line) return null;
          const qty = Math.min(Math.max(parseInt(sel.quantity, 10) || 0, 1), line.quantity);
          return {
            flavorId: line.flavorId,
            flavorName: line.flavorName,
            packId: line.packId,
            packLabel: line.packLabel,
            unitPrice: line.unitPrice,
            quantity: qty
          };
        })
        .filter(Boolean);

      if (requestedItems.length === 0) {
        return next(new ErrorResponse('None of the selected items belong to this order.', 400));
      }

      const itemsTotal = requestedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      // Scale the order's tax/shipping proportionally rather than refunding
      // them in full on a partial return.
      const share = order.totals.subtotal > 0 ? itemsTotal / order.totals.subtotal : 0;
      requestedAmount = Math.round(
        itemsTotal +
        (order.totals.gst || 0) * share -
        (order.totals.discount || 0) * share
      );
    }

    requestedAmount = Math.min(requestedAmount, eligibility.maxRefundable);

    const refund = await Refund.create({
      refundId: await service.nextRefundId(),
      orderId: order.id,
      customerId: req.user._id,
      customerName: order.userName,
      customerPhone: order.userPhone,
      orderTotal: order.totals.total,
      type: type === 'Replacement' ? 'Replacement' : 'Refund',
      reason,
      description: (description || '').trim(),
      images: Array.isArray(images) ? images.slice(0, 8) : [],
      videos: Array.isArray(videos) ? videos.slice(0, 2) : [],
      items: requestedItems,
      requestedAmount,
      customerNotes: (description || '').trim(),
      razorpayPaymentId: order.payment?.transactionId || '',
      razorpayOrderId: order.payment?.gatewayOrderId || '',
      ipAddress: clientIp(req),
      timeline: [{
        status: 'Submitted',
        note: `${type === 'Replacement' ? 'Replacement' : 'Refund'} requested — ${reason}`,
        by: 'customer',
        at: new Date()
      }]
    });

    // Reflect it on the order so the admin queue and customer both see it.
    order.status = 'Refund Requested';
    order.timeline.push({
      status: 'Refund Requested',
      time: new Date(),
      note: `${refund.refundId}: ${reason}`
    });
    await order.save();

    await notify(req.user._id, {
      title: `Refund request ${refund.refundId} received`,
      message: `We've received your request for order ${order.displayId || order.id}. Our team will review it shortly.`,
      type: 'OrderStatus'
    });

    sendResponse(res, 201, {
      success: true,
      message: 'Refund request submitted. We\'ll review it shortly.',
      data: refund
    });
  } catch (error) {
    next(error);
  }
};

// @desc    The customer's own refund history
// @route   GET /api/v1/refunds/my
// @access  Private (Customer)
exports.getMyRefunds = async (req, res, next) => {
  try {
    const refunds = await Refund.find({ customerId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    sendResponse(res, 200, { success: true, data: refunds });
  } catch (error) {
    next(error);
  }
};

// @desc    Withdraw a request that hasn't been actioned yet
// @route   POST /api/v1/refunds/:refundId/cancel
// @access  Private (Customer)
exports.cancelRequest = async (req, res, next) => {
  try {
    const refund = await Refund.findOne({ refundId: req.params.refundId });
    if (!refund) return next(new ErrorResponse('Refund request not found', 404));

    if (String(refund.customerId) !== String(req.user._id)) {
      return next(new ErrorResponse('This is not your refund request', 403));
    }

    // Once an admin has approved it, only they can unwind it.
    if (!['Submitted', 'Under Review', 'More Info Needed'].includes(refund.status)) {
      return next(new ErrorResponse(
        `A request that is "${refund.status}" can no longer be withdrawn. Please contact support.`,
        400
      ));
    }

    refund.transition('Cancelled', { note: 'Withdrawn by the customer.', by: 'customer' });
    await refund.save();

    // Put the order back where it was.
    const order = await Order.findOne({ id: refund.orderId });
    if (order && order.status === 'Refund Requested') {
      order.status = 'Delivered';
      order.timeline.push({
        status: 'Delivered',
        time: new Date(),
        note: `${refund.refundId} withdrawn by the customer.`
      });
      await order.save();
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Refund request withdrawn',
      data: refund
    });
  } catch (error) {
    next(error);
  }
};

/* ================================================================== */
/* ADMIN                                                              */
/* ================================================================== */

// @desc    The refund queue
// @route   GET /api/v1/admin/refunds
// @access  Private (Admin)
exports.getAdminRefunds = async (req, res, next) => {
  try {
    const {
      search, status, type, reason,
      dateFrom, dateTo,
      sortBy = 'createdAt', sortOrder = 'desc',
      page = 1, limit = 25
    } = req.query;

    const filter = {};

    if (status) filter.status = { $in: String(status).split(',') };
    if (type) filter.type = type;
    if (reason) filter.reason = reason;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      filter.$or = [
        { refundId: rx },
        { orderId: rx },
        { customerName: rx },
        { customerPhone: rx }
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);

    const allowedSort = ['createdAt', 'requestedAmount', 'status', 'refundId'];
    const sort = { [allowedSort.includes(sortBy) ? sortBy : 'createdAt']: sortOrder === 'asc' ? 1 : -1 };

    const [refunds, totalRecords] = await Promise.all([
      Refund.find(filter).sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      Refund.countDocuments(filter)
    ]);

    sendResponse(res, 200, {
      success: true,
      data: refunds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalRecords / limitNum) || 1,
        totalRecords
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Everything the admin needs to decide, in one call
// @route   GET /api/v1/admin/refunds/:refundId
// @access  Private (Admin)
exports.getAdminRefund = async (req, res, next) => {
  try {
    const refund = await Refund.findOne({ refundId: req.params.refundId }).lean();
    if (!refund) return next(new ErrorResponse('Refund request not found', 404));

    const order = await Order.findOne({ id: refund.orderId }).lean();
    const history = await Refund.find({
      orderId: refund.orderId,
      refundId: { $ne: refund.refundId }
    }).select('refundId status approvedAmount createdAt').lean();

    const alreadyRefunded = await service.totalRefunded(refund.orderId);

    sendResponse(res, 200, {
      success: true,
      data: {
        refund,
        order,
        history,
        alreadyRefunded,
        maxRefundable: Math.max((order?.totals?.total || 0) - alreadyRefunded, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Counts per status, for the queue tabs + analytics
// @route   GET /api/v1/admin/refunds/stats
// @access  Private (Admin)
exports.getRefundStats = async (req, res, next) => {
  try {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const week = new Date(Date.now() - 7 * 86400000);
    const month = new Date(Date.now() - 30 * 86400000);

    const [byStatus, amounts, topReasons, totalOrders, refundedCount, avgTime] = await Promise.all([
      Refund.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

      Refund.aggregate([
        { $match: { status: 'Refunded' } },
        {
          $group: {
            _id: null,
            today: { $sum: { $cond: [{ $gte: ['$refundedAt', startOfDay] }, '$approvedAmount', 0] } },
            week: { $sum: { $cond: [{ $gte: ['$refundedAt', week] }, '$approvedAmount', 0] } },
            month: { $sum: { $cond: [{ $gte: ['$refundedAt', month] }, '$approvedAmount', 0] } },
            total: { $sum: '$approvedAmount' }
          }
        }
      ]),

      Refund.aggregate([
        { $group: { _id: '$reason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      Order.countDocuments({}),
      Refund.countDocuments({ status: 'Refunded' }),

      // Mean hours from request to money-out — the "average refund time" KPI.
      Refund.aggregate([
        { $match: { status: 'Refunded', refundedAt: { $ne: null } } },
        { $project: { hours: { $divide: [{ $subtract: ['$refundedAt', '$requestedAt'] }, 3600000] } } },
        { $group: { _id: null, avgHours: { $avg: '$hours' } } }
      ])
    ]);

    const statusCounts = {};
    Refund.STATUSES.forEach((s) => { statusCounts[s] = 0; });
    byStatus.forEach((r) => { statusCounts[r._id] = r.count; });

    const totalRequests = byStatus.reduce((s, r) => s + r.count, 0);

    sendResponse(res, 200, {
      success: true,
      data: {
        statusCounts,
        totalRequests,
        amounts: amounts[0] || { today: 0, week: 0, month: 0, total: 0 },
        topReasons: topReasons.map((r) => ({ reason: r._id, count: r.count })),
        // Refund rate = refunded orders / all orders.
        refundRate: totalOrders > 0 ? Math.round((refundedCount / totalOrders) * 1000) / 10 : 0,
        avgRefundHours: Math.round((avgTime[0]?.avgHours || 0) * 10) / 10
      }
    });
  } catch (error) {
    next(error);
  }
};

/** Shared: load a refund or 404. */
const loadRefund = async (refundId, session) => {
  const query = Refund.findOne({ refundId });
  if (session) query.session(session);
  const refund = await query;
  if (!refund) throw new ErrorResponse('Refund request not found', 404);
  return refund;
};

// @desc    Move a request through the workflow (review / more info / pickup)
// @route   PATCH /api/v1/admin/refunds/:refundId/status
// @access  Private (Admin)
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const allowed = ['Under Review', 'More Info Needed', 'Pickup Scheduled'];
    if (!allowed.includes(status)) {
      return next(new ErrorResponse(
        `"${status}" is not a status you can set directly. Use approve, reject or mark-received.`,
        400
      ));
    }

    const refund = await loadRefund(req.params.refundId);

    if (Refund.TERMINAL.includes(refund.status)) {
      return next(new ErrorResponse(`This request is already ${refund.status}.`, 400));
    }

    refund.transition(status, { note: note || '', by: actor(req) });
    if (status === 'Pickup Scheduled') refund.pickupScheduledAt = new Date();
    await refund.save();

    await audit(req, `Refund ${refund.refundId} → ${status}`);
    await notify(refund.customerId, {
      title: `Refund ${refund.refundId}: ${status}`,
      message: note || `Your request for order ${refund.orderId} is now "${status}".`,
      type: 'OrderStatus'
    });

    sendResponse(res, 200, { success: true, message: `Marked ${status}`, data: refund });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve — full or partial. Money does NOT move yet.
// @route   POST /api/v1/admin/refunds/:refundId/approve
// @access  Private (Super Admin)
exports.approve = async (req, res, next) => {
  const mongoose = require('mongoose');

  const executeApprove = async (session) => {
    const options = session ? { session } : {};
    
    if (req.user.role !== 'Super Admin') {
      throw new ErrorResponse('Only a Super Admin can approve refunds.', 403);
    }

    const { amount, note } = req.body;
    const refund = await loadRefund(req.params.refundId, session);

    if (Refund.TERMINAL.includes(refund.status)) {
      throw new ErrorResponse(`This request is already ${refund.status}.`, 400);
    }
    if (refund.status === 'Approved') {
      throw new ErrorResponse('This request is already approved.', 400);
    }

    const orderQuery = Order.findOne({ id: refund.orderId });
    if (session) orderQuery.session(session);
    const order = await orderQuery;
    
    if (!order) {
      throw new ErrorResponse('Order not found', 404);
    }

    const alreadyRefunded = await service.totalRefunded(order.id);
    const maxRefundable = order.totals.total - alreadyRefunded;

    const approved = amount != null ? Number(amount) : refund.requestedAmount;

    if (!Number.isFinite(approved) || approved <= 0) {
      throw new ErrorResponse('Enter a refund amount greater than zero.', 400);
    }
    if (approved > maxRefundable) {
      throw new ErrorResponse(
        `₹${approved} exceeds what can still be refunded on this order (₹${maxRefundable}).`,
        400
      );
    }

    const settingsQuery = Settings.findOne({});
    if (session) settingsQuery.session(session);
    const settings = (await settingsQuery.lean()) || {};

    refund.approvedAmount = approved;
    refund.refundType = approved >= order.totals.total ? 'Full' : 'Partial';
    refund.ledger = service.buildLedger(order, approved, settings);
    refund.approvedBy = actor(req);
    refund.approvedAt = new Date();
    refund.transition('Approved', {
      note: note || `${refund.refundType} refund of ₹${approved} approved.`,
      by: actor(req)
    });
    await refund.save(options);

    order.status = 'Refund Approved';
    order.timeline.push({
      status: 'Refund Approved',
      time: new Date(),
      note: `${refund.refundId}: ₹${approved} approved by ${actor(req)}.`
    });
    await order.save(options);

    await audit(req, `Approved refund ${refund.refundId} for ₹${approved} on order ${order.id}`, options);

    return { refund, order, settings };
  };

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await executeApprove(session);
    await session.commitTransaction();
    session.endSession();

    // Trigger async notifications after commit
    await notify(result.refund.customerId, {
      title: `Refund ${result.refund.refundId} approved`,
      message: `₹${result.refund.approvedAmount} has been approved for order ${result.order.displayId || result.order.id}. We'll process it shortly.`,
      type: 'OrderStatus'
    }).catch(() => {});

    const requiresItem = result.settings.requireItemReceivedBeforeRefund !== false;

    sendResponse(res, 200, {
      success: true,
      message: requiresItem
        ? `Approved ₹${result.refund.approvedAmount}. Mark the item received to release the payment.`
        : `Approved ₹${result.refund.approvedAmount}. You can now issue the refund.`,
      data: { refund: result.refund, requiresItemReceived: requiresItem }
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    if (error.message && error.message.includes('replica set')) {
      console.warn('MongoDB transaction not supported (standalone instance). Retrying without transaction session.');
      try {
        const result = await executeApprove(null);
        await notify(result.refund.customerId, {
          title: `Refund ${result.refund.refundId} approved`,
          message: `₹${result.refund.approvedAmount} has been approved for order ${result.order.displayId || result.order.id}. We'll process it shortly.`,
          type: 'OrderStatus'
        }).catch(() => {});

        const requiresItem = result.settings.requireItemReceivedBeforeRefund !== false;

        return sendResponse(res, 200, {
          success: true,
          message: requiresItem
            ? `Approved ₹${result.refund.approvedAmount}. Mark the item received to release the payment. (standalone mode)`
            : `Approved ₹${result.refund.approvedAmount}. You can now issue the refund. (standalone mode)`,
          data: { refund: result.refund, requiresItemReceived: requiresItem }
        });
      } catch (retryError) {
        return next(retryError);
      }
    }

    next(error);
  }
};

// @desc    Reject — terminal
// @route   POST /api/v1/admin/refunds/:refundId/reject
// @access  Private (Super Admin)
exports.reject = async (req, res, next) => {
  try {
    if (req.user.role !== 'Super Admin') {
      return next(new ErrorResponse('Only a Super Admin can reject refunds.', 403));
    }

    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      return next(new ErrorResponse('Give the customer a reason for the rejection.', 400));
    }

    const refund = await loadRefund(req.params.refundId);

    if (Refund.TERMINAL.includes(refund.status)) {
      return next(new ErrorResponse(`This request is already ${refund.status}.`, 400));
    }
    if (refund.razorpayRefundId) {
      return next(new ErrorResponse('Money has already been refunded — this cannot be rejected.', 400));
    }

    refund.rejectionReason = String(reason).trim();
    refund.rejectedBy = actor(req);
    refund.rejectedAt = new Date();
    refund.transition('Rejected', { note: refund.rejectionReason, by: actor(req) });
    await refund.save();

    // Give the order its previous life back rather than stranding it.
    const order = await Order.findOne({ id: refund.orderId });
    if (order) {
      order.status = 'Delivered';
      order.timeline.push({
        status: 'Delivered',
        time: new Date(),
        note: `${refund.refundId} rejected: ${refund.rejectionReason}`
      });
      await order.save();
    }

    await audit(req, `Rejected refund ${refund.refundId}: ${refund.rejectionReason}`);
    await notify(refund.customerId, {
      title: `Refund ${refund.refundId} declined`,
      message: refund.rejectionReason,
      type: 'OrderStatus'
    });

    sendResponse(res, 200, { success: true, message: 'Request rejected', data: refund });
  } catch (error) {
    next(error);
  }
};

// @desc    Warehouse confirms the item is back — restores stock
// @route   POST /api/v1/admin/refunds/:refundId/received
// @access  Private (Admin)
exports.markItemReceived = async (req, res, next) => {
  try {
    const { note } = req.body;
    const refund = await loadRefund(req.params.refundId);

    if (Refund.TERMINAL.includes(refund.status)) {
      return next(new ErrorResponse(`This request is already ${refund.status}.`, 400));
    }

    refund.itemReceivedAt = new Date();
    refund.transition('Item Received', {
      note: note || 'Returned item received and inspected.',
      by: actor(req)
    });
    await refund.save();

    // Idempotent — see refund.service.restoreStock.
    const stock = await service.restoreStock(refund, actor(req));

    await audit(req, `Marked ${refund.refundId} item received (stock restored: ${stock.restored})`);
    await notify(refund.customerId, {
      title: `We've received your return`,
      message: `Your returned item for ${refund.orderId} has arrived. Your refund will be processed shortly.`,
      type: 'OrderStatus'
    });

    sendResponse(res, 200, {
      success: true,
      message: stock.restored
        ? `Item received. ${stock.lines} line(s) returned to stock.`
        : `Item received. ${stock.reason}`,
      data: refund
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send the money — the ONLY place Razorpay is asked to refund
// @route   POST /api/v1/admin/refunds/:refundId/process
// @access  Private (Super Admin)
exports.processRefund = async (req, res, next) => {
  try {
    if (req.user.role !== 'Super Admin') {
      return next(new ErrorResponse('Only a Super Admin can release a refund.', 403));
    }

    const refund = await loadRefund(req.params.refundId);
    const settings = (await Settings.findOne().lean()) || {};

    // Store policy: goods back before money out.
    if (
      settings.requireItemReceivedBeforeRefund !== false &&
      refund.type === 'Replacement' &&
      !refund.itemReceivedAt &&
      refund.status === 'Approved'
    ) {
      return next(new ErrorResponse(
        'Store policy requires the item to be received before the refund is released. Mark it received first.',
        400
      ));
    }

    const updated = await service.processRazorpayRefund(refund, actor(req));

    await audit(
      req,
      `Released refund ${updated.refundId}: ₹${updated.approvedAmount} via Razorpay (${updated.razorpayRefundId})`
    );
    await notify(updated.customerId, {
      title: `Refund ${updated.refundId} sent`,
      message: `₹${updated.approvedAmount} is on its way back to your original payment method. It usually lands in 5–7 working days.`,
      type: 'OrderStatus'
    });

    sendResponse(res, 200, {
      success: true,
      message: `₹${updated.approvedAmount} refunded via Razorpay`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Internal note (never shown to the customer)
// @route   POST /api/v1/admin/refunds/:refundId/notes
// @access  Private (Admin)
exports.addNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note || !String(note).trim()) {
      return next(new ErrorResponse('The note cannot be empty.', 400));
    }

    const refund = await loadRefund(req.params.refundId);

    const stamp = `[${new Date().toISOString()}] ${actor(req)}: ${String(note).trim()}`;
    refund.internalNotes = refund.internalNotes
      ? `${refund.internalNotes}\n${stamp}`
      : stamp;
    await refund.save();

    await audit(req, `Note added to refund ${refund.refundId}`);

    sendResponse(res, 200, { success: true, message: 'Note added', data: refund });
  } catch (error) {
    next(error);
  }
};

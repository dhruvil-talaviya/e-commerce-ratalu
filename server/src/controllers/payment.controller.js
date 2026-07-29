const crypto = require('crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { placeOrder } = require('./order.controller');
const { notifyAdmin, notify } = require('../utils/notify');
const LogisticsService = require('../services/logistics/LogisticsService');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');
const logger = require('../config/logger');

const RAZORPAY_API = 'https://api.razorpay.com/v1';

/** Methods that settle instantly at the door rather than through a gateway. */
const OFFLINE_METHODS = ['COD'];

const Settings = require('../models/Settings');
const { decrypt } = require('../utils/crypto');

/** Resolves effective Razorpay credentials from DB settings with fallback to env */
const getRazorpayCredentials = async () => {
  try {
    const settings = await Settings.findOne();
    const isTestMode = settings?.razorpayTestMode ?? settings?.testMode ?? (process.env.NODE_ENV !== 'production');

    let keyId = settings?.razorpayKeyId || '';
    let keySecret = settings?.encryptedRazorpayKeySecret ? decrypt(settings.encryptedRazorpayKeySecret) : '';

    if (isTestMode) {
      // Test Mode is ACTIVE — force test keys (rzp_test_...)
      if (!keyId || !keyId.startsWith('rzp_test_')) {
        keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_T5WdwhRhXWtpsG';
        keySecret = process.env.RAZORPAY_KEY_SECRET || 'Pe33SD68Ogs57BeSQ3TWxN0C';
      }
    } else {
      // Live Mode
      if (!keyId) keyId = process.env.RAZORPAY_KEY_ID || '';
      if (!keySecret) keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    }

    let webhookSecret = '';
    if (settings?.encryptedRazorpayWebhookSecret) {
      webhookSecret = decrypt(settings.encryptedRazorpayWebhookSecret);
    }
    if (!webhookSecret) {
      webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    }

    return { keyId, keySecret, webhookSecret, isTestMode };
  } catch {
    return {
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_T5WdwhRhXWtpsG',
      keySecret: process.env.RAZORPAY_KEY_SECRET || 'Pe33SD68Ogs57BeSQ3TWxN0C',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
      isTestMode: true
    };
  }
};

const gatewayConfigured = async () => {
  const { keyId, keySecret } = await getRazorpayCredentials();
  return Boolean(keyId && keySecret);
};

/** Constant-time HMAC-SHA256 comparison (avoids timing side-channels). */
const safeEqualHmac = (payload, signature, secret) => {
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature || ''), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/**
 * Create a Razorpay order via their REST API.
 * Deliberately uses fetch + crypto instead of the SDK — one less dependency,
 * identical behaviour.
 */
const createRazorpayOrder = async ({ amountPaise, receipt }) => {
  const { keyId, keySecret } = await getRazorpayCredentials();

  try {
    const auth = Buffer
      .from(`${keyId}:${keySecret}`)
      .toString('base64');

    const res = await fetch(`${RAZORPAY_API}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        payment_capture: 1
      })
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      return body;
    }
    logger.warn(`Razorpay API error: ${body?.error?.description || 'Unknown'}.`);
  } catch (error) {
    logger.error(`Razorpay connection failed: ${error.message}.`);
  }

  /**
   * In production a failed gateway call must NOT silently mint a fake order —
   * that order can never be really paid, yet the old mock id started with
   * "order_" and so slipped past verification as if it had been. Fail loudly and
   * let the customer retry (or pick COD). The mock id is kept only for local dev.
   */
  if (process.env.NODE_ENV === 'production') {
    throw new ErrorResponse('The payment gateway is temporarily unavailable. Please try again.', 502);
  }

  const mockOrderId = `order_${crypto.randomBytes(12).toString('hex')}`;
  return {
    id: mockOrderId,
    entity: 'order',
    amount: amountPaise,
    currency: 'INR',
    receipt,
    status: 'created'
  };
};

// @desc    Create an order and (for gateway methods) a matching payment intent
// @route   POST /api/v1/payment/create-order
// @access  Private
exports.createPaymentOrder = async (req, res, next) => {
  try {
    const { items, couponCode, address, paymentMethod } = req.body;

    const method = paymentMethod || 'COD';
    const isOffline = OFFLINE_METHODS.includes(method);

    // Fail *before* creating an order if a gateway method was chosen but the
    // gateway isn't configured — otherwise we'd strand an unpayable order.
    const isConfigured = await gatewayConfigured();
    if (!isOffline && !isConfigured) {
      return next(new ErrorResponse(
        'Online payments are not configured. Please choose Cash on Delivery.',
        503
      ));
    }

    // ── IDEMPOTENCY GUARD ────────────────────────────────────────────────────
    // If this customer already has an active "Payment Pending" online order
    // (created within the last 30 minutes), do NOT create a new one.
    // Instead, generate a fresh Razorpay gateway order against the existing
    // MongoDB order and return it — identical to what retry-order does.
    //
    // This is the primary server-side guard against duplicate orders.
    // It fires when:
    //   – Frontend state is lost (page refresh, browser back)
    //   – User clicks Place Order twice quickly
    //   – payment-failed page mistakenly routes back to /checkout
    if (!isOffline) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const existingOrder = await Order.findOne({
        customerId: req.user._id,
        status: 'Payment Pending',
        'payment.status': 'Pending',
        createdAt: { $gte: thirtyMinutesAgo }
      }).sort({ createdAt: -1 });

      if (existingOrder) {
        logger.info(`[createPaymentOrder] Idempotency: reusing existing Payment Pending order ${existingOrder.id} for user ${req.user._id}.`);

        // Create a fresh Razorpay order for the existing total
        const amountPaise = Math.round(existingOrder.totals.total * 100);
        const rzp = await createRazorpayOrder({ amountPaise, receipt: existingOrder.id });
        const { keyId } = await getRazorpayCredentials();

        existingOrder.payment.gatewayOrderId = rzp.id;
        existingOrder.lastGatewayOrderId = rzp.id;
        existingOrder.lastAttemptAt = new Date();
        existingOrder.paymentAttemptsCount = (existingOrder.paymentAttemptsCount || 0) + 1;
        if (!existingOrder.paymentAttempts) existingOrder.paymentAttempts = [];
        existingOrder.paymentAttempts.push({
          gatewayOrderId: rzp.id,
          status: 'Pending',
          amount: existingOrder.totals.total,
          createdAt: new Date()
        });
        await existingOrder.save();

        await Payment.create({
          orderId: existingOrder.id,
          customerId: req.user._id,
          method: existingOrder.payment?.method || 'Razorpay',
          gateway: 'razorpay',
          amount: existingOrder.totals.total,
          status: 'Pending',
          gatewayOrderId: rzp.id,
          gatewayResponse: rzp
        });

        return sendResponse(res, 200, {
          success: true,
          message: 'Existing pending order reused.',
          data: {
            order: existingOrder,
            requiresPayment: true,
            razorpay: {
              orderId: rzp.id,
              amount: amountPaise,
              currency: 'INR',
              keyId: keyId || process.env.RAZORPAY_KEY_ID
            }
          }
        });
      }
    }
    // ── END IDEMPOTENCY GUARD ────────────────────────────────────────────────

    // Reuses the exact same validation/stock/coupon/total logic as /orders.
    const order = await placeOrder({
      user: req.user,
      items,
      couponCode,
      address,
      method,
      paymentMethod: method
    });

    // ---- Cash on delivery: nothing to collect now ----
    if (isOffline) {
      order.status = 'Confirmed';
      order.payment.status = 'Pending'; // collected on delivery
      order.timeline.push({ status: 'Confirmed', note: 'Order confirmed (Cash on Delivery).' });
      await order.save();

      await Payment.create({
        orderId: order.id,
        customerId: req.user._id,
        method,
        gateway: 'cod',
        amount: order.totals.total,
        status: 'Pending'
      });

      // Trigger automatic Shiprocket shipment creation for COD order
      LogisticsService.processOrderPostPayment(order._id).catch(err => {
        logger.error(`Auto logistics processing failed for COD order ${order.id}: ${err.message}`);
      });

      return sendResponse(res, 201, {
        success: true,
        message: 'Order placed successfully. Pay on delivery.',
        data: { order, requiresPayment: false }
      });
    }

    // ---- Gateway methods: create a Razorpay order to collect against ----
    const amountPaise = Math.round(order.totals.total * 100);
    const rzp = await createRazorpayOrder({ amountPaise, receipt: order.id });
    const { keyId } = await getRazorpayCredentials();

    order.status = 'Payment Pending';
    order.orderStatus = 'Payment Pending';
    order.payment.status = 'Pending';
    order.payment.gatewayOrderId = rzp.id;
    await order.save();

    await Payment.create({
      orderId: order.id,
      customerId: req.user._id,
      method,
      gateway: 'razorpay',
      amount: order.totals.total,
      status: 'Pending',
      gatewayOrderId: rzp.id,
      gatewayResponse: rzp
    });

    sendResponse(res, 201, {
      success: true,
      message: 'Payment intent created',
      data: {
        order,
        requiresPayment: true,
        razorpay: {
          orderId: rzp.id,
          amount: amountPaise,
          currency: 'INR',
          keyId: keyId || process.env.RAZORPAY_KEY_ID
        }
      }
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Retry payment for an existing unpaid order (reuses DB order, creates NEW Razorpay order)
// @route   POST /api/v1/payment/retry-order/:orderId
// @access  Private
exports.retryPaymentOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ $or: [{ id: orderId }, { _id: orderId }] });

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    if (order.payment && order.payment.status === 'Paid') {
      return next(new ErrorResponse('Order has already been paid for.', 400));
    }

    if (order.status === 'Cancelled' || order.status === 'Refunded' || order.status === 'Expired') {
      return next(new ErrorResponse(`Cannot retry payment for an order in '${order.status}' status.`, 400));
    }

    if ((order.paymentAttemptsCount || 0) >= 5) {
      return next(new ErrorResponse('Maximum payment retry limit (5 attempts) reached. Please place a new order or contact support.', 400));
    }

    const isConfigured = await gatewayConfigured();
    if (!isConfigured) {
      return next(new ErrorResponse('Online payment gateway is not configured.', 503));
    }

    // Create a NEW Razorpay Gateway Order for the existing total
    const amountPaise = Math.round(order.totals.total * 100);
    const rzp = await createRazorpayOrder({ amountPaise, receipt: order.id });
    const { keyId } = await getRazorpayCredentials();

    // Update order fields
    order.status = 'Payment Pending';
    order.orderStatus = 'Payment Pending';
    order.payment.status = 'Pending';
    order.payment.gatewayOrderId = rzp.id;
    order.lastGatewayOrderId = rzp.id;
    order.lastAttemptAt = new Date();
    order.paymentAttemptsCount = (order.paymentAttemptsCount || 0) + 1;

    const attemptRecord = {
      gatewayOrderId: rzp.id,
      status: 'Pending',
      amount: order.totals.total,
      createdAt: new Date()
    };
    if (!order.paymentAttempts) order.paymentAttempts = [];
    order.paymentAttempts.push(attemptRecord);

    order.timeline.push({
      status: 'Payment Pending',
      time: new Date(),
      note: `Payment retry attempt #${order.paymentAttemptsCount} initiated with Razorpay Order ${rzp.id}.`
    });

    await order.save();

    // Also record in Payment audit collection
    await Payment.create({
      orderId: order.id,
      customerId: req.user._id,
      method: order.payment?.method || 'Razorpay',
      gateway: 'razorpay',
      amount: order.totals.total,
      status: 'Pending',
      gatewayOrderId: rzp.id,
      gatewayResponse: rzp
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Payment retry order generated',
      data: {
        order,
        requiresPayment: true,
        razorpay: {
          orderId: rzp.id,
          amount: amountPaise,
          currency: 'INR',
          keyId: keyId || process.env.RAZORPAY_KEY_ID
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually expire a pending unpaid order (Admin)
// @route   POST /api/v1/admin/orders/:orderId/expire
// @access  Private (Admin)
exports.expireOrderManually = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ $or: [{ id: orderId }, { _id: orderId }] });

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    if (order.payment && order.payment.status === 'Paid') {
      return next(new ErrorResponse('Cannot expire an order that is already paid', 400));
    }

    order.status = 'Expired';
    order.orderStatus = 'Expired';
    order.payment.status = 'Failed';
    order.expiredAt = new Date();
    order.expiredReason = req.body.reason || `Manually expired by admin ${req.user.username || req.user.name || ''}`;

    order.timeline.push({
      status: 'Expired',
      time: new Date(),
      note: order.expiredReason
    });

    await order.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Order marked as Expired successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify a completed gateway payment (called by the client on success)
// @route   POST /api/v1/payment/verify
// @access  Private
exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return next(new ErrorResponse('Incomplete payment verification payload', 400));
    }
    const isConfigured = await gatewayConfigured();
    if (!isConfigured) {
      return next(new ErrorResponse('Payment gateway is not configured', 503));
    }

    // 1. Prefer the canonical orderId (e.g. RW-000009) sent from the frontend.
    let order = orderId ? await Order.findOne({ id: orderId }) : null;

    // 2. Fallback: match by the active Razorpay gateway order on the order doc.
    if (!order) {
      order = await Order.findOne({ 'payment.gatewayOrderId': razorpay_order_id });
    }

    // 3. Fallback: after a retry, the new Razorpay order is stored in
    //    lastGatewayOrderId rather than payment.gatewayOrderId.
    if (!order) {
      order = await Order.findOne({ lastGatewayOrderId: razorpay_order_id });
    }

    // 4. Deepest fallback: scan the paymentAttempts array (handles edge-cases
    //    where the order was retried before lastGatewayOrderId was added).
    if (!order) {
      order = await Order.findOne({
        'paymentAttempts.gatewayOrderId': razorpay_order_id
      });
    }

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }
    // A customer may only verify their own order.
    if (order.customerId && String(order.customerId) !== String(req.user._id)) {
      return next(new ErrorResponse('Not authorised for this order', 403));
    }
    // Idempotent: replaying a successful verification is a no-op.
    if (order.payment.status === 'Paid') {
      return sendResponse(res, 200, {
        success: true,
        message: 'Payment already verified',
        data: order
      });
    }

    const { keySecret } = await getRazorpayCredentials();
    const allowMock = process.env.NODE_ENV !== 'production';
    const isMock = allowMock && razorpay_signature === 'mock_signature';
    const isValid =
      isMock ||
      safeEqualHmac(
        `${razorpay_order_id}|${razorpay_payment_id}`,
        razorpay_signature,
        keySecret
      );

    const payment = await Payment.findOne({ orderId, gatewayOrderId: razorpay_order_id });

    if (!isValid) {
      if (payment) {
        payment.status = 'Failed';
        payment.failureReason = 'Signature verification failed';
        payment.gatewaySignature = razorpay_signature;
        await payment.save();
      }
      order.payment.status = 'Failed';
      order.status = 'Payment Failed';
      order.timeline.push({ status: 'Payment Failed', note: 'Payment signature verification failed.' });
      await order.save();

      // Tell the customer so they know to retry — the checkout now reuses the
      // same order for a retry rather than minting a new one.
      await notify(order.customerId, {
        title: `Payment failed — Order ${order.displayId || order.id}`,
        message: `We couldn't confirm your payment for order ${order.displayId || order.id}, so nothing was charged. You can retry the payment from your orders.`,
        type: 'OrderStatus'
      });

      await notifyAdmin({
        title: 'Payment Failed',
        message: `Payment signature verification failed for Order ${order.displayId || order.id}.`,
        type: 'OrderStatus'
      });

      logger.warn(`Payment signature mismatch for order ${orderId}`);
      return next(new ErrorResponse('Payment verification failed', 400));
    }

    // ---- Verified ----
    const now = new Date();

    if (payment) {
      payment.status = 'Paid';
      payment.transactionId = razorpay_payment_id;
      payment.gatewaySignature = razorpay_signature;
      payment.paidAt = now;
      await payment.save();
    }

    order.payment.status = 'Paid';
    order.payment.transactionId = razorpay_payment_id;
    order.payment.paidAt = now;
    order.status = 'Pending Confirmation';
    order.orderStatus = 'Pending Confirmation';
    order.fulfilmentStatus = 'On Hold';
    order.cancellationDeadline = new Date(now.getTime() + 5 * 60 * 1000);
    order.timeline.push({
      status: 'Pending Confirmation',
      time: now,
      note: `Payment received (${razorpay_payment_id}). 5-minute cancellation window started.`
    });
    await order.save();

    // Confirm to the customer that the payment landed and 5-min cancellation window is active.
    await notify(order.customerId, {
      title: `Payment received — Order ${order.displayId || order.id}`,
      message: `Thanks! We've received your payment of ₹${Number(order.totals.total).toLocaleString('en-IN')}. Your 5-minute cancellation window has started for Order ${order.displayId || order.id}.`,
      type: 'OrderStatus'
    });

    await notifyAdmin({
      title: 'Payment Success (5-min Hold Window)',
      message: `Payment of ₹${order.totals.total} captured for Order ${order.displayId || order.id}. 5-minute cancellation timer started.`,
      type: 'OrderStatus'
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Payment verified successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Razorpay server-to-server webhook (source of truth)
// @route   POST /api/v1/payment/webhook
// @access  Public (authenticated by HMAC signature, not JWT)
exports.paymentWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify against the EXACT bytes received (captured in app.js).
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

    if (!secret || !safeEqualHmac(raw, signature, secret)) {
      logger.warn('Rejected payment webhook: invalid signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const eventId = req.body?.contains ? req.body.contains : req.body?.event_id || req.headers['x-razorpay-event-id'];
    const event = req.body?.event;
    const entity = req.body?.payload?.payment?.entity;

    // Idempotency check: process each webhook event ID exactly once
    if (eventId) {
      const AuditLog = require('../models/AuditLog');
      const alreadyProcessed = await AuditLog.findOne({ action: `Webhook Event:${eventId}` });
      if (alreadyProcessed) {
        logger.info(`Webhook event ${eventId} already processed. Skipping.`);
        return res.status(200).json({ success: true, received: true, idempotent: true });
      }
      await AuditLog.create({
        user: 'Razorpay Webhook',
        role: 'System',
        action: `Webhook Event:${eventId}`,
        ipAddress: req.ip || '127.0.0.1'
      });
    }

    if (entity?.order_id) {
      const payment = await Payment.findOne({ gatewayOrderId: entity.order_id });
      const order = payment ? await Order.findOne({ id: payment.orderId }) : null;

      if (payment && order && order.payment.status !== 'Paid') {
        if (event === 'payment.captured') {
          const now = new Date();
          payment.status = 'Paid';
          payment.transactionId = entity.id;
          payment.paidAt = now;
          payment.gatewayResponse = entity;
          await payment.save();

          order.payment.status = 'Paid';
          order.payment.transactionId = entity.id;
          order.payment.paidAt = now;
          order.status = 'Pending Confirmation';
          order.orderStatus = 'Pending Confirmation';
          order.fulfilmentStatus = 'On Hold';
          order.cancellationDeadline = new Date(now.getTime() + 5 * 60 * 1000);
          order.timeline.push({
            status: 'Pending Confirmation',
            time: now,
            note: 'Payment captured via Webhook. 5-minute cancellation window started.'
          });
          await order.save();

          await notify(order.customerId, {
            title: `Payment received — Order ${order.displayId || order.id}`,
            message: `Thanks! We've received your payment of ₹${Number(order.totals.total).toLocaleString('en-IN')}. Your 5-minute cancellation window has started for Order ${order.displayId || order.id}.`,
            type: 'OrderStatus'
          });

          await notifyAdmin({
            title: 'Payment Success (5-min Hold Window)',
            message: `Payment of ₹${order.totals.total} captured via Webhook for Order ${order.displayId || order.id}. 5-minute cancellation timer started.`,
            type: 'OrderStatus'
          });
        } else if (event === 'payment.failed') {
          payment.status = 'Failed';
          payment.failureReason = entity.error_description || 'Payment failed';
          payment.gatewayResponse = entity;
          await payment.save();

          order.payment.status = 'Failed';
          order.status = 'Payment Failed';
          order.timeline.push({ status: 'Payment Failed', note: 'Payment failed (webhook).' });
          await order.save();

          await notify(order.customerId, {
            title: `Payment failed — Order ${order.displayId || order.id}`,
            message: `Your payment for order ${order.displayId || order.id} didn't go through, so nothing was charged. You can retry the payment from your orders.`,
            type: 'OrderStatus'
          });

          await notifyAdmin({
            title: 'Payment Failed',
            message: `Payment failed via Webhook for Order ${order.displayId || order.id}. Reason: ${entity.error_description || 'Unknown'}.`,
            type: 'OrderStatus'
          });
        }
      }
    }

    // ── Handle Refund Webhooks (refund.processed, refund.created, refund.failed) ──────────────
    const refundEntity = req.body?.payload?.refund?.entity;
    if (refundEntity && (event === 'refund.processed' || event === 'refund.created' || event === 'refund.failed')) {
      const Refund = require('../models/Refund');
      const razorpayRefundId = refundEntity.id;
      const paymentId = refundEntity.payment_id;
      const refundNotes = refundEntity.notes || {};
      const refundAmount = refundEntity.amount ? refundEntity.amount / 100 : 0;

      let refundDoc = null;
      if (refundNotes.refundId) {
        refundDoc = await Refund.findOne({ refundId: refundNotes.refundId });
      }
      if (!refundDoc && razorpayRefundId) {
        refundDoc = await Refund.findOne({ razorpayRefundId });
      }
      if (!refundDoc && paymentId) {
        refundDoc = await Refund.findOne({ razorpayPaymentId: paymentId, status: { $ne: 'Refunded' } });
      }

      let orderDoc = null;
      if (refundNotes.orderId) {
        orderDoc = await Order.findOne({ id: refundNotes.orderId });
      }
      if (!orderDoc && paymentId) {
        orderDoc = await Order.findOne({ 'payment.transactionId': paymentId });
      }
      if (!orderDoc && refundDoc) {
        orderDoc = await Order.findOne({ id: refundDoc.orderId });
      }

      if (orderDoc) {
        if (event === 'refund.failed') {
          if (refundDoc) {
            refundDoc.gatewayStatus = 'failed';
            refundDoc.failureReason = refundEntity.error_description || 'Razorpay refund failed';
            refundDoc.status = 'Failed';
            await refundDoc.save();
          }
        } else {
          // Processed / Created
          orderDoc.payment.status = 'Refunded';
          orderDoc.payment.refundedAt = new Date();
          if (!orderDoc.timeline.some(t => t.note && t.note.includes(razorpayRefundId))) {
            orderDoc.timeline.push({
              status: 'Refund Completed',
              time: new Date(),
              note: `Refund of ₹${refundAmount} processed via Razorpay (${razorpayRefundId}).`
            });
          }
          await orderDoc.save();

          if (refundDoc) {
            refundDoc.razorpayRefundId = razorpayRefundId;
            refundDoc.gatewayStatus = refundEntity.status || 'processed';
            refundDoc.gatewayResponse = refundEntity;
            refundDoc.status = 'Refunded';
            refundDoc.refundedAt = new Date();
            await refundDoc.save();
          } else {
            // Created directly on Razorpay Dashboard
            const service = require('../services/refund.service');
            const newRefundId = await service.nextRefundId();
            await Refund.create({
              refundId: newRefundId,
              orderId: orderDoc.id,
              customerId: orderDoc.customerId,
              customerName: orderDoc.userName,
              customerPhone: orderDoc.userPhone,
              orderTotal: orderDoc.totals.total,
              type: 'Refund',
              reason: 'Razorpay Dashboard Refund',
              description: `Refund created directly on Razorpay Dashboard (${razorpayRefundId}).`,
              items: orderDoc.items,
              requestedAmount: refundAmount || orderDoc.totals.total,
              approvedAmount: refundAmount || orderDoc.totals.total,
              status: 'Refunded',
              razorpayPaymentId: paymentId,
              razorpayRefundId,
              gatewayStatus: refundEntity.status || 'processed',
              gatewayResponse: refundEntity,
              refundedAt: new Date(),
              timeline: [{
                status: 'Refunded',
                note: `Refund processed via Razorpay Dashboard (${razorpayRefundId}).`,
                by: 'Razorpay Webhook',
                at: new Date()
              }]
            });
          }
        }
      }
    }

    // Always 200 once authenticated, so the gateway stops retrying.
    res.status(200).json({ success: true, received: true });
  } catch (error) {
    logger.error(`Webhook processing error: ${error.message}`);
    res.status(200).json({ success: true, received: true });
  }
};

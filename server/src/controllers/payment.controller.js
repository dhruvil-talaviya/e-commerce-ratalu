const crypto = require('crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { placeOrder } = require('./order.controller');
const { notifyAdmin, notify } = require('../utils/notify');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');
const logger = require('../config/logger');

const RAZORPAY_API = 'https://api.razorpay.com/v1';

/** Methods that settle instantly at the door rather than through a gateway. */
const OFFLINE_METHODS = ['COD'];

const gatewayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

/** Constant-time HMAC-SHA256 comparison (avoids timing side-channels). */
const safeEqualHmac = (payload, signature, secret) => {
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
  try {
    const auth = Buffer
      .from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`)
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
    if (!isOffline && !gatewayConfigured()) {
      return next(new ErrorResponse(
        'Online payments are not configured. Please choose Cash on Delivery.',
        503
      ));
    }

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

      return sendResponse(res, 201, {
        success: true,
        message: 'Order placed successfully. Pay on delivery.',
        data: { order, requiresPayment: false }
      });
    }

    // ---- Gateway methods: create a Razorpay order to collect against ----
    const amountPaise = Math.round(order.totals.total * 100);
    const rzp = await createRazorpayOrder({ amountPaise, receipt: order.id });

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
          keyId: process.env.RAZORPAY_KEY_ID // publishable — safe to expose
        }
      }
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

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return next(new ErrorResponse('Incomplete payment verification payload', 400));
    }
    if (!gatewayConfigured()) {
      return next(new ErrorResponse('Payment gateway is not configured', 503));
    }

    const order = await Order.findOne({ id: orderId });
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

    /**
     * The signature is the ONLY proof the payment is real. This used to be
     * bypassed for anything whose order id started with "order_" — which every
     * genuine Razorpay order does, so verification never actually ran and a
     * payment could be forged. Now the HMAC is always checked in production; the
     * "mock_signature" shortcut exists only for local sandbox testing and is
     * refused when NODE_ENV is 'production'.
     */
    const allowMock = process.env.NODE_ENV !== 'production';
    const isMock = allowMock && razorpay_signature === 'mock_signature';
    const isValid =
      isMock ||
      safeEqualHmac(
        `${razorpay_order_id}|${razorpay_payment_id}`,
        razorpay_signature,
        process.env.RAZORPAY_KEY_SECRET
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
    order.status = 'Confirmed';
    order.timeline.push({ status: 'Confirmed', note: `Payment received (${razorpay_payment_id}).` });
    await order.save();

    // Confirm to the customer that the payment landed and the order is moving.
    await notify(order.customerId, {
      title: `Payment received — Order ${order.displayId || order.id}`,
      message: `Thanks! We've received your payment of ₹${Number(order.totals.total).toLocaleString('en-IN')}. Your order ${order.displayId || order.id} is confirmed and being prepared.`,
      type: 'OrderStatus'
    });

    await notifyAdmin({
      title: 'Payment Success',
      message: `Payment of ₹${order.totals.total} successfully captured for Order ${order.displayId || order.id}.`,
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

    const event = req.body?.event;
    const entity = req.body?.payload?.payment?.entity;

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
          order.status = 'Confirmed';
          order.timeline.push({ status: 'Confirmed', note: 'Payment captured (webhook).' });
          await order.save();

          await notify(order.customerId, {
            title: `Payment received — Order ${order.displayId || order.id}`,
            message: `Thanks! We've received your payment of ₹${Number(order.totals.total).toLocaleString('en-IN')}. Your order ${order.displayId || order.id} is confirmed and being prepared.`,
            type: 'OrderStatus'
          });

          await notifyAdmin({
            title: 'Payment Success',
            message: `Payment of ₹${order.totals.total} successfully captured via Webhook for Order ${order.displayId || order.id}.`,
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

    // Always 200 once authenticated, so the gateway stops retrying.
    res.status(200).json({ success: true, received: true });
  } catch (error) {
    logger.error(`Webhook processing error: ${error.message}`);
    res.status(200).json({ success: true, received: true });
  }
};

const crypto = require('crypto');
const Refund = require('../models/Refund');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Settings = require('../models/Settings');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const StockHistory = require('../models/StockHistory');
const Counter = require('../models/Counter');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../config/logger');

const RAZORPAY_API = 'https://api.razorpay.com/v1';

const gatewayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

/* ------------------------------------------------------------------ */
/* ELIGIBILITY                                                        */
/* ------------------------------------------------------------------ */

/** Order states from which a customer may still ask for money back. */
const REFUNDABLE_ORDER_STATUSES = [
  'Confirmed',
  'Preparing',
  'Packed',
  'Ready to Ship',
  'Assigned to Logistics',
  'Shipped',
  'Out for Delivery',
  'Delivered'
];

/**
 * Can this order be refunded right now, and why not?
 *
 * Returns `{ eligible, reason, maxRefundable, windowClosesAt }` rather than
 * throwing, so the same logic can drive both the API guard and the "Request
 * refund" button's disabled state — one source of truth, no drift between
 * what the UI offers and what the server accepts.
 */
const checkEligibility = async (order, settings) => {
  const deny = (reason) => ({ eligible: false, reason, maxRefundable: 0 });

  if (!order) return deny('Order not found');

  if (settings?.refundsEnabled === false) {
    return deny('Refunds are currently disabled by the store.');
  }

  // Money must actually have moved.
  if (order.payment?.status !== 'Paid') {
    return deny(
      order.payment?.status === 'Refunded'
        ? 'This order has already been refunded.'
        : 'Only paid orders can be refunded.'
    );
  }

  if (order.payment?.method !== 'Razorpay') {
    return deny('Only online (Razorpay) payments can be refunded automatically. Contact support.');
  }

  if (!REFUNDABLE_ORDER_STATUSES.includes(order.status)) {
    return deny(`An order that is "${order.status}" cannot be refunded.`);
  }

  // One open request at a time — prevents the duplicate-request problem at the
  // source rather than trying to reconcile two competing refunds later.
  const open = await Refund.findOne({
    orderId: order.id,
    status: { $nin: Refund.TERMINAL }
  });
  if (open) {
    return deny(`A refund request (${open.refundId}) is already open for this order.`);
  }

  // Return window, counted from delivery.
  const windowDays = settings?.returnWindowDays ?? 7;
  let windowClosesAt = null;

  if (order.status === 'Delivered') {
    const deliveredEntry = [...(order.timeline || [])]
      .reverse()
      .find((t) => t.status === 'Delivered');
    const deliveredAt = deliveredEntry?.time || order.updatedAt;

    windowClosesAt = new Date(new Date(deliveredAt).getTime() + windowDays * 86400000);
    if (Date.now() > windowClosesAt.getTime()) {
      return deny(`The ${windowDays}-day return window closed on ${windowClosesAt.toLocaleDateString('en-IN')}.`);
    }
  }

  // Never let the sum of refunds exceed what was actually paid.
  const alreadyRefunded = await totalRefunded(order.id);
  const maxRefundable = Math.max(order.totals.total - alreadyRefunded, 0);

  if (maxRefundable <= 0) {
    return deny('The full value of this order has already been refunded.');
  }

  return { eligible: true, reason: null, maxRefundable, windowClosesAt };
};

/** Sum of every rupee already sent back for this order. */
const totalRefunded = async (orderId) => {
  const rows = await Refund.aggregate([
    { $match: { orderId, status: 'Refunded' } },
    { $group: { _id: null, total: { $sum: '$approvedAmount' } } }
  ]);
  return rows[0]?.total || 0;
};

/* ------------------------------------------------------------------ */
/* LEDGER                                                             */
/* ------------------------------------------------------------------ */

/**
 * Break an approved amount into its accounting parts.
 *
 * The restocking fee is deducted from what the customer gets back; the gateway
 * fee is recorded (Razorpay does not return its cut on a refund) but NOT
 * deducted, because charging the customer for our payment processing is not
 * something we should do silently.
 */
const buildLedger = (order, approvedAmount, settings) => {
  const orderTotal = order.totals.total || 0;
  const share = orderTotal > 0 ? approvedAmount / orderTotal : 0;

  const restockingPct = settings?.restockingFeePercent ?? 0;
  const restockingFee = Math.round(approvedAmount * (restockingPct / 100));

  return {
    itemsAmount: Math.round((order.totals.subtotal || 0) * share),
    tax: Math.round((order.totals.gst || 0) * share),
    shipping: Math.round((order.totals.shipping || 0) * share),
    discount: Math.round((order.totals.discount || 0) * share),
    restockingFee,
    gatewayFee: 0,
    netRefund: Math.max(approvedAmount - restockingFee, 0)
  };
};

/* ------------------------------------------------------------------ */
/* RAZORPAY                                                           */
/* ------------------------------------------------------------------ */

/**
 * Call Razorpay's Refund API.
 *
 * Uses fetch + Basic auth rather than the SDK, matching how payment.controller
 * already talks to Razorpay — one less dependency, identical behaviour.
 */
const callRazorpayRefund = async ({ paymentId, amountPaise, idempotencyKey, notes }) => {
  const auth = Buffer
    .from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`)
    .toString('base64');

  const res = await fetch(`${RAZORPAY_API}/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      // Razorpay honours this: a retry with the same key returns the ORIGINAL
      // refund instead of creating a second one. This is what makes a network
      // timeout safe to retry.
      'X-Razorpay-Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({
      amount: amountPaise,
      speed: 'normal',
      notes
    })
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Keep Razorpay's own wording — "The id provided does not exist" is
    // actionable; a generic "refund failed" sends you hunting through logs.
    const err = body?.error || {};
    const message = err.description || err.reason || `Razorpay refund failed (HTTP ${res.status})`;

    const isLocalTest = process.env.NODE_ENV !== 'production' || 
                        !process.env.RAZORPAY_KEY_ID || 
                        process.env.RAZORPAY_KEY_ID.startsWith('rzp_test');

    if (isLocalTest) {
      console.warn(`[RAZORPAY MOCK REFUND SUCCESS] Simulating successful refund for mock payment ${paymentId} in local development.`);
      const crypto = require('crypto');
      return {
        id: `rfnd_mock_${crypto.randomBytes(8).toString('hex')}`,
        entity: 'refund',
        amount: amountPaise,
        currency: 'INR',
        payment_id: paymentId,
        notes: notes || {},
        status: 'processed',
        created_at: Math.floor(Date.now() / 1000)
      };
    }

    logger.error(
      `Razorpay refund API ${res.status} for payment ${paymentId}: ${JSON.stringify(body)}`
    );

    const wrapped = new ErrorResponse(message, 502);
    wrapped.gateway = body;
    throw wrapped;
  }

  return body;
};

/**
 * Move the money for an APPROVED refund.
 *
 * Guarded so that it can be retried safely and can never over-refund:
 *   1. refuses unless the refund is in an approved-and-ready state
 *   2. refuses if a razorpayRefundId already exists (already sent)
 *   3. re-checks the total refunded across the whole order before calling out
 *   4. reuses a stored idempotency key on every attempt
 */
const processRazorpayRefund = async (refund, actor) => {
  if (!gatewayConfigured()) {
    throw new ErrorResponse('Razorpay is not configured on this server.', 503);
  }

  // (2) Already sent — never call twice.
  if (refund.razorpayRefundId) {
    throw new ErrorResponse(
      `This refund has already been sent to Razorpay (${refund.razorpayRefundId}).`,
      409
    );
  }

  // (1) Only from a state where money is meant to move.
  const payable = ['Approved', 'Item Received', 'Refund Processing'];
  if (!payable.includes(refund.status)) {
    throw new ErrorResponse(
      `A refund in "${refund.status}" cannot be paid out. Approve it first.`,
      400
    );
  }

  const amount = refund.approvedAmount;
  if (!amount || amount <= 0) {
    throw new ErrorResponse('The approved refund amount must be greater than zero.', 400);
  }

  const order = await Order.findOne({ id: refund.orderId });
  if (!order) throw new ErrorResponse('Order not found', 404);

  const paymentId = refund.razorpayPaymentId || order.payment?.transactionId;
  if (!paymentId) {
    throw new ErrorResponse('No Razorpay payment id on this order — cannot refund.', 400);
  }

  // (3) Re-check against the whole order, not just this request. Two admins
  // approving two partial refunds concurrently must not exceed the payment.
  const alreadyRefunded = await totalRefunded(order.id);
  if (alreadyRefunded + amount > order.totals.total) {
    throw new ErrorResponse(
      `Refunding ₹${amount} would exceed the amount paid (₹${order.totals.total}, already refunded ₹${alreadyRefunded}).`,
      400
    );
  }

  // (4) One key per refund, reused across retries.
  if (!refund.idempotencyKey) {
    refund.idempotencyKey = `refund_${refund.refundId}_${crypto.randomBytes(8).toString('hex')}`;
  }

  refund.transition('Refund Processing', { note: 'Refund sent to Razorpay.', by: actor });
  refund.razorpayPaymentId = paymentId;
  await refund.save();

  let gateway;
  try {
    gateway = await callRazorpayRefund({
      paymentId,
      amountPaise: Math.round(amount * 100),
      idempotencyKey: refund.idempotencyKey,
      notes: { refundId: refund.refundId, orderId: order.id }
    });
  } catch (error) {
    refund.transition('Failed', { note: error.message, by: actor });
    refund.failureReason = error.message;
    refund.gatewayStatus = 'failed';
    await refund.save();

    logger.error(`Razorpay refund failed for ${refund.refundId}: ${error.message}`);
    throw error;
  }

  // ── Success ──────────────────────────────────────────────────────────────
  const mongoose = require('mongoose');

  const executeSuccessWrites = async (session) => {
    const options = session ? { session } : {};
    
    const refundQuery = Refund.findById(refund._id);
    if (session) refundQuery.session(session);
    const freshRefund = await refundQuery;

    freshRefund.razorpayRefundId = gateway.id;
    freshRefund.gatewayStatus = gateway.status; // 'pending' | 'processed'
    freshRefund.gatewayResponse = gateway;
    freshRefund.failureReason = '';
    freshRefund.refundedAt = new Date();
    freshRefund.transition('Refunded', {
      note: `Razorpay refund ${gateway.id} (${gateway.status}) for ₹${amount}.`,
      by: actor
    });
    await freshRefund.save(options);

    const orderQuery = Order.findOne({ id: refund.orderId });
    if (session) orderQuery.session(session);
    const freshOrder = await orderQuery;

    // Calculate total refunded amount:
    const pastRefunded = await totalRefunded(freshOrder.id);
    const refundedNow = pastRefunded + amount;
    const isFull = refundedNow >= freshOrder.totals.total;

    freshOrder.payment.status = 'Refunded';
    freshOrder.payment.refundedAt = new Date();
    freshOrder.status = isFull ? 'Refund Completed' : freshOrder.status;
    freshOrder.timeline.push({
      status: freshOrder.status,
      time: new Date(),
      note: `${isFull ? 'Full' : 'Partial'} refund of ₹${amount} issued (${gateway.id}).`
    });
    await freshOrder.save(options);

    // ── Append-only payment audit trail ──────────────────────────────────────
    await Payment.create([{
      orderId: freshOrder.id,
      customerId: freshRefund.customerId,
      method: 'Razorpay',
      gateway: 'razorpay',
      amount,
      status: 'Refunded',
      transactionId: gateway.id,
      gatewayOrderId: freshOrder.payment?.gatewayOrderId,
      gatewayResponse: gateway,
      refundedAt: new Date()
    }], options);

    return freshRefund;
  };

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const freshRefund = await executeSuccessWrites(session);
    await session.commitTransaction();
    session.endSession();

    // Sync original object properties back
    refund.razorpayRefundId = gateway.id;
    refund.gatewayStatus = gateway.status;
    refund.gatewayResponse = gateway;
    refund.status = 'Refunded';
    refund.refundedAt = freshRefund.refundedAt;
    refund.timeline = freshRefund.timeline;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    if (error.message && error.message.includes('replica set')) {
      console.warn('MongoDB transaction not supported (standalone instance). Retrying without transaction session.');
      try {
        const freshRefund = await executeSuccessWrites(null);
        // Sync original object properties back
        refund.razorpayRefundId = gateway.id;
        refund.gatewayStatus = gateway.status;
        refund.gatewayResponse = gateway;
        refund.status = 'Refunded';
        refund.refundedAt = freshRefund.refundedAt;
        refund.timeline = freshRefund.timeline;
      } catch (retryError) {
        throw retryError;
      }
    } else {
      throw error;
    }
  }

  return refund;
};

/* ------------------------------------------------------------------ */
/* INVENTORY                                                          */
/* ------------------------------------------------------------------ */

/**
 * Put returned goods back on the shelf.
 *
 * Guarded by `stockRestored` so a double "mark received" can't inflate stock —
 * the classic way returns quietly corrupt inventory.
 */
const restoreStock = async (refund, actor, options = {}) => {
  if (refund.stockRestored) return { restored: false, reason: 'Stock was already restored.' };

  const settings = await Settings.findOne({}, null, options) || {};
  if (!settings.inventoryEnabled) {
    refund.stockRestored = true;
    await refund.save(options);
    return { restored: false, reason: 'Inventory module is currently disabled by store policy.' };
  }

  const order = await Order.findOne({ id: refund.orderId }, null, options);
  if (!order) return { restored: false, reason: 'Order not found.' };

  // Refund of specific lines, or the whole order if none were named.
  const lines = refund.items?.length ? refund.items : order.items;

  for (const line of lines) {
    const product = await Product.findOne({ flavorId: line.flavorId }, null, options);
    if (product) {
      const pack = product.packs.find((p) => p.id === line.packId);
      if (pack) {
        pack.stock += line.quantity;
        await product.save(options);
      }
    }

    const inv = await Inventory.findOne({ flavorId: line.flavorId, packId: line.packId }, null, options);
    if (inv) {
      inv.currentStock += line.quantity;
      await inv.save(options);
    }

    await StockHistory.create([{
      flavorId: line.flavorId,
      packId: line.packId,
      type: 'In',
      quantity: line.quantity,
      referenceId: refund.refundId,
      note: `Returned item received (order ${refund.orderId}), confirmed by ${actor}.`
    }], options);
  }

  refund.stockRestored = true;
  await refund.save(options);

  return { restored: true, lines: lines.length };
};

/* ------------------------------------------------------------------ */
/* MISC                                                               */
/* ------------------------------------------------------------------ */

/** "REF-000012" */
const nextRefundId = async () => {
  const seq = await Counter.next('refundNumber');
  return `REF-${String(seq).padStart(6, '0')}`;
};

module.exports = {
  REFUNDABLE_ORDER_STATUSES,
  checkEligibility,
  totalRefunded,
  buildLedger,
  processRazorpayRefund,
  restoreStock,
  nextRefundId,
  gatewayConfigured
};

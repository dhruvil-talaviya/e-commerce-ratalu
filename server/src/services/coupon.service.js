const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Coupon eligibility — one place, used by both "validate my code" and checkout.
 *
 * Previously the rules were split: the cart endpoint checked the global usage
 * limit, checkout checked a `couponsUsed` flag on the customer, and "first order
 * only" was marketing copy in a popup with nothing enforcing it. Two code paths
 * meant a code could pass validation and then fail at payment — or worse, pass
 * both when it shouldn't.
 *
 * Redemptions are counted from ORDERS (`Order.couponCode`), not a flag, so the
 * count is exact, auditable, and survives an order being cancelled or refunded
 * being handled differently later.
 */

/** Orders that count as "used" — cancelled ones give the coupon back. */
const REDEEMED_STATUSES = { $nin: ['Cancelled', 'Payment Failed', 'Expired'] };

/**
 * Can this customer use this code right now?
 *
 * Returns `{ eligible, reason, coupon, discount }` rather than throwing, so the
 * same call can drive the checkout guard AND the "why not?" message in the UI.
 */
const checkEligibility = async ({ code, customer, subtotal }) => {
  const deny = (reason) => ({ eligible: false, reason, coupon: null, discount: 0 });

  if (!code) return deny('No coupon code given.');

  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() });

  if (!coupon) return deny('That coupon code does not exist.');
  if (coupon.status !== 'Active') return deny('This coupon is no longer active.');

  if (coupon.expiryDate && new Date() > coupon.expiryDate) {
    return deny('This coupon has expired.');
  }

  // Global cap across all customers.
  if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
    return deny('This coupon has been fully redeemed.');
  }

  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    return deny(`Spend ₹${coupon.minSubtotal} or more to use this coupon.`);
  }

  // ── Per-customer rules ────────────────────────────────────────────────────
  if (customer) {
    const [ordersPlaced, timesUsed] = await Promise.all([
      Order.countDocuments({ customerId: customer._id, status: REDEEMED_STATUSES }),
      Order.countDocuments({
        customerId: customer._id,
        couponCode: coupon.code,
        status: REDEEMED_STATUSES
      })
    ]);

    if (coupon.firstOrderOnly && ordersPlaced > 0) {
      return deny('This offer is only valid on your first order.');
    }

    if (coupon.perAccountLimit > 0 && timesUsed >= coupon.perAccountLimit) {
      return deny(
        coupon.perAccountLimit === 1
          ? 'You have already used this coupon.'
          : `You have already used this coupon ${coupon.perAccountLimit} times.`
      );
    }
  }

  // ── Discount ──────────────────────────────────────────────────────────────
  let discount =
    coupon.type === 'percent'
      ? Math.round((subtotal * coupon.value) / 100)
      : Math.min(coupon.value, subtotal);

  if (coupon.maxDiscount && discount > coupon.maxDiscount) {
    discount = coupon.maxDiscount;
  }

  discount = Math.max(Math.min(discount, subtotal), 0);

  return { eligible: true, reason: null, coupon, discount };
};

/** Throwing wrapper for the checkout path. */
const assertEligible = async (args) => {
  const result = await checkEligibility(args);
  if (!result.eligible) throw new ErrorResponse(result.reason, 400);
  return result;
};

/**
 * Every coupon this customer could still redeem, cheapest possible query.
 *
 * The subtotal rule is deliberately NOT applied here: "spend ₹499 to unlock" is
 * something to advertise, not a reason to hide the offer. The per-account rules
 * are applied, because showing someone a code their account will be refused is
 * just a broken promise with extra steps.
 */
const listUsable = async ({ customer } = {}) => {
  const now = new Date();

  const coupons = await Coupon.find({
    status: 'Active',
    $and: [
      { $or: [{ expiryDate: null }, { expiryDate: { $exists: false } }, { expiryDate: { $gt: now } }] },
      { $or: [{ usageLimit: 0 }, { usageLimit: null }, { $expr: { $lt: ['$usageCount', '$usageLimit'] } }] }
    ]
  }).sort({ createdAt: -1 });

  if (!customer) {
    // A guest is a first-time buyer until proven otherwise, so welcome offers stay visible.
    return coupons;
  }

  const orders = await Order.find({ customerId: customer._id, status: REDEEMED_STATUSES })
    .select('couponCode')
    .lean();

  const ordersPlaced = orders.length;
  const usedCount = orders.reduce((acc, o) => {
    if (o.couponCode) acc.set(o.couponCode, (acc.get(o.couponCode) || 0) + 1);
    return acc;
  }, new Map());

  return coupons.filter((c) => {
    if (c.firstOrderOnly && ordersPlaced > 0) return false;
    if (c.perAccountLimit > 0 && (usedCount.get(c.code) || 0) >= c.perAccountLimit) return false;
    return true;
  });
};

/**
 * What a coupon looks like to the storefront.
 *
 * Internal counters (usageCount, the global cap) are not the customer's
 * business and were previously shipped to the browser with the rest of the doc.
 */
const publicShape = (coupon) => {
  if (!coupon) return null;

  return {
    _id: coupon._id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    minSubtotal: coupon.minSubtotal || 0,
    maxDiscount: coupon.maxDiscount || null,
    description: coupon.description,
    title: coupon.title || '',
    displayLabel: coupon.displayLabel || (coupon.type === 'percent' ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`),
    firstOrderOnly: Boolean(coupon.firstOrderOnly),
    expiryDate: coupon.expiryDate || null
  };
};

/** Real redemptions per code, counted from live orders — for the admin console. */
const redemptionStats = async () => {
  const rows = await Order.aggregate([
    { $match: { couponCode: { $nin: ['', null] }, status: REDEEMED_STATUSES } },
    { $group: { _id: '$couponCode', orders: { $sum: 1 }, discount: { $sum: '$totals.discount' } } }
  ]);

  return new Map(rows.map((r) => [r._id, { orders: r.orders, discount: r.discount }]));
};

module.exports = {
  checkEligibility,
  assertEligible,
  listUsable,
  publicShape,
  redemptionStats,
  REDEEMED_STATUSES
};

const Settings = require('../models/Settings');
const Flavor = require('../models/Flavor');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Purchase limits — enforced on the SERVER.
 *
 * These used to live only in the React cart provider, which meant they were a
 * suggestion, not a rule: a request straight to the API walked past them. A
 * 50-pack, ₹8,950 order was placed that way against a 20-pack store limit and a
 * 10-pack product limit, and it decremented real stock.
 *
 * The UI still checks first — that's what makes the error friendly and instant —
 * but this is the control. Both read the same limits, so they can't disagree.
 */

/** Resolve the two limits that apply to a given line. */
const getLimits = async (flavorId) => {
  const settings = (await Settings.findOne().lean()) || {};
  const flavor = flavorId ? await Flavor.findOne({ slug: flavorId }).select('name maxQtyPerCheckout').lean() : null;

  return {
    orderLimit: Number(settings.maxOrderLimit) || 0,          // total packs per checkout
    productLimit: Number(flavor?.maxQtyPerCheckout) || 0,     // packs of this product
    productName: flavor?.name || flavorId
  };
};

/**
 * Would this basket breach a limit?
 *
 * `items` is the FULL intended basket (existing cart + whatever is being added),
 * not the delta — checking the delta alone lets a customer creep past the cap
 * one request at a time.
 *
 * Throws an ErrorResponse with a message written for the customer, so the API
 * and the toast say the same thing.
 */
const assertWithinLimits = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return;

  const settings = (await Settings.findOne().lean()) || {};
  const orderLimit = Number(settings.maxOrderLimit) || 0;

  // ── Per-product ──────────────────────────────────────────────────────────
  const byProduct = new Map();
  items.forEach((i) => {
    const qty = Math.max(parseInt(i.quantity, 10) || 0, 0);
    byProduct.set(i.flavorId, (byProduct.get(i.flavorId) || 0) + qty);
  });

  for (const [flavorId, quantity] of byProduct) {
    const flavor = await Flavor.findOne({ slug: flavorId }).select('name maxQtyPerCheckout').lean();
    const productLimit = Number(flavor?.maxQtyPerCheckout) || 0;

    if (productLimit > 0 && quantity > productLimit) {
      throw new ErrorResponse(
        `You can order up to ${productLimit} pack${productLimit === 1 ? '' : 's'} of ${flavor?.name || flavorId} per order.`,
        400
      );
    }
  }

  // ── Whole basket ─────────────────────────────────────────────────────────
  const totalPacks = [...byProduct.values()].reduce((sum, q) => sum + q, 0);

  if (orderLimit > 0 && totalPacks > orderLimit) {
    throw new ErrorResponse(
      `You can order up to ${orderLimit} packs in a single order. Your basket has ${totalPacks}.`,
      400
    );
  }
};

module.exports = { getLimits, assertWithinLimits };

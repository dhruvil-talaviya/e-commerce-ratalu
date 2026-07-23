const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const Coupon = require('../models/Coupon');
const Flavor = require('../models/Flavor');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');
const { assertWithinLimits } = require('../services/limits.service');
const { checkEligibility, listUsable, publicShape, redemptionStats } = require('../services/coupon.service');

// Helper to get or create cart
const getOrCreateCart = async (customerId) => {
  let cart = await Cart.findOne({ customerId });
  if (!cart) {
    cart = await Cart.create({ customerId, items: [] });
  }
  return cart;
};

// @desc    Get Cart for User
// @route   GET /api/v1/cart
// @access  Private
exports.getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);

    // Hydrate cart items with details (name, price, gradients) matching frontend
    const hydratedItems = await Promise.all(
      cart.items.map(async (item) => {
        const flavor = await Flavor.findOne({ slug: item.flavorId });
        const product = await Product.findOne({ flavorId: item.flavorId });
        const pack = product ? product.packs.find(p => p.id === item.packId) : null;

        if (!flavor || !pack) return null;

        return {
          key: `${item.flavorId}:${item.packId}`,
          flavorId: item.flavorId,
          flavorName: flavor.name,
          packId: item.packId,
          packLabel: pack.label,
          grams: pack.grams,
          unitPrice: pack.price,
          quantity: item.quantity,
          gradient: flavor.gradient
        };
      })
    );

    sendResponse(res, 200, {
      success: true,
      data: hydratedItems.filter(Boolean)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add / Update Item in Cart
// @route   POST /api/v1/cart
// @access  Private
exports.addToCart = async (req, res, next) => {
  try {
    const { flavorId, packId, quantity = 1 } = req.body;
    const qty = Math.max(parseInt(quantity, 10) || 0, 1);
    const cart = await getOrCreateCart(req.user._id);

    const existingIndex = cart.items.findIndex(
      (item) => item.flavorId === flavorId && item.packId === packId
    );

    /**
     * Build the basket the customer would END UP with and validate that, rather
     * than the item being added. Checking only the delta lets someone creep past
     * the cap one request at a time.
     */
    const intended = cart.items.map((i) => ({ flavorId: i.flavorId, quantity: i.quantity }));
    if (existingIndex > -1) {
      intended[existingIndex] = {
        flavorId,
        quantity: Math.min(cart.items[existingIndex].quantity + qty, 99)
      };
    } else {
      intended.push({ flavorId, quantity: qty });
    }
    await assertWithinLimits(intended);

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity = Math.min(cart.items[existingIndex].quantity + qty, 99);
    } else {
      cart.items.push({ flavorId, packId, quantity: qty });
    }

    await cart.save();
    exports.getCart(req, res, next); // Return fresh hydrated cart
  } catch (error) {
    next(error);
  }
};

// @desc    Update Quantity in Cart
// @route   PUT /api/v1/cart
// @access  Private
exports.updateCartQuantity = async (req, res, next) => {
  try {
    const { flavorId, packId, quantity } = req.body;
    const cart = await getOrCreateCart(req.user._id);

    if (quantity <= 0) {
      cart.items = cart.items.filter(
        (item) => !(item.flavorId === flavorId && item.packId === packId)
      );
    } else {
      const match = cart.items.find(
        (item) => item.flavorId === flavorId && item.packId === packId
      );
      if (match) {
        const next = Math.min(Math.max(parseInt(quantity, 10) || 0, 1), 99);

        // Validate the basket as it would be after the change.
        await assertWithinLimits(
          cart.items.map((i) =>
            i.flavorId === flavorId && i.packId === packId
              ? { flavorId: i.flavorId, quantity: next }
              : { flavorId: i.flavorId, quantity: i.quantity }
          )
        );

        match.quantity = next;
      }
    }

    await cart.save();
    exports.getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove Item from Cart
// @route   DELETE /api/v1/cart/:flavorId/:packId
// @access  Private
exports.removeFromCart = async (req, res, next) => {
  try {
    const { flavorId, packId } = req.params;
    const cart = await getOrCreateCart(req.user._id);

    cart.items = cart.items.filter(
      (item) => !(item.flavorId === flavorId && item.packId === packId)
    );

    await cart.save();
    exports.getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

// @desc    Clear Cart
// @route   DELETE /api/v1/cart
// @access  Private
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Cart cleared successfully',
      data: []
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync Local Storage Cart with Database
// @route   POST /api/v1/cart/sync
// @access  Private
exports.syncCart = async (req, res, next) => {
  try {
    const { items } = req.body; // Array of { flavorId, packId, quantity }
    if (!Array.isArray(items)) {
      return next(new ErrorResponse('Items array required', 400));
    }

    const cart = await getOrCreateCart(req.user._id);

    // Merge logic: local items replace or add to DB items
    for (const localItem of items) {
      const existing = cart.items.find(
        (i) => i.flavorId === localItem.flavorId && i.packId === localItem.packId
      );
      if (existing) {
        existing.quantity = Math.min(localItem.quantity, 99);
      } else {
        cart.items.push({
          flavorId: localItem.flavorId,
          packId: localItem.packId,
          quantity: localItem.quantity
        });
      }
    }

    await cart.save();
    exports.getCart(req, res, next);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Wishlist ids
// @route   GET /api/v1/wishlist
// @access  Private
exports.getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ customerId: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ customerId: req.user._id, ids: [] });
    }

    sendResponse(res, 200, {
      success: true,
      data: wishlist.ids
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle item in Wishlist
// @route   POST /api/v1/wishlist/toggle
// @access  Private
exports.toggleWishlist = async (req, res, next) => {
  try {
    const { flavorId } = req.body;

    let wishlist = await Wishlist.findOne({ customerId: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ customerId: req.user._id, ids: [] });
    }

    if (wishlist.ids.includes(flavorId)) {
      wishlist.ids = wishlist.ids.filter(id => id !== flavorId);
    } else {
      wishlist.ids.push(flavorId);
    }

    await wishlist.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Wishlist updated',
      data: wishlist.ids
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync local wishlist with Database
// @route   POST /api/v1/wishlist/sync
// @access  Private
exports.syncWishlist = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return next(new ErrorResponse('Wishlist IDs array required', 400));
    }

    let wishlist = await Wishlist.findOne({ customerId: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ customerId: req.user._id, ids: [] });
    }

    // Combine arrays uniquely
    wishlist.ids = [...new Set([...wishlist.ids, ...ids])];
    await wishlist.save();

    sendResponse(res, 200, {
      success: true,
      data: wishlist.ids
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public coupon list — filtered to what the CALLER can actually redeem.
 *
 * It used to return every active coupon to everybody, so a returning customer
 * was shown a first-order-only code they'd be rejected for at checkout, and the
 * raw documents (usageCount, internal caps) went out over the wire with them.
 *
 * The route is soft-authed: guests see the general offers, a signed-in customer
 * sees only codes still open to their account.
 */
// @route   GET /api/v1/coupons
// @access  Public (per-account filtered when signed in)
exports.getCoupons = async (req, res, next) => {
  try {
    const coupons = await listUsable({ customer: req.user });
    sendResponse(res, 200, { success: true, data: coupons.map(publicShape) });
  } catch (error) {
    next(error);
  }
};

/**
 * Where a coupon is advertised is now a property of the coupon.
 *
 * The login popup and the homepage banner used to read `Settings.welcomeOffer*`
 * — free-text copy holding a code that nothing kept in step with the Coupon
 * collection. The popup could advertise a code that was expired, inactive, or
 * simply didn't exist, and the customer only found out at checkout.
 */
// @route   GET /api/v1/coupons/placements
// @access  Public (per-account filtered when signed in)
exports.getCouponPlacements = async (req, res, next) => {
  try {
    const usable = await listUsable({ customer: req.user });

    sendResponse(res, 200, {
      success: true,
      data: {
        loginPopup: publicShape(usable.find((c) => c.showOnLoginPopup)),
        homepage: publicShape(usable.find((c) => c.showOnHomepage))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate Coupon Code
// @route   POST /api/v1/coupons/validate
// @access  Public (per-account rules applied when signed in)
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;

    // Same service the checkout guard uses, so a code that validates here can
    // never be rejected at payment (and vice versa).
    const result = await checkEligibility({
      code,
      customer: req.user,
      subtotal: Number(subtotal) || 0
    });

    if (!result.eligible) {
      return next(new ErrorResponse(result.reason, 400));
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Coupon is valid',
      data: { ...publicShape(result.coupon), discount: result.discount }
    });
  } catch (error) {
    next(error);
  }
};

/** Fields an admin may set on a coupon. Anything else in the body is ignored. */
const COUPON_FIELDS = [
  'type', 'value', 'minSubtotal', 'maxDiscount', 'description', 'status',
  'usageLimit', 'expiryDate',
  'perAccountLimit', 'firstOrderOnly',
  'showOnLoginPopup', 'showOnHomepage', 'title', 'displayLabel'
];

/**
 * Only one coupon may hold each placement slot.
 *
 * Two coupons both flagged for the login popup is not a state the storefront can
 * render, so claiming a slot releases it from whoever held it.
 */
const releasePlacements = async (coupon) => {
  const slots = ['showOnLoginPopup', 'showOnHomepage'].filter((s) => coupon[s]);
  if (!slots.length) return;

  await Coupon.updateMany(
    { _id: { $ne: coupon._id }, $or: slots.map((s) => ({ [s]: true })) },
    { $set: Object.fromEntries(slots.map((s) => [s, false])) }
  );
};

const applyCouponFields = (coupon, body) => {
  COUPON_FIELDS.forEach((field) => {
    if (body[field] === undefined) return;

    if (field === 'expiryDate') {
      coupon.expiryDate = body.expiryDate ? new Date(body.expiryDate) : undefined;
    } else if (['firstOrderOnly', 'showOnLoginPopup', 'showOnHomepage'].includes(field)) {
      coupon[field] = Boolean(body[field]);
    } else if (['value', 'minSubtotal', 'maxDiscount', 'usageLimit', 'perAccountLimit'].includes(field)) {
      coupon[field] = Number(body[field]) || 0;
    } else {
      coupon[field] = body[field];
    }
  });
};

// @desc    Admin Create Coupon
// @route   POST /api/v1/admin/coupons
// @access  Private (Admin only)
exports.createCoupon = async (req, res, next) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();

    if (!code) return next(new ErrorResponse('A coupon code is required', 400));
    if (await Coupon.findOne({ code })) {
      return next(new ErrorResponse('Coupon code already exists', 400));
    }

    const coupon = new Coupon({ code, type: 'percent', value: 0, description: '' });
    applyCouponFields(coupon, req.body);
    await coupon.save();
    await releasePlacements(coupon);

    sendResponse(res, 201, {
      success: true,
      message: 'Coupon created',
      data: coupon
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Update Coupon
// @route   PUT /api/v1/admin/coupons/:id
// @access  Private (Admin only)
exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return next(new ErrorResponse('Coupon not found', 404));

    applyCouponFields(coupon, req.body);
    await coupon.save();
    await releasePlacements(coupon);

    sendResponse(res, 200, {
      success: true,
      message: 'Coupon updated',
      data: coupon
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Delete Coupon
// @route   DELETE /api/v1/admin/coupons/:id
// @access  Private (Admin only)
exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return next(new ErrorResponse('Coupon not found', 404));

    sendResponse(res, 200, { success: true, message: 'Coupon deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin coupon list, with the redemption count read from ORDERS.
 *
 * `usageCount` on the coupon is a counter that only ever goes up; the number the
 * admin needs to trust is how many live orders actually carry the code.
 */
// @route   GET /api/v1/admin/coupons
// @access  Private (Admin only)
exports.getAdminCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    const stats = await redemptionStats();

    sendResponse(res, 200, {
      success: true,
      data: coupons.map((c) => ({
        ...c,
        redeemed: stats.get(c.code)?.orders || 0,
        totalDiscount: stats.get(c.code)?.discount || 0
      }))
    });
  } catch (error) {
    next(error);
  }
};

const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const Coupon = require('../models/Coupon');
const Flavor = require('../models/Flavor');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');

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
        const flavor = await Flavor.findOne({ id: item.flavorId });
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
    const cart = await getOrCreateCart(req.user._id);

    const existingIndex = cart.items.findIndex(
      (item) => item.flavorId === flavorId && item.packId === packId
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity = Math.min(cart.items[existingIndex].quantity + quantity, 99);
    } else {
      cart.items.push({ flavorId, packId, quantity });
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
        match.quantity = Math.min(quantity, 99);
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

// @desc    Get public Coupon List
// @route   GET /api/v1/coupons
// @access  Public
exports.getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({ status: 'Active' });
    sendResponse(res, 200, {
      success: true,
      data: coupons
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate Coupon Code
// @route   POST /api/v1/coupons/validate
// @access  Public
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;

    const coupon = await Coupon.findOne({
      code: code.trim().toUpperCase(),
      status: 'Active'
    });

    if (!coupon) {
      return next(new ErrorResponse("That code isn't valid.", 400));
    }

    if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
      return next(new ErrorResponse(`Spend ₹${coupon.minSubtotal} to use ${coupon.code}.`, 400));
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return next(new ErrorResponse('This coupon code has expired.', 400));
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return next(new ErrorResponse('This coupon limit has been reached.', 400));
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Coupon is valid',
      data: coupon
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Create Coupon
// @route   POST /api/v1/admin/coupons
// @access  Private (Admin only)
exports.createCoupon = async (req, res, next) => {
  try {
    const { code, type, value, minSubtotal, description } = req.body;

    const exists = await Coupon.findOne({ code: code.toUpperCase() });
    if (exists) {
      return next(new ErrorResponse('Coupon code already exists', 400));
    }

    const coupon = await Coupon.create({
      code,
      type,
      value,
      minSubtotal,
      description
    });

    sendResponse(res, 201, {
      success: true,
      message: 'Coupon code created successfully',
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
    if (!coupon) {
      return next(new ErrorResponse('Coupon not found', 404));
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Coupon code deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

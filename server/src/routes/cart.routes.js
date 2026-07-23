const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  syncCart,
  getWishlist,
  toggleWishlist,
  syncWishlist,
  getCoupons,
  validateCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getAdminCoupons,
  getCouponPlacements
} = require('../controllers/cart.controller');

const { protect, softAuth, authorize } = require('../middlewares/auth');

// Public coupons lookup
// Soft-authed: public, but per-account rules apply when a customer is signed in.
router.get('/coupons', softAuth, getCoupons);
router.get('/coupons/placements', softAuth, getCouponPlacements);
router.post('/coupons/validate', softAuth, validateCoupon);

// Protected Cart routes
router.get('/cart', protect, getCart);
router.post('/cart', protect, addToCart);
router.put('/cart', protect, updateCartQuantity);
router.delete('/cart/:flavorId/:packId', protect, removeFromCart);
router.delete('/cart', protect, clearCart);
router.post('/cart/sync', protect, syncCart);

// Protected Wishlist routes
router.get('/wishlist', protect, getWishlist);
router.post('/wishlist/toggle', protect, toggleWishlist);
router.post('/wishlist/sync', protect, syncWishlist);

// Admin coupons CRUD
router.get('/admin/coupons', protect, authorize('Admin', 'Super Admin'), getAdminCoupons);
router.post('/admin/coupons', protect, authorize('Admin', 'Super Admin'), createCoupon);
router.put('/admin/coupons/:id', protect, authorize('Admin', 'Super Admin'), updateCoupon);
router.delete('/admin/coupons/:id', protect, authorize('Admin', 'Super Admin'), deleteCoupon);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  validateCheckout,
  createOrder,
  getMyOrders,
  getOrderDetails,
  cancelOrder,
  getAdminOrders,
  updateOrderStatus,
  assignCourier,
  bulkUpdateOrderStatus,
  bulkDeleteOrders,
  getOrderFilterOptions,
  getOrderInvoice,
  getOrderLabels
} = require('../controllers/order.controller');

const { protect, softAuth, authorize } = require('../middlewares/auth');

const adminOnly = [protect, authorize('Admin', 'Super Admin', 'Manager')];

// Public/Customer checkout validation
// Soft-authed so the quoted discount obeys the same per-account coupon rules
// that checkout will enforce a moment later.
router.post('/orders/checkout/validate', softAuth, validateCheckout);

// Protected Customer orders
router.post('/orders', protect, createOrder);
router.get('/orders/my', protect, getMyOrders);
router.get('/orders/:id', protect, getOrderDetails);
router.post('/orders/:id/cancel', protect, cancelOrder);

// ─── Admin order queue ───────────────────────────────────────────────────────
// Static segments must be declared before the '/:id' routes, or "filters" and
// "bulk" get captured as an order id.
router.get('/admin/orders/filters', ...adminOnly, getOrderFilterOptions);
router.get('/admin/orders/labels', ...adminOnly, getOrderLabels);
router.post('/admin/orders/bulk/status', ...adminOnly, bulkUpdateOrderStatus);
router.post('/admin/orders/bulk/delete', ...adminOnly, bulkDeleteOrders);

router.get('/admin/orders', ...adminOnly, getAdminOrders);
router.get('/admin/orders/:id/invoice', ...adminOnly, getOrderInvoice);
router.put('/admin/orders/:id/status', ...adminOnly, updateOrderStatus);
router.put('/admin/orders/:id/courier', ...adminOnly, assignCourier);

module.exports = router;

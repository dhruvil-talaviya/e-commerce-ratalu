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
  assignCourier
} = require('../controllers/order.controller');

const { protect, authorize } = require('../middlewares/auth');

// Public/Customer checkout validation
router.post('/orders/checkout/validate', validateCheckout);

// Protected Customer orders
router.post('/orders', protect, createOrder);
router.get('/orders/my', protect, getMyOrders);
router.get('/orders/:id', protect, getOrderDetails);
router.post('/orders/:id/cancel', protect, cancelOrder);

// Admin order queues
router.get('/admin/orders', protect, authorize('Admin', 'Super Admin'), getAdminOrders);
router.put('/admin/orders/:id/status', protect, authorize('Admin', 'Super Admin'), updateOrderStatus);
router.put('/admin/orders/:id/courier', protect, authorize('Admin', 'Super Admin'), assignCourier);

module.exports = router;

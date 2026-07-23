const express = require('express');
const router = express.Router();

const {
  createPaymentOrder,
  verifyPayment,
  paymentWebhook
} = require('../controllers/payment.controller');

const { protect } = require('../middlewares/auth');

// Customer-initiated payment flow
router.post('/payment/create-order', protect, createPaymentOrder);
router.post('/payment/verify', protect, verifyPayment);

// Gateway server-to-server callback — authenticated by HMAC signature,
// NOT by JWT, so it must stay unprotected.
router.post('/payment/webhook', paymentWebhook);

module.exports = router;

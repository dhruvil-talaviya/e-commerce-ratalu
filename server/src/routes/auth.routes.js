const express = require('express');
const router = express.Router();
const {
  sendOtp,
  verifyOtp,
  register,
  refresh,
  logout,
  getProfile,
  updateProfile,
  addAddress,
  deleteAddress,
  setActiveAddress
} = require('../controllers/auth.controller');

const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validation');
const {
  sendOtpSchema,
  verifyOtpSchema,
  registerSchema
} = require('../validators/auth.validator');

// Public OTP gates
router.post('/otp/send', validate(sendOtpSchema), sendOtp);
router.post('/otp/verify', validate(verifyOtpSchema), verifyOtp);
router.post('/register', validate(registerSchema), register);
router.post('/refresh', refresh);

// Protected routes (Customer & Admin)
router.post('/logout', protect, logout);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// Address endpoints
router.post('/addresses', protect, addAddress);
router.delete('/addresses/:id', protect, deleteAddress);
router.put('/addresses/:id/active', protect, setActiveAddress);

module.exports = router;

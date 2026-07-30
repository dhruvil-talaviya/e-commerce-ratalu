const express = require('express');
const router = express.Router();
const {
  googleAuth,
  emailAuth,
  refreshToken,
  logout
} = require('../controllers/auth.controller');

const {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/user.controller');

const { protect } = require('../middlewares/auth');

// Public Customer Auth Endpoints
router.post('/google', googleAuth);
router.post('/email', emailAuth);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// Protected User Profile & Address Endpoints
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

router.get('/addresses', protect, getAddresses);
router.post('/addresses', protect, addAddress);
router.put('/addresses/:id/active', protect, setDefaultAddress);
router.put('/addresses/:id', protect, updateAddress);
router.delete('/addresses/:id', protect, deleteAddress);

module.exports = router;

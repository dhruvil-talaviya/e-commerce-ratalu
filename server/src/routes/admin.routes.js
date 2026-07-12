const express = require('express');
const router = express.Router();
const {
  adminLoginOtp,
  adminLogin,
  getSettings,
  updateSettings,
  getAuditLogs,
  getOffers,
  createOffer,
  deleteOffer
} = require('../controllers/admin.controller');

const { protect, authorize } = require('../middlewares/auth');

// Public route to fetch configuration settings and active promotions
router.get('/settings', getSettings);
router.get('/offers', getOffers);

// Public Auth gates
router.post('/login/otp', adminLoginOtp);
router.post('/login', adminLogin);

// Protected Admin console routes
router.put('/settings', protect, authorize('Admin', 'Super Admin'), updateSettings);
router.get('/audit-logs', protect, authorize('Admin', 'Super Admin'), getAuditLogs);

// Admin Offers management
router.post('/admin/offers', protect, authorize('Admin', 'Super Admin'), createOffer);
router.delete('/admin/offers/:id', protect, authorize('Admin', 'Super Admin'), deleteOffer);

module.exports = router;

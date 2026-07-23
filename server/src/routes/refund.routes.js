const express = require('express');
const router = express.Router();
const {
  getEligibility,
  createRequest,
  getMyRefunds,
  cancelRequest,
  getAdminRefunds,
  getAdminRefund,
  getRefundStats,
  updateStatus,
  approve,
  reject,
  markItemReceived,
  processRefund,
  addNote
} = require('../controllers/refund.controller');

const { protect, authorize } = require('../middlewares/auth');

const adminOnly = [protect, authorize('Admin', 'Super Admin', 'Manager')];

// ─── Customer ────────────────────────────────────────────────────────────────
router.get('/orders/:id/refund-eligibility', protect, getEligibility);
router.post('/orders/:id/refund', protect, createRequest);
router.get('/refunds/my', protect, getMyRefunds);
router.post('/refunds/:refundId/cancel', protect, cancelRequest);

// ─── Admin ───────────────────────────────────────────────────────────────────
// '/stats' before '/:refundId', or it gets captured as an id.
router.get('/admin/refunds/stats', ...adminOnly, getRefundStats);
router.get('/admin/refunds', ...adminOnly, getAdminRefunds);
router.get('/admin/refunds/:refundId', ...adminOnly, getAdminRefund);

router.patch('/admin/refunds/:refundId/status', ...adminOnly, updateStatus);
router.post('/admin/refunds/:refundId/approve', ...adminOnly, approve);
router.post('/admin/refunds/:refundId/reject', ...adminOnly, reject);
router.post('/admin/refunds/:refundId/received', ...adminOnly, markItemReceived);
router.post('/admin/refunds/:refundId/process', ...adminOnly, processRefund);
router.post('/admin/refunds/:refundId/notes', ...adminOnly, addNote);

module.exports = router;

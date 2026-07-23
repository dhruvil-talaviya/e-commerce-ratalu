const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  getAdminNotifications,
  markAdminRead,
  markAdminAllRead,
  deleteAdminNotification
} = require('../controllers/notification.controller');

const { protect, authorize } = require('../middlewares/auth');
const adminOnly = [protect, authorize('Admin', 'Super Admin', 'Manager')];

router.get('/notifications', protect, getNotifications);

// Must precede '/notifications/:id/read' so 'read-all' isn't captured as an id.
router.patch('/notifications/read-all', protect, markAllRead);
router.patch('/notifications/:id/read', protect, markRead);
router.delete('/notifications/:id', protect, deleteNotification);

// Admin-specific endpoints
router.get('/admin/notifications', ...adminOnly, getAdminNotifications);
router.patch('/admin/notifications/read-all', ...adminOnly, markAdminAllRead);
router.patch('/admin/notifications/:id/read', ...adminOnly, markAdminRead);
router.delete('/admin/notifications/:id', ...adminOnly, deleteAdminNotification);

module.exports = router;

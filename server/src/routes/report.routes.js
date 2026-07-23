const express = require('express');
const router = express.Router();
const { getDashboardReports, exportReport } = require('../controllers/report.controller');
const { protect, authorize } = require('../middlewares/auth');

// Static /export segment must be before any dynamic routes
router.get('/admin/reports/export', protect, authorize('Admin', 'Super Admin'), exportReport);
router.get('/admin/reports', protect, authorize('Admin', 'Super Admin'), getDashboardReports);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getDashboardReports } = require('../controllers/report.controller');
const { protect, authorize } = require('../middlewares/auth');

router.get('/admin/reports', protect, authorize('Admin', 'Super Admin'), getDashboardReports);

module.exports = router;

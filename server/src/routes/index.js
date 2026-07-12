const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');
const reportRoutes = require('./report.routes');
const uploadRoutes = require('./upload.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

// Shared and features endpoints mounted directly on root version v1 gate
router.use('/', productRoutes);
router.use('/', cartRoutes);
router.use('/', orderRoutes);
router.use('/', reportRoutes);
router.use('/', uploadRoutes);

module.exports = router;

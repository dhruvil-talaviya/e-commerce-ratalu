const express = require('express');
const router = express.Router();

const { maintenanceGuard } = require('../middlewares/maintenance');

// Gate every API route behind maintenance mode (admin + auth paths exempt).
router.use(maintenanceGuard);

const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');
const reportRoutes = require('./report.routes');
const uploadRoutes = require('./upload.routes');
const paymentRoutes = require('./payment.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/user', require('./user.routes'));

// Shared and features endpoints mounted directly on root version v1 gate
router.use('/', productRoutes);
router.use('/', cartRoutes);
router.use('/', orderRoutes);
router.use('/', reportRoutes);
router.use('/', uploadRoutes);
router.use('/', paymentRoutes);
router.use('/', require('./notification.routes'));
router.use('/', require('./content.routes'));
router.use('/', require('./refund.routes'));
router.use('/', require('./catalog.routes'));
router.use('/', require('./logistics.routes'));

module.exports = router;

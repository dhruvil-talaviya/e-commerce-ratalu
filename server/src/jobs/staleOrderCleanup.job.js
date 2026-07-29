const Order = require('../models/Order');
const Payment = require('../models/Payment');
const logger = require('../config/logger');

/**
 * Periodically auto-expires stale 'Payment Pending' online orders.
 *
 * Rules:
 *  – Order is older than 15 minutes (was 20 min — tightened for better UX)
 *  – Payment status is still Pending
 *  – The order had no recent retry attempt in the last 5 minutes
 *    (so an actively retrying customer is not expired mid-flow)
 */
const cleanupStaleOrders = async () => {
  try {
    const EXPIRY_MS = 15 * 60 * 1000;        // 15 minutes
    const ACTIVE_GRACE_MS = 5 * 60 * 1000;   // 5-minute grace for recent attempts
    const cutoffDate = new Date(Date.now() - EXPIRY_MS);
    const activeGraceCutoff = new Date(Date.now() - ACTIVE_GRACE_MS);

    const staleOrders = await Order.find({
      status: 'Payment Pending',
      'payment.status': 'Pending',
      createdAt: { $lte: cutoffDate },
      // Skip orders with a very recent attempt (user may be mid-retry)
      $or: [
        { lastAttemptAt: { $exists: false } },
        { lastAttemptAt: null },
        { lastAttemptAt: { $lte: activeGraceCutoff } }
      ]
    });

    if (!staleOrders || staleOrders.length === 0) return;

    logger.info(`[StaleOrderCleanup] Found ${staleOrders.length} stale unpaid order(s) to expire.`);

    for (const order of staleOrders) {
      order.status = 'Expired';
      order.orderStatus = 'Expired';
      order.payment.status = 'Failed';
      order.expiredAt = new Date();
      order.expiredReason = 'Payment timeout (15 minutes inactivity)';

      order.timeline.push({
        status: 'Expired',
        time: new Date(),
        note: 'Order automatically expired after 15 minutes without a completed payment.'
      });

      await order.save();

      // Update associated payment audit documents
      await Payment.updateMany(
        { orderId: order.id, status: 'Pending' },
        { $set: { status: 'Failed', failureReason: 'Payment timeout (15 minutes inactivity)' } }
      );

      logger.info(`[StaleOrderCleanup] Expired stale order ${order.id} (created: ${order.createdAt}).`);
    }
  } catch (error) {
    logger.error(`[StaleOrderCleanup] Error executing stale order expiration worker: ${error.message}`);
  }
};


const initStaleOrderCleanupJob = () => {
  // Run immediately on boot
  cleanupStaleOrders().catch(() => {});

  // Interval check every 2 minutes
  setInterval(() => {
    cleanupStaleOrders().catch(() => {});
  }, 2 * 60 * 1000);

  logger.info('[StaleOrderCleanup] Stale order expiration worker initialized (2-minute interval).');
};

module.exports = {
  cleanupStaleOrders,
  initStaleOrderCleanupJob
};

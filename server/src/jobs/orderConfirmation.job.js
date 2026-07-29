const Order = require('../models/Order');
const LogisticsService = require('../services/logistics/LogisticsService');
const logger = require('../config/logger');

let isRunning = false;

/**
 * Background worker job that runs periodically (every 15 seconds).
 * Automatically transitions orders from 'Pending Confirmation' -> 'Confirmed'
 * once their 5-minute customer cancellation window expires, and triggers
 * Shiprocket fulfillment & AWB generation.
 */
async function processExpiredHoldOrders() {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = new Date();
    // Query orders that are in Pending Confirmation state, paid (or COD), and whose 5-min countdown has passed
    const expiredOrders = await Order.find({
      status: 'Pending Confirmation',
      orderStatus: { $nin: ['Cancelled', 'Refunded', 'Returned', 'Failed'] },
      'payment.status': { $in: ['Paid', 'Captured'] },
      cancellationDeadline: { $lte: now }
    });

    if (expiredOrders.length === 0) {
      isRunning = false;
      return;
    }

    logger.info(`[OrderConfirmationJob] Found ${expiredOrders.length} expired hold order(s) to confirm.`);

    for (const order of expiredOrders) {
      try {
        if (order.status === 'Cancelled' || order.orderStatus === 'Cancelled' || order.payment?.status === 'Refunded') {
          logger.info(`[OrderConfirmationJob] Order #${order.displayId || order.id} is already cancelled/refunded. Skipping auto-confirmation.`);
          continue;
        }

        order.status = 'Confirmed';
        order.orderStatus = 'Confirmed';
        order.fulfilmentStatus = 'Ready to Pack';
        order.confirmedAt = now;

        order.timeline.push({
          status: 'Confirmed',
          time: now,
          note: 'Automatic 5-minute cancellation window ended. Order confirmed for fulfillment.'
        });

        await order.save();
        logger.info(`[OrderConfirmationJob] Order #${order.displayId || order.id} automatically confirmed.`);

        // Attempt Shiprocket shipment creation post-confirmation if pincode is valid
        if (order.address && order.address.pincode) {
          try {
            const shiprocketResult = await LogisticsService.createShipment(order);
            if (shiprocketResult && shiprocketResult.success) {
              order.shipmentCreatedAt = new Date();
              if (shiprocketResult.awbCode) {
                order.awbGeneratedAt = new Date();
                order.trackingNumber = shiprocketResult.awbCode;
              }
              if (shiprocketResult.courierName) {
                order.courierName = shiprocketResult.courierName;
              }
              order.timeline.push({
                status: 'Ready to Ship',
                time: new Date(),
                note: `Shiprocket shipment created. AWB: ${shiprocketResult.awbCode || 'Pending'}`
              });
              await order.save();
            }
          } catch (shipErr) {
            logger.warn(`[OrderConfirmationJob] Shiprocket auto-dispatch skipped/failed for order #${order.id}: ${shipErr.message}`);
          }
        }
      } catch (err) {
        logger.error(`[OrderConfirmationJob] Failed to auto-confirm order #${order.id}: ${err.message}`);
      }
    }
  } catch (error) {
    logger.error(`[OrderConfirmationJob] Error processing hold orders: ${error.message}`);
  } finally {
    isRunning = false;
  }
}

function initOrderConfirmationJob() {
  logger.info('[OrderConfirmationJob] Order auto-confirmation worker initialized (15s interval).');
  setInterval(processExpiredHoldOrders, 15000);
}

module.exports = {
  processExpiredHoldOrders,
  initOrderConfirmationJob
};

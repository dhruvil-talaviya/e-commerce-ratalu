const Order = require('../models/Order');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const StockHistory = require('../models/StockHistory');
const Settings = require('../models/Settings');
const Coupon = require('../models/Coupon');
const AuditLog = require('../models/AuditLog');
const { notifyAdmin, notify } = require('./notify');
const logger = require('../config/logger');

// Helper to update stock levels
const restoreStockLevels = async (items, orderId) => {
  for (const item of items) {
    const { flavorId, packId, quantity } = item;

    // 1. Update Product catalog stock level
    const product = await Product.findOne({ flavorId });
    if (product) {
      const pack = product.packs.find(p => p.id === packId);
      if (pack) {
        pack.stock = pack.stock + quantity;
        await product.save();
      }
    }

    // 2. Update Inventory record
    const inv = await Inventory.findOne({ flavorId, packId });
    if (inv) {
      inv.currentStock = inv.currentStock + quantity;
      await inv.save();
    }

    // 3. Write Stock History movement log
    await StockHistory.create({
      flavorId,
      packId,
      type: 'In',
      quantity,
      referenceId: orderId,
      note: 'Stock restored: order expired (unpaid).'
    });
  }
};

const expireUnpaidOrders = async () => {
  try {
    const settings = await Settings.findOne() || { orderExpirationMinutes: 15 };
    const timeoutMinutes = settings.orderExpirationMinutes || 15;
    const expirationThreshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    /**
     * Unpaid online orders past the timeout — both never-attempted (Pending) and
     * failed-and-abandoned (Payment Failed). A customer can retry a failed order
     * within the window (the order flips to Confirmed then, so it drops out of
     * this sweep); if they never do, its stock is reclaimed here rather than
     * being stranded on a dead order forever.
     */
    const expiredOrders = await Order.find({
      status: { $in: ['Pending', 'Payment Failed'] },
      'payment.method': { $ne: 'COD' },
      createdAt: { $lt: expirationThreshold }
    });

    for (const order of expiredOrders) {
      order.status = 'Expired';
      order.timeline.push({
        status: 'Expired',
        time: new Date(),
        note: `Order expired. Payment was not completed within the configured ${timeoutMinutes}-minute timeout.`
      });
      await order.save();

      // Restore Stock
      await restoreStockLevels(order.items, order.id);

      /**
       * Give the global coupon allowance back. Per-account eligibility already
       * ignores Expired/Failed orders (coupon.service counts live orders only),
       * so this only corrects the store-wide usage counter that was bumped when
       * the order was created.
       */
      if (order.couponCode) {
        await Coupon.updateOne({ code: order.couponCode }, { $inc: { usageCount: -1 } });
      }

      // Notify customer
      if (order.customerId) {
        await notify(order.customerId, {
          title: `Order ${order.displayId || order.id} Expired`,
          message: `Your order ${order.displayId || order.id} has expired because payment was not completed within ${timeoutMinutes} minutes.`,
          type: 'OrderStatus'
        });
      }

      // Notify admin
      await notifyAdmin({
        title: 'Order Expired',
        message: `Order ${order.displayId || order.id} has expired due to payment timeout. Stock restored.`,
        type: 'OrderStatus'
      });

      // Audit Log
      await AuditLog.create({
        user: 'System',
        role: 'System',
        action: `Order #${order.id} automatically expired due to payment timeout (stock restored)`,
        ipAddress: '127.0.0.1'
      });

      logger.info(`Automatically expired unpaid order ${order.id}`);
    }
  } catch (error) {
    logger.error(`Error running expired orders cleanup: ${error.message}`);
  }
};

module.exports = { expireUnpaidOrders };

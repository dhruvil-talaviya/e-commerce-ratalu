const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Order = require('../models/Order');
const logger = require('../config/logger');

const runMigration = async () => {
  try {
    await connectDB();
    logger.info('[Migration] Connected to database. Starting Order Schema Migration...');

    const orders = await Order.find({});
    logger.info(`[Migration] Found ${orders.length} total order(s) to inspect & migrate.`);

    let updatedCount = 0;

    for (const order of orders) {
      let modified = false;

      // 1. Synchronize orderStatus with status
      if (order.status && order.orderStatus !== order.status) {
        order.orderStatus = order.status;
        modified = true;
      }

      // 2. Ensure paymentAttempts array exists
      if (!order.paymentAttempts) {
        order.paymentAttempts = [];
        modified = true;
      }

      // 3. Ensure paymentAttemptsCount exists
      if (order.paymentAttemptsCount === undefined || order.paymentAttemptsCount === null) {
        order.paymentAttemptsCount = order.paymentAttempts.length;
        modified = true;
      }

      // 4. Ensure lastGatewayOrderId exists
      if (order.lastGatewayOrderId === undefined) {
        order.lastGatewayOrderId = order.payment?.gatewayOrderId || '';
        modified = true;
      }

      // 5. Ensure expiredAt and expiredReason exist
      if (order.expiredAt === undefined) {
        order.expiredAt = null;
        modified = true;
      }
      if (order.expiredReason === undefined) {
        order.expiredReason = '';
        modified = true;
      }

      if (modified) {
        await order.save();
        updatedCount++;
      }
    }

    logger.info(`[Migration] Migration complete! Successfully updated ${updatedCount} order(s).`);
    process.exit(0);
  } catch (error) {
    logger.error(`[Migration] Migration error: ${error.message}`);
    process.exit(1);
  }
};

runMigration();

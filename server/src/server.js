const dotenv = require('dotenv');
// Load environment variables first
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5000;

const { expireUnpaidOrders } = require('./utils/orderCleanup');

// Connect to Database
connectDB().then(() => {
  // Expire abandoned unpaid (non-COD) checkouts and restore their stock.
  setInterval(expireUnpaidOrders, 60000);

  /**
   * Order status is NEVER advanced automatically. There used to be a demo
   * simulator (orderStatusSimulator.js) that pushed every live order one step
   * forward every 30 seconds — so a just-placed order marched itself to
   * "Delivered" on its own, and the customer's account showed a fulfilment
   * history that never happened. Every transition is now an explicit admin
   * action through the Orders console.
   */
});

// Start Server
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

const dotenv = require('dotenv');
// Load environment variables first
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5000;

const { expireUnpaidOrders } = require('./utils/orderCleanup');
const { initTrackingSyncJob } = require('./jobs/trackingSync.job');
const { initOrderConfirmationJob } = require('./jobs/orderConfirmation.job');
const { initStaleOrderCleanupJob } = require('./jobs/staleOrderCleanup.job');

// Connect to Database
connectDB().then(() => {
  // Expire abandoned unpaid (non-COD) checkouts and restore their stock.
  setInterval(expireUnpaidOrders, 60000);

  // Initialize Shiprocket tracking sync background job (syncs active shipments every 30 mins)
  initTrackingSyncJob();

  // Initialize 5-minute cancellation hold auto-confirmation worker
  initOrderConfirmationJob();

  // Initialize 20-minute stale unpaid order auto-expiration worker
  initStaleOrderCleanupJob();
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

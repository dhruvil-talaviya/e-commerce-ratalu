const Shipment = require('../models/Shipment');
const LogisticsService = require('../services/logistics/LogisticsService');
const logger = require('../config/logger');

let syncIntervalTimer = null;

/**
 * Perform background synchronization for active in-transit shipments
 */
async function syncActiveShipments() {
  try {
    const activeStatuses = ['Packed', 'Pickup Scheduled', 'Picked Up', 'In Transit', 'Out For Delivery'];
    
    const activeShipments = await Shipment.find({
      status: { $in: activeStatuses },
      awbCode: { $exists: true, $ne: '' }
    }).limit(50); // Process batch of up to 50 active shipments

    if (activeShipments.length === 0) {
      return;
    }

    logger.info(`[Logistics Sync Job] Starting automated tracking sync for ${activeShipments.length} active shipments...`);

    let successCount = 0;
    let failCount = 0;

    for (const shipment of activeShipments) {
      try {
        await LogisticsService.syncTrackingInfo(shipment._id);
        successCount++;
      } catch (err) {
        failCount++;
        logger.error(`[Logistics Sync Job] Failed syncing shipment ${shipment.orderId}: ${err.message}`);
      }
    }

    logger.info(`[Logistics Sync Job] Completed tracking sync. Success: ${successCount}, Failures: ${failCount}`);
  } catch (error) {
    logger.error(`[Logistics Sync Job Error] ${error.message}`);
  }
}

/**
 * Initialize background tracking sync job (runs every 30 minutes)
 */
function initTrackingSyncJob(intervalMs = 30 * 60 * 1000) {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer);
  }

  logger.info(`[Logistics Sync Job] Initialized background tracking sync every ${intervalMs / 60000} minutes.`);
  
  // Run once after 1 minute of server startup
  setTimeout(() => {
    syncActiveShipments();
  }, 60 * 1000);

  // Set recurring timer
  syncIntervalTimer = setInterval(syncActiveShipments, intervalMs);
}

module.exports = {
  syncActiveShipments,
  initTrackingSyncJob
};

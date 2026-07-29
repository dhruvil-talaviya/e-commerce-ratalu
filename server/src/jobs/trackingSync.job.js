const Shipment = require('../models/Shipment');
const LogisticsService = require('../services/logistics/LogisticsService');
const logger = require('../config/logger');

let syncIntervalTimer = null;

/**
 * Perform background synchronization for active in-transit shipments
 */
async function syncActiveShipments() {
  try {
    const activeStatuses = ['Packed', 'Pickup Scheduled', 'Picked Up', 'In Transit', 'Out For Delivery', 'Shipment Created', 'AWB Assigned'];
    const batchSize = 50;
    let skip = 0;
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailures = 0;

    let activeShipments = await Shipment.find({
      status: { $in: activeStatuses },
      awbCode: { $exists: true, $ne: '' }
    }).skip(skip).limit(batchSize);

    if (activeShipments.length === 0) {
      return;
    }

    logger.info(`[Logistics Sync Job] Starting automated tracking sync for active shipments...`);

    while (activeShipments.length > 0) {
      for (const shipment of activeShipments) {
        totalProcessed++;
        try {
          await LogisticsService.syncTrackingInfo(shipment._id);
          totalSuccess++;
        } catch (err) {
          totalFailures++;
          logger.error(`[Logistics Sync Job] Failed syncing shipment ${shipment.orderId}: ${err.message}`);
        }
      }

      skip += batchSize;
      activeShipments = await Shipment.find({
        status: { $in: activeStatuses },
        awbCode: { $exists: true, $ne: '' }
      }).skip(skip).limit(batchSize);
    }

    logger.info(`[Logistics Sync Job] Completed batch tracking sync. Total Processed: ${totalProcessed}, Success: ${totalSuccess}, Failures: ${totalFailures}`);
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

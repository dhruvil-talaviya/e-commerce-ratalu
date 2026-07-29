const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  connectShiprocket,
  disconnectShiprocket,
  refreshToken,
  testConnection,
  getPickupLocations,
  createPickupLocation,
  updatePickupLocation,
  deletePickupLocation,
  setDefaultPickupLocation,
  getShipments,
  createShipment,
  generateAWB,
  schedulePickup,
  downloadDocument,
  trackShipment,
  cancelShipment,
  retryShipment,
  checkServiceability,
  publicTrackShipment,
  shiprocketWebhook,
  getDashboardStats
} = require('../controllers/logistics.controller');

const { protect, authorize } = require('../middlewares/auth');
const adminOnly = [protect, authorize('admin')];

const { handleShiprocketWebhook } = require('../controllers/logistics.controller');

// ─── Public Routes ──────────────────────────────────────────────────────────
router.post('/logistics/check-serviceability', checkServiceability);
router.get('/logistics/track/:identifier', publicTrackShipment);
router.post('/logistics/webhook', handleShiprocketWebhook);
router.post('/logistics/webhook/shiprocket', handleShiprocketWebhook);

// ─── Admin Settings & Credentials Routes ────────────────────────────────────
router.get('/admin/logistics/settings', ...adminOnly, getSettings);
router.put('/admin/logistics/settings', ...adminOnly, updateSettings);
router.post('/admin/logistics/connect', ...adminOnly, connectShiprocket);
router.post('/admin/logistics/disconnect', ...adminOnly, disconnectShiprocket);
router.post('/admin/logistics/refresh-token', ...adminOnly, refreshToken);
router.post('/admin/logistics/test-connection', ...adminOnly, testConnection);

// ─── Admin Pickup Location Routes ───────────────────────────────────────────
router.get('/admin/logistics/pickup-locations', ...adminOnly, getPickupLocations);
router.post('/admin/logistics/pickup-locations', ...adminOnly, createPickupLocation);
router.put('/admin/logistics/pickup-locations/:locationId', ...adminOnly, updatePickupLocation);
router.delete('/admin/logistics/pickup-locations/:locationId', ...adminOnly, deletePickupLocation);
router.post('/admin/logistics/pickup-locations/:locationId/primary', ...adminOnly, setDefaultPickupLocation);

// ─── Admin Shipment Management Routes ──────────────────────────────────────
router.get('/admin/logistics/dashboard', ...adminOnly, getDashboardStats);
router.get('/admin/logistics/shipments', ...adminOnly, getShipments);
router.post('/admin/logistics/shipments/create', ...adminOnly, createShipment);
router.post('/admin/logistics/shipments/:id/awb', ...adminOnly, generateAWB);
router.post('/admin/logistics/shipments/:id/pickup', ...adminOnly, schedulePickup);
router.get('/admin/logistics/shipments/:id/document', ...adminOnly, downloadDocument);
router.get('/admin/logistics/shipments/:id/track', ...adminOnly, trackShipment);
router.post('/admin/logistics/shipments/:id/cancel', ...adminOnly, cancelShipment);
router.post('/admin/logistics/shipments/:id/retry', ...adminOnly, retryShipment);

module.exports = router;

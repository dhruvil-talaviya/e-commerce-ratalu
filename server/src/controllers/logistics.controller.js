const LogisticsService = require('../services/logistics/LogisticsService');
const LogisticsSettings = require('../models/LogisticsSettings');
const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');
const { encrypt } = require('../utils/crypto');
const logger = require('../config/logger');

// @desc    Get Logistics Settings
// @route   GET /api/v1/admin/logistics/settings
// @access  Private (Admin)
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await LogisticsService.getSettings();
    // Do not return encrypted password to frontend for security
    const sanitizedSettings = settings.toObject();
    if (sanitizedSettings.shiprocket) {
      delete sanitizedSettings.shiprocket.encryptedPassword;
      sanitizedSettings.shiprocket.hasPassword = !!settings.shiprocket.encryptedPassword;
    }
    sendResponse(res, 200, { success: true, data: sanitizedSettings });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Logistics Settings
// @route   PUT /api/v1/admin/logistics/settings
// @access  Private (Admin)
exports.updateSettings = async (req, res, next) => {
  try {
    const settings = await LogisticsService.getSettings();
    const { defaults, courierPreferences, activeProvider } = req.body;

    if (defaults) {
      settings.defaults = { ...settings.defaults.toObject(), ...defaults };
    }
    if (courierPreferences) {
      settings.courierPreferences = { ...settings.courierPreferences.toObject(), ...courierPreferences };
    }
    if (activeProvider) {
      settings.activeProvider = activeProvider;
    }

    await settings.save();

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role,
      action: 'Updated logistics configuration and shipping defaults',
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, { success: true, message: 'Settings updated successfully', data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Connect / Save Credentials
// @route   POST /api/v1/admin/logistics/connect
// @access  Private (Admin)
exports.connectShiprocket = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ErrorResponse('Please provide both API Email and API Password', 400));
    }

    const provider = LogisticsService.getProvider('shiprocket');
    const authResult = await provider.authenticate({ email, password });

    const settings = await LogisticsService.getSettings();
    settings.shiprocket.enabled = true;
    settings.shiprocket.apiEmail = email;
    settings.shiprocket.encryptedPassword = encrypt(password);
    settings.shiprocket.token = authResult.token;
    settings.shiprocket.tokenExpiresAt = authResult.expiresAt;
    settings.shiprocket.connectionStatus = 'connected';
    settings.shiprocket.lastTestedAt = new Date();
    settings.shiprocket.lastError = '';

    // Automatically sync pickup locations from Shiprocket
    try {
      const locations = await provider.getPickupLocations(authResult.token);
      if (locations && locations.length > 0) {
        settings.pickupLocations = locations.map((loc, idx) => ({
          ...loc,
          isDefault: idx === 0
        }));
      }
    } catch (locErr) {
      logger.warn(`Failed to sync pickup locations on connect: ${locErr.message}`);
    }

    await settings.save();

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role,
      action: 'Connected Shiprocket account and updated credentials',
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, {
      success: true,
      message: 'Shiprocket connected successfully!',
      connectionStatus: 'connected',
      tokenExpiresAt: authResult.expiresAt
    });
  } catch (error) {
    const settings = await LogisticsService.getSettings();
    settings.shiprocket.connectionStatus = 'failed';
    settings.shiprocket.lastError = error.message;
    await settings.save();
    next(new ErrorResponse(`Shiprocket Connection Failed: ${error.message}`, 400));
  }
};

// @desc    Disconnect Shiprocket
// @route   POST /api/v1/admin/logistics/disconnect
// @access  Private (Admin)
exports.disconnectShiprocket = async (req, res, next) => {
  try {
    const settings = await LogisticsService.getSettings();
    settings.shiprocket.enabled = false;
    settings.shiprocket.token = '';
    settings.shiprocket.tokenExpiresAt = null;
    settings.shiprocket.connectionStatus = 'disconnected';
    await settings.save();

    await AuditLog.create({
      user: req.user.username || 'Admin',
      role: req.user.role,
      action: 'Disconnected Shiprocket account',
      ipAddress: req.ip || '127.0.0.1'
    });

    sendResponse(res, 200, { success: true, message: 'Shiprocket disconnected successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh Token
// @route   POST /api/v1/admin/logistics/refresh-token
// @access  Private (Admin)
exports.refreshToken = async (req, res, next) => {
  try {
    const token = await LogisticsService.getAuthToken('shiprocket');
    const settings = await LogisticsService.getSettings();
    sendResponse(res, 200, {
      success: true,
      message: 'Token refreshed successfully',
      tokenExpiresAt: settings.shiprocket.tokenExpiresAt
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test Connection
// @route   POST /api/v1/admin/logistics/test-connection
// @access  Private (Admin)
exports.testConnection = async (req, res, next) => {
  try {
    const settings = await LogisticsService.getSettings();
    const token = await LogisticsService.getAuthToken('shiprocket');
    const provider = LogisticsService.getProvider('shiprocket');
    const locations = await provider.getPickupLocations(token);

    settings.shiprocket.connectionStatus = 'connected';
    settings.shiprocket.lastTestedAt = new Date();
    settings.shiprocket.lastError = '';
    await settings.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Connection test successful!',
      locationsCount: locations.length,
      lastTestedAt: settings.shiprocket.lastTestedAt
    });
  } catch (error) {
    next(new ErrorResponse(`Connection test failed: ${error.message}`, 400));
  }
};

// @desc    Get Pickup Locations
// @route   GET /api/v1/admin/logistics/pickup-locations
// @access  Private (Admin)
exports.getPickupLocations = async (req, res, next) => {
  try {
    const settings = await LogisticsService.getSettings();
    sendResponse(res, 200, { success: true, data: settings.pickupLocations });
  } catch (error) {
    next(error);
  }
};

// @desc    Create / Add Pickup Location
// @route   POST /api/v1/admin/logistics/pickup-locations
// @access  Private (Admin)
exports.createPickupLocation = async (req, res, next) => {
  try {
    const settings = await LogisticsService.getSettings();
    const token = await LogisticsService.getAuthToken('shiprocket');
    const provider = LogisticsService.getProvider('shiprocket');

    // Register location with Shiprocket API
    await provider.createPickupLocation(token, req.body);

    const isFirst = settings.pickupLocations.length === 0;
    const newLocation = {
      ...req.body,
      isDefault: req.body.isDefault || isFirst
    };

    settings.pickupLocations.push(newLocation);
    await settings.save();

    sendResponse(res, 201, { success: true, message: 'Pickup location created successfully', data: settings.pickupLocations });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Pickup Location
// @route   PUT /api/v1/admin/logistics/pickup-locations/:locationId
// @access  Private (Admin)
exports.updatePickupLocation = async (req, res, next) => {
  try {
    const settings = await LogisticsService.getSettings();
    const locIndex = settings.pickupLocations.findIndex(l => l._id.toString() === req.params.locationId);

    if (locIndex === -1) {
      return next(new ErrorResponse('Pickup location not found', 404));
    }

    settings.pickupLocations[locIndex] = {
      ...settings.pickupLocations[locIndex].toObject(),
      ...req.body
    };

    if (req.body.isDefault) {
      settings.pickupLocations.forEach((l, idx) => {
        l.isDefault = idx === locIndex;
      });
    }

    await settings.save();
    sendResponse(res, 200, { success: true, message: 'Pickup location updated', data: settings.pickupLocations });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Pickup Location
// @route   DELETE /api/v1/admin/logistics/pickup-locations/:locationId
// @access  Private (Admin)
exports.deletePickupLocation = async (req, res, next) => {
  try {
    const settings = await LogisticsService.getSettings();
    settings.pickupLocations = settings.pickupLocations.filter(l => l._id.toString() !== req.params.locationId);
    await settings.save();
    sendResponse(res, 200, { success: true, message: 'Pickup location deleted', data: settings.pickupLocations });
  } catch (error) {
    next(error);
  }
};

// @desc    Set Default Pickup Location
// @route   POST /api/v1/admin/logistics/pickup-locations/:locationId/primary
// @access  Private (Admin)
exports.setDefaultPickupLocation = async (req, res, next) => {
  try {
    const settings = await LogisticsService.getSettings();
    settings.pickupLocations.forEach(l => {
      l.isDefault = l._id.toString() === req.params.locationId;
    });
    await settings.save();
    sendResponse(res, 200, { success: true, message: 'Default pickup location updated', data: settings.pickupLocations });
  } catch (error) {
    next(error);
  }
};

// @desc    List All Shipments
// @route   GET /api/v1/admin/logistics/shipments
// @access  Private (Admin)
exports.getShipments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) {
      query.$or = [
        { orderId: { $regex: req.query.search, $options: 'i' } },
        { awbCode: { $regex: req.query.search, $options: 'i' } },
        { courierName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const total = await Shipment.countDocuments(query);
    const shipments = await Shipment.find(query)
      .populate('order', 'userName userPhone totals payment address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    sendResponse(res, 200, {
      success: true,
      count: shipments.length,
      pagination: { page, limit, totalPages: Math.ceil(total / limit), total },
      data: shipments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Shipment for Order
// @route   POST /api/v1/admin/logistics/shipments/create
// @access  Private (Admin)
exports.createShipment = async (req, res, next) => {
  try {
    const { orderId, courierId, weight, length, breadth, height, forceRecreate } = req.body;
    if (!orderId) return next(new ErrorResponse('orderId is required', 400));

    const options = {
      selectedCourierId: courierId,
      customWeightKg: weight,
      dimensions: (length && breadth && height) ? { length: Number(length), breadth: Number(breadth), height: Number(height) } : undefined,
      forceRecreate: !!forceRecreate
    };

    const shipment = await LogisticsService.processOrderPostPayment(orderId, options);
    sendResponse(res, 201, { success: true, message: 'Shipment created successfully', data: shipment });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AWB
// @route   POST /api/v1/admin/logistics/shipments/:id/awb
// @access  Private (Admin)
exports.generateAWB = async (req, res, next) => {
  try {
    const { courierId } = req.body;
    const shipment = await LogisticsService.generateAWBForShipment(req.params.id, courierId);
    sendResponse(res, 200, { success: true, message: 'AWB generated successfully', data: shipment });
  } catch (error) {
    next(error);
  }
};

// @desc    Schedule Pickup
// @route   POST /api/v1/admin/logistics/shipments/:id/pickup
// @access  Private (Admin)
exports.schedulePickup = async (req, res, next) => {
  try {
    const { pickupDate } = req.body;
    const shipment = await LogisticsService.schedulePickupForShipment(req.params.id, pickupDate);
    sendResponse(res, 200, { success: true, message: 'Pickup scheduled successfully', data: shipment });
  } catch (error) {
    next(error);
  }
};

// @desc    Download Document (Label / Manifest / Invoice)
// @route   GET /api/v1/admin/logistics/shipments/:id/document
// @access  Private (Admin)
exports.downloadDocument = async (req, res, next) => {
  try {
    const { type } = req.query; // 'label' | 'manifest' | 'invoice'
    if (!type) return next(new ErrorResponse('Document type (label, manifest, invoice) is required', 400));

    const url = await LogisticsService.generateDocument(req.params.id, type);
    sendResponse(res, 200, { success: true, data: { url, type } });
  } catch (error) {
    next(error);
  }
};

// @desc    Track Shipment
// @route   GET /api/v1/admin/logistics/shipments/:id/track
// @access  Private (Admin)
exports.trackShipment = async (req, res, next) => {
  try {
    const shipment = await LogisticsService.syncTrackingInfo(req.params.id);
    sendResponse(res, 200, { success: true, data: shipment });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel Shipment
// @route   POST /api/v1/admin/logistics/shipments/:id/cancel
// @access  Private (Admin)
exports.cancelShipment = async (req, res, next) => {
  try {
    const shipment = await LogisticsService.cancelShipment(req.params.id);
    sendResponse(res, 200, { success: true, message: 'Shipment cancelled', data: shipment });
  } catch (error) {
    next(error);
  }
};

// @desc    Retry Failed Shipment
// @route   POST /api/v1/admin/logistics/shipments/:id/retry
// @access  Private (Admin)
exports.retryShipment = async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return next(new ErrorResponse('Shipment not found', 404));

    const updated = await LogisticsService.processOrderPostPayment(shipment.order);
    sendResponse(res, 200, { success: true, message: 'Shipment retried successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Check Serviceability & Rates (Public / Checkout & Admin)
// @route   POST /api/v1/logistics/check-serviceability
// @access  Public
exports.checkServiceability = async (req, res, next) => {
  try {
    let { deliveryPincode, weight, cod, pickupPincode, orderId, length, breadth, height } = req.body;

    if (orderId && !deliveryPincode) {
      const order = await Order.findById(orderId) || await Order.findOne({ id: orderId });
      if (order) {
        deliveryPincode = order.address?.pincode;
        if (cod === undefined) {
          cod = order.payment?.method === 'COD';
        }
        if (!weight && Array.isArray(order.items)) {
          const totalGrams = order.items.reduce((sum, item) => sum + ((item.grams || 100) * (item.quantity || 1)), 0);
          weight = Math.max(0.5, Number(((totalGrams + 100) / 1000).toFixed(2)));
        }
      }
    }

    if (!deliveryPincode) return next(new ErrorResponse('deliveryPincode is required', 400));

    const result = await LogisticsService.checkServiceability({
      pickupPincode,
      deliveryPincode,
      weight,
      cod,
      length,
      breadth,
      height
    });

    if (result.couriers && result.couriers.length > 0) {
      const sortedByRate = [...result.couriers].sort((a, b) => (a.rate || 0) - (b.rate || 0));
      const sortedByEtd = [...result.couriers].sort((a, b) => (a.estimatedDeliveryDays || 99) - (b.estimatedDeliveryDays || 99));

      const cheapestId = sortedByRate[0]?.courierCompanyId;
      const fastestId = sortedByEtd[0]?.courierCompanyId;

      result.couriers = result.couriers.map(c => ({
        ...c,
        isCheapest: c.courierCompanyId === cheapestId,
        isFastest: c.courierCompanyId === fastestId
      }));
    }

    sendResponse(res, 200, { success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Customer Order Tracking (Public)
// @route   GET /api/v1/logistics/track/:identifier
// @access  Public
exports.publicTrackShipment = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const shipment = await LogisticsService.syncTrackingInfo(identifier);
    const order = await Order.findById(shipment.order);

    sendResponse(res, 200, {
      success: true,
      data: {
        orderId: shipment.orderId,
        orderStatus: order?.status || shipment.status,
        paymentStatus: order?.payment?.status || 'Paid',
        courierName: shipment.courierName,
        awbCode: shipment.awbCode,
        shipmentStatus: shipment.status,
        estimatedDelivery: shipment.estimatedDelivery,
        currentLocation: shipment.currentLocation,
        deliveryAttempts: shipment.deliveryAttempts,
        deliveredDate: shipment.deliveredDate,
        trackingUrl: shipment.trackingUrl,
        timeline: shipment.trackingHistory
      }
    });
  } catch (error) {
    next(new ErrorResponse(`Tracking details unavailable: ${error.message}`, 404));
  }
};

// @desc    Shiprocket Webhook Receiver
// @route   POST /api/v1/logistics/webhook/shiprocket
// @access  Public
exports.shiprocketWebhook = async (req, res, next) => {
  try {
    const result = await LogisticsService.processWebhook(req.body);
    sendResponse(res, 200, { success: true, result });
  } catch (error) {
    logger.error(`Webhook processing error: ${error.message}`);
    sendResponse(res, 200, { success: false, error: error.message });
  }
};

// @desc    Logistics Dashboard Analytics & Widgets
// @route   GET /api/v1/admin/logistics/dashboard
// @access  Private (Admin)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      todaysShipments,
      pendingPickups,
      inTransit,
      delivered,
      cancelled,
      rto,
      courierPerformanceRaw
    ] = await Promise.all([
      Shipment.countDocuments({ createdAt: { $gte: todayStart } }),
      Shipment.countDocuments({ status: { $in: ['Packed', 'Pickup Scheduled'] } }),
      Shipment.countDocuments({ status: { $in: ['Picked Up', 'In Transit', 'Out For Delivery'] } }),
      Shipment.countDocuments({ status: 'Delivered' }),
      Shipment.countDocuments({ status: 'Cancelled' }),
      Shipment.countDocuments({ status: 'RTO' }),
      Shipment.aggregate([
        { $match: { courierName: { $exists: true, $ne: '' } } },
        {
          $group: {
            _id: '$courierName',
            totalShipments: { $sum: 1 },
            deliveredCount: {
              $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] }
            },
            totalFreightCost: { $sum: '$freightCharge' }
          }
        }
      ])
    ]);

    const totalFinished = delivered + rto + cancelled;
    const deliverySuccessRate = totalFinished > 0 ? ((delivered / (delivered + rto)) * 100).toFixed(1) : 100;

    const courierPerformance = courierPerformanceRaw.map(c => ({
      courierName: c._id,
      totalShipments: c.totalShipments,
      deliveredCount: c.deliveredCount,
      successRate: c.totalShipments > 0 ? ((c.deliveredCount / c.totalShipments) * 100).toFixed(1) : 0,
      totalFreightCost: c.totalFreightCost
    }));

    sendResponse(res, 200, {
      success: true,
      data: {
        widgets: {
          todaysShipments,
          pendingPickups,
          inTransit,
          delivered,
          cancelled,
          rto,
          deliverySuccessRate: `${deliverySuccessRate}%`
        },
        courierPerformance
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Handle real-time webhook push updates from Shiprocket
// @route   POST /api/v1/logistics/webhook
// @access  Public (Secured by Token & Payload Validation)
exports.handleShiprocketWebhook = async (req, res, next) => {
  try {
    const secret = process.env.SHIPROCKET_WEBHOOK_TOKEN;
    const incomingToken = req.headers['x-api-key'] || req.headers['x-shiprocket-token'];

    // 1. Optional Webhook Token Verification
    if (secret && incomingToken && secret !== incomingToken) {
      logger.warn('[Shiprocket Webhook Security] Invalid webhook token headers.');
      return sendResponse(res, 401, { success: false, message: 'Invalid webhook security token' });
    }

    const payload = req.body || {};
    const awb = payload.awb || payload.awb_code;
    const shipmentId = payload.shipment_id || payload.order_id;
    const currentStatus = (payload.current_status || payload.status || '').toString().trim();
    const currentLocation = payload.location || payload.current_location || payload.scans?.[0]?.location || '';
    const etd = payload.etd;

    if (!awb && !shipmentId) {
      logger.warn('[Shiprocket Webhook] Payload missing both AWB and Shipment ID.');
      return sendResponse(res, 200, { success: true, message: 'Payload missing tracking identifiers' });
    }

    let shipment = null;
    if (awb) {
      shipment = await Shipment.findOne({ awbCode: awb });
    }
    if (!shipment && shipmentId) {
      shipment = await Shipment.findOne({ $or: [{ shiprocketShipmentId: shipmentId }, { shiprocketOrderId: shipmentId }] });
    }

    if (!shipment) {
      logger.warn(`[Shiprocket Webhook] Shipment not found for AWB: ${awb}, Shipment ID: ${shipmentId}`);
      return sendResponse(res, 200, { success: true, message: 'Shipment record not found in database' });
    }

    // 2. Comprehensive Shiprocket Status Dictionary
    const SHIPROCKET_STATUS_MAP = {
      'NEW': 'Confirmed',
      'AWB ASSIGNED': 'Confirmed',
      'LABEL GENERATED': 'Packed',
      'MANIFEST GENERATED': 'Packed',
      'PICKUP QUEUED': 'Pickup Scheduled',
      'PICKUP GENERATED': 'Pickup Scheduled',
      'PICKUP SCHEDULED': 'Pickup Scheduled',
      'PICKED UP': 'Picked Up',
      'IN TRANSIT': 'In Transit',
      'REACHED AT DESTINATION HUB': 'In Transit',
      'OUT FOR DELIVERY': 'Out For Delivery',
      'DELIVERED': 'Delivered',
      'CANCELED': 'Cancelled',
      'CANCELLED': 'Cancelled',
      'RTO INITIATED': 'RTO',
      'RTO DELIVERED': 'RTO',
      'UNDELIVERED': 'Exception'
    };

    const statusUpper = currentStatus.toUpperCase();
    let mappedStatus = SHIPROCKET_STATUS_MAP[statusUpper];

    // Substring fallback for unknown status strings
    if (!mappedStatus) {
      if (statusUpper.includes('DELIVERED')) mappedStatus = 'Delivered';
      else if (statusUpper.includes('OUT FOR DELIVERY')) mappedStatus = 'Out For Delivery';
      else if (statusUpper.includes('TRANSIT') || statusUpper.includes('SHIPPED') || statusUpper.includes('HUB')) mappedStatus = 'In Transit';
      else if (statusUpper.includes('PICKED UP')) mappedStatus = 'Picked Up';
      else if (statusUpper.includes('PICKUP')) mappedStatus = 'Pickup Scheduled';
      else if (statusUpper.includes('RTO') || statusUpper.includes('RETURN')) mappedStatus = 'RTO';
      else if (statusUpper.includes('CANCEL')) mappedStatus = 'Cancelled';
      else {
        mappedStatus = shipment.status; // Preserved
        logger.warn(`[Shiprocket Webhook] Unrecognized status: "${currentStatus}". Preserving current shipment status: "${shipment.status}".`);
      }
    }

    // 3. Raw Payload Auditing
    shipment.apiLogs.push({
      action: 'shiprocket_webhook_received',
      request: { headers: req.headers, query: req.query },
      response: payload,
      status: 'success',
      timestamp: new Date()
    });

    const isStatusChanged = shipment.status !== mappedStatus;
    shipment.status = mappedStatus;
    shipment.providerStatus = currentStatus || mappedStatus;
    if (currentLocation) shipment.currentLocation = currentLocation;
    if (etd) shipment.estimatedDelivery = new Date(etd);
    shipment.lastSyncedAt = new Date();

    // 4. Duplicate Guard: Appends to trackingHistory only if new event or status changed
    const lastHistory = shipment.trackingHistory[shipment.trackingHistory.length - 1];
    if (!lastHistory || lastHistory.status !== mappedStatus || lastHistory.activity !== currentStatus) {
      shipment.trackingHistory.push({
        status: mappedStatus,
        activity: currentStatus || 'Shiprocket Webhook Update',
        location: currentLocation,
        date: new Date(),
        rawData: { provider: 'Shiprocket', receivedAt: new Date(), payload }
      });
    }

    await shipment.save();

    // 5. Parent Order Status Synchronization
    const order = await Order.findById(shipment.order);
    if (order && isStatusChanged) {
      if (mappedStatus === 'Delivered' && order.status !== 'Delivered' && order.status !== 'Completed') {
        order.status = 'Completed';
        order.orderStatus = 'Completed';
        order.deliveredAt = new Date();
        order.timeline.push({ status: 'Delivered', time: new Date(), note: `Delivered via ${shipment.courierName || 'Courier'} (AWB: ${shipment.awbCode}).` });
        await order.save();
      } else if (mappedStatus === 'Out For Delivery' && order.status !== 'Out for Delivery') {
        order.status = 'Out for Delivery';
        order.orderStatus = 'Out for Delivery';
        order.timeline.push({ status: 'Out for Delivery', time: new Date(), note: 'Out for delivery.' });
        await order.save();
      } else if ((mappedStatus === 'In Transit' || mappedStatus === 'Picked Up') && order.status !== 'Shipped') {
        order.status = 'Shipped';
        order.orderStatus = 'Shipped';
        order.shippedAt = new Date();
        order.timeline.push({ status: 'Shipped', time: new Date(), note: `In transit via ${shipment.courierName || 'Courier'}.` });
        await order.save();
      }
    }

    logger.info(`[Shiprocket Webhook] Successfully processed webhook for shipment ${shipment.orderId} -> Status: ${mappedStatus}`);
    sendResponse(res, 200, { success: true, message: 'Shiprocket webhook processed successfully' });
  } catch (error) {
    logger.error(`[Shiprocket Webhook Exception] ${error.message}`);
    sendResponse(res, 200, { success: true, message: 'Webhook error handled safely' });
  }
};

// @desc    Get Logistics Dashboard KPIs & Analytics Metrics
// @route   GET /api/v1/admin/logistics/kpis
// @access  Private (Admin)
exports.getLogisticsKPIs = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalCount,
      todayCount,
      pendingPickupCount,
      delayedCount,
      rtoCount,
      deliveredCount,
      cancelledCount,
      failedCount,
      shipmentsList
    ] = await Promise.all([
      Shipment.countDocuments({}),
      Shipment.countDocuments({ createdAt: { $gte: todayStart } }),
      Shipment.countDocuments({ status: { $in: ['Pickup Scheduled', 'AWB Assigned', 'Confirmed'] } }),
      Shipment.countDocuments({ status: 'In Transit', estimatedDelivery: { $lt: new Date() } }),
      Shipment.countDocuments({ status: { $in: ['RTO', 'RTO In Transit', 'RTO Delivered'] } }),
      Shipment.countDocuments({ status: 'Delivered' }),
      Shipment.countDocuments({ status: 'Cancelled' }),
      Shipment.countDocuments({ status: { $in: ['Failed', 'Pending Retry'] } }),
      Shipment.find({ status: 'Delivered', deliveredDate: { $ne: null } }).select('createdAt deliveredDate freightCharge').lean()
    ]);

    const totalCalculable = totalCount || 1;
    const rtoPercent = Math.round((rtoCount / totalCalculable) * 100);
    const deliveredPercent = Math.round((deliveredCount / totalCalculable) * 100);
    const cancelledPercent = Math.round((cancelledCount / totalCalculable) * 100);
    const codPercent = 0; // COD currently disabled

    let totalFreight = 0;
    let totalDeliveryTimeMs = 0;
    let deliveredWithDateCount = 0;

    for (const s of shipmentsList) {
      if (s.freightCharge) totalFreight += s.freightCharge;
      if (s.createdAt && s.deliveredDate) {
        totalDeliveryTimeMs += (new Date(s.deliveredDate).getTime() - new Date(s.createdAt).getTime());
        deliveredWithDateCount++;
      }
    }

    const avgShippingCost = shipmentsList.length ? Math.round(totalFreight / shipmentsList.length) : 55;
    const avgDeliveryTimeDays = deliveredWithDateCount ? Math.round((totalDeliveryTimeMs / deliveredWithDateCount / (1000 * 3600 * 24)) * 10) / 10 : 3.2;

    sendResponse(res, 200, {
      success: true,
      data: {
        todaysShipments: todayCount,
        pendingPickup: pendingPickupCount,
        delayedOrders: delayedCount,
        avgDeliveryTimeDays,
        avgShippingCost,
        rtoPercent,
        deliveredPercent,
        cancelledPercent,
        codPercent,
        failedQueueCount: failedCount,
        totalShipments: totalCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Courier Performance Analytics
// @route   GET /api/v1/admin/logistics/courier-analytics
// @access  Private (Admin)
exports.getCourierAnalytics = async (req, res, next) => {
  try {
    const analytics = await Shipment.aggregate([
      { $match: { courierName: { $ne: null, $ne: '' } } },
      {
        $group: {
          _id: '$courierName',
          courierId: { $first: '$courierCompanyId' },
          totalShipments: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] } },
          rto: { $sum: { $cond: [{ $in: ['$status', ['RTO', 'RTO In Transit', 'RTO Delivered']] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'Failed'] }, 1, 0] } },
          avgCost: { $avg: '$freightCharge' },
          avgRating: { $avg: '$courierRating' }
        }
      },
      { $sort: { totalShipments: -1 } }
    ]);

    const formatted = analytics.map(c => ({
      courierName: c._id,
      courierId: c.courierId,
      totalShipments: c.totalShipments,
      deliveredPercent: Math.round((c.delivered / c.totalShipments) * 100) || 0,
      rtoPercent: Math.round((c.rto / c.totalShipments) * 100) || 0,
      avgCost: Math.round(c.avgCost || 0),
      avgRating: c.avgRating ? Math.round(c.avgRating * 10) / 10 : 4.5
    }));

    sendResponse(res, 200, { success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Retry Pending/Failed Shipment Queue
// @route   POST /api/v1/admin/logistics/retry-queue
// @access  Private (Admin)
exports.retryFailedQueue = async (req, res, next) => {
  try {
    const result = await LogisticsService.processRetryQueue();
    sendResponse(res, 200, {
      success: true,
      message: `Processed ${result.processed} queued shipment(s). ${result.succeeded} retried successfully.`
    });
  } catch (error) {
    next(error);
  }
};

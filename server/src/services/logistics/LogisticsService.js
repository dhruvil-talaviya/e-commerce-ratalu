const mongoose = require('mongoose');
const LogisticsSettings = require('../../models/LogisticsSettings');
const Shipment = require('../../models/Shipment');
const Order = require('../../models/Order');
const TrackingEvent = require('../../models/TrackingEvent');
const PickupRequest = require('../../models/PickupRequest');
const ShippingLabel = require('../../models/ShippingLabel');
const Manifest = require('../../models/Manifest');
const ShiprocketProvider = require('./ShiprocketProvider');
const { decrypt } = require('../../utils/crypto');
const { notifyOrderStatus, notifyAdmin } = require('../../utils/notify');
const logger = require('../../config/logger');

class LogisticsService {
  constructor() {
    this.providers = {
      shiprocket: new ShiprocketProvider()
    };
  }

  /**
   * Get settings document or create default if not exists
   */
  async getSettings() {
    let settings = await LogisticsSettings.findOne();
    if (!settings) {
      settings = await LogisticsSettings.create({
        activeProvider: 'shiprocket',
        shiprocket: {
          enabled: true,
          connectionStatus: 'unconfigured'
        },
        defaults: {
          weight: 0.5,
          length: 15,
          breadth: 15,
          height: 10,
          insuranceToggle: false,
          codToggle: true,
          autoGenerateAWB: true,
          autoSchedulePickup: true,
          autoGenerateLabel: true,
          defaultPickupLocation: 'Primary Warehouse'
        },
        courierPreferences: {
          selectionMode: 'auto'
        },
        pickupLocations: []
      });
    }
    return settings;
  }

  /**
   * Get active provider instance
   */
  getProvider(providerName = 'shiprocket') {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Logistics provider "${providerName}" is not supported`);
    }
    return provider;
  }

  /**
   * Sync pickup locations from active logistics provider (Shiprocket) into DB settings
   */
  async syncPickupLocations(providerName = 'shiprocket') {
    const settings = await this.getSettings();
    const token = await this.getAuthToken(providerName);
    const provider = this.getProvider(providerName);

    const locations = await provider.getPickupLocations(token);

    if (Array.isArray(locations)) {
      settings.pickupLocations = locations.map((loc, idx) => ({
        pickupLocation: loc.pickupLocation,
        name: loc.name,
        email: loc.email,
        phone: loc.phone,
        address: loc.address,
        address2: loc.address2 || '',
        city: loc.city,
        state: loc.state,
        country: loc.country || 'India',
        pinCode: loc.pinCode,
        shiprocketLocationId: loc.shiprocketLocationId,
        isDefault: idx === 0
      }));
      await settings.save();
    }

    return locations || [];
  }

  /**
   * Securely retrieve valid authorization token for active provider
   */
  async getAuthToken(providerName = 'shiprocket') {
    const settings = await this.getSettings();
    const config = settings[providerName];

    if (!config || !config.enabled) {
      throw new Error(`Provider ${providerName} is disabled or not configured.`);
    }

    // Check if token exists and is valid for at least another 1 hour
    const bufferTime = 60 * 60 * 1000;
    if (config.token && config.tokenExpiresAt && new Date(config.tokenExpiresAt).getTime() - bufferTime > Date.now()) {
      return config.token;
    }

    // If token expired or missing, auto-reauthenticate using decrypted credentials
    if (!config.apiEmail || !config.encryptedPassword) {
      throw new Error(`Shiprocket API credentials are missing. Please configure them in Logistics Settings.`);
    }

    const decryptedPassword = decrypt(config.encryptedPassword);
    const provider = this.getProvider(providerName);

    logger.info(`[LogisticsService] Refreshing ${providerName} API token...`);
    const auth = await provider.authenticate({
      email: config.apiEmail,
      password: decryptedPassword
    });

    // Update settings with refreshed token
    settings[providerName].token = auth.token;
    settings[providerName].tokenExpiresAt = auth.expiresAt;
    settings[providerName].connectionStatus = 'connected';
    settings[providerName].lastTestedAt = new Date();
    settings[providerName].lastError = '';
    await settings.save();

    return auth.token;
  }

  /**
   * Check Serviceability & Shipping Rates for checkout / order creation
   */
  async checkServiceability({ pickupPincode, deliveryPincode, weight, cod, length, breadth, height }) {
    try {
      const settings = await this.getSettings();
      if (!settings.shiprocket?.enabled && !settings.activeProvider) {
        return { serviceable: true, rates: [], message: 'Standard shipping available' };
      }
      const token = await this.getAuthToken(settings.activeProvider);
      const provider = this.getProvider(settings.activeProvider);

      const defaultPickup = settings.pickupLocations.find(l => l.isDefault) || settings.pickupLocations[0];
      const sourcePincode = pickupPincode || defaultPickup?.pinCode || '395006'; // Default warehouse pincode fallback

      const result = await provider.checkServiceability(token, {
        pickupPincode: sourcePincode,
        deliveryPincode,
        weight: weight || settings.defaults.weight,
        cod: cod !== undefined ? cod : settings.defaults.codToggle,
        length: length || settings.defaults.length,
        breadth: breadth || settings.defaults.breadth,
        height: height || settings.defaults.height
      });

      return result;
    } catch (err) {
      logger.warn(`[LogisticsService] checkServiceability fallback: ${err.message}`);
      return { serviceable: true, rates: [], message: 'Standard shipping available' };
    }
  }

  /**
   * Automated Courier Selection logic based on preferences
   */
  selectCourier(couriers, preferences) {
    if (!couriers || couriers.length === 0) return null;

    const mode = preferences?.selectionMode || 'auto';

    if (mode === 'preferred' && preferences.preferredCourierId) {
      const found = couriers.find(c => c.courierCompanyId === preferences.preferredCourierId);
      if (found) return found;
    }

    if (mode === 'cheapest') {
      return [...couriers].sort((a, b) => a.rate - b.rate)[0];
    }

    if (mode === 'fastest') {
      return [...couriers].sort((a, b) => (a.estimatedDeliveryDays || 99) - (b.estimatedDeliveryDays || 99))[0];
    }

    // Default 'auto': pick recommended or cheapest
    const recommended = couriers.find(c => c.isRecommended);
    if (recommended) return recommended;

    return [...couriers].sort((a, b) => a.rate - b.rate)[0];
  }

  /**
   * Create shipment wrapper (alias for order confirmation & fulfillment)
   */
  async createShipment(orderId) {
    const shipmentDoc = await this.processOrderPostPayment(orderId);
    if (!shipmentDoc) {
      return { success: false, message: 'Shipment creation skipped or provider disabled' };
    }
    return {
      success: true,
      awbCode: shipmentDoc.awbCode || null,
      courierName: shipmentDoc.courierName || null,
      shipment: shipmentDoc
    };
  }

  /**
   * Process Order Fulfillment after Razorpay / COD payment success
   */
  async processOrderPostPayment(orderId) {
    const order = typeof orderId === 'string' ? await Order.findById(orderId) : orderId;
    if (!order) {
      throw new Error(`Order ${orderId} not found for logistics processing`);
    }

    // Prevent duplicate shipment creation
    const existingShipment = await Shipment.findOne({ order: order._id });
    if (existingShipment && existingShipment.status !== 'Failed') {
      logger.info(`[LogisticsService] Shipment already exists for order ${order.displayId || order.id}`);
      return existingShipment;
    }

    const settings = await this.getSettings();
    if (!settings.shiprocket.enabled) {
      logger.info(`[LogisticsService] Shiprocket is disabled in settings. Skipping automatic shipment creation.`);
      return null;
    }

    const token = await this.getAuthToken(settings.activeProvider);
    const provider = this.getProvider(settings.activeProvider);

    const defaultPickup = settings.pickupLocations.find(l => l.isDefault) || settings.pickupLocations[0];
    const pickupLocationName = defaultPickup?.pickupLocation || settings.defaults.defaultPickupLocation;

    // Build Shiprocket Order Payload
    const nameParts = (order.userName || 'Customer').split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    const orderItems = order.items.map(item => ({
      name: `${item.flavorName} (${item.packLabel})`,
      sku: `${item.flavorId}-${item.packId}`,
      units: item.quantity,
      selling_price: item.unitPrice,
      discount: 0,
      tax: 0,
      hsn: 2106
    }));

    // Calculate total weight (default 0.5kg per unit or setting)
    const calculatedWeight = Math.max(
      settings.defaults.weight,
      order.items.reduce((acc, item) => acc + (item.grams * item.quantity) / 1000, 0)
    );

    const isCOD = order.payment?.method === 'COD';

    const shiprocketOrderPayload = {
      order_id: order.displayId || order.id,
      order_date: new Date(order.createdAt).toISOString().replace('T', ' ').substring(0, 19),
      pickup_location: pickupLocationName,
      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: order.address?.addressLine || 'Address',
      billing_city: order.address?.city || 'City',
      billing_pincode: order.address?.pincode || '395006',
      billing_state: order.address?.state || 'Gujarat',
      billing_country: 'India',
      billing_email: order.customerEmail || 'customer@rataluwafers.com',
      billing_phone: order.userPhone || '9999999999',
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: isCOD ? 'COD' : 'Prepaid',
      shipping_charges: order.totals?.shipping || 0,
      sub_total: order.totals?.subtotal || order.totals?.total,
      length: settings.defaults.length,
      breadth: settings.defaults.breadth,
      height: settings.defaults.height,
      weight: calculatedWeight
    };

    let shipmentDoc = existingShipment || new Shipment({
      order: order._id,
      orderId: order.displayId || order.id,
      provider: settings.activeProvider,
      dimensions: {
        length: settings.defaults.length,
        breadth: settings.defaults.breadth,
        height: settings.defaults.height,
        weight: calculatedWeight
      },
      pickupLocation: pickupLocationName,
      status: 'Confirmed'
    });

    try {
      // 1. Create Shiprocket Order
      logger.info(`[LogisticsService] Creating Shiprocket order for ${order.displayId || order.id}...`);
      const createRes = await provider.createOrder(token, shiprocketOrderPayload);
      
      shipmentDoc.shiprocketOrderId = createRes.shiprocketOrderId;
      shipmentDoc.shiprocketShipmentId = createRes.shiprocketShipmentId;
      shipmentDoc.status = 'Confirmed';
      shipmentDoc.apiLogs.push({
        action: 'create_order',
        request: shiprocketOrderPayload,
        response: createRes,
        status: 'success'
      });

      // Update Order Status
      order.status = 'Confirmed';
      order.timeline.push({
        status: 'Confirmed',
        time: new Date(),
        note: `Shiprocket order #${createRes.shiprocketOrderId} created successfully.`
      });

      // 2. Auto-Generate AWB if enabled
      if (settings.defaults.autoGenerateAWB && createRes.shiprocketShipmentId) {
        try {
          // Check available couriers first to select optimal courier
          const serviceability = await provider.checkServiceability(token, {
            pickupPincode: defaultPickup?.pinCode || '395006',
            deliveryPincode: order.address?.pincode,
            weight: calculatedWeight,
            cod: isCOD
          });

          const chosenCourier = this.selectCourier(serviceability.couriers, settings.courierPreferences);
          const courierId = chosenCourier?.courierCompanyId || null;

          logger.info(`[LogisticsService] Generating AWB for shipment #${createRes.shiprocketShipmentId} using courier ${courierId || 'auto'}...`);
          const awbRes = await provider.generateAWB(token, {
            shipmentId: createRes.shiprocketShipmentId,
            courierId
          });

          shipmentDoc.awbCode = awbRes.awbCode;
          shipmentDoc.courierCompanyId = awbRes.courierCompanyId;
          shipmentDoc.courierName = awbRes.courierName;
          shipmentDoc.freightCharge = awbRes.freightCharge || 0;
          shipmentDoc.status = 'Packed';
          shipmentDoc.trackingUrl = `https://shiprocket.co/tracking/${awbRes.awbCode}`;
          shipmentDoc.apiLogs.push({
            action: 'generate_awb',
            request: { shipmentId: createRes.shiprocketShipmentId, courierId },
            response: awbRes,
            status: 'success'
          });

          order.courierName = awbRes.courierName;
          order.trackingNumber = awbRes.awbCode;
          order.status = 'Packed';
          order.timeline.push({
            status: 'Packed',
            time: new Date(),
            note: `AWB ${awbRes.awbCode} assigned via ${awbRes.courierName}.`
          });
        } catch (awbErr) {
          logger.error(`[LogisticsService] AWB Generation Warning: ${awbErr.message}`);
          shipmentDoc.apiLogs.push({
            action: 'generate_awb',
            request: { shipmentId: createRes.shiprocketShipmentId },
            response: awbErr.details || null,
            status: 'error',
            errorMessage: awbErr.message
          });
        }
      }

      // 3. Auto-Schedule Pickup if enabled & AWB assigned
      if (settings.defaults.autoSchedulePickup && shipmentDoc.shiprocketShipmentId && shipmentDoc.awbCode) {
        try {
          logger.info(`[LogisticsService] Scheduling pickup for shipment #${shipmentDoc.shiprocketShipmentId}...`);
          const pickupRes = await provider.requestPickup(token, {
            shipmentId: shipmentDoc.shiprocketShipmentId
          });

          shipmentDoc.status = 'Pickup Scheduled';
          shipmentDoc.pickupScheduledDate = new Date();
          shipmentDoc.apiLogs.push({
            action: 'schedule_pickup',
            request: { shipmentId: shipmentDoc.shiprocketShipmentId },
            response: pickupRes,
            status: 'success'
          });

          await PickupRequest.create({
            shipment: shipmentDoc._id,
            shipmentId: shipmentDoc.shiprocketShipmentId,
            pickupLocation: pickupLocationName,
            pickupScheduledDate: new Date(),
            status: 'Scheduled',
            responseDetails: pickupRes
          });

          order.status = 'Ready to Ship';
          order.timeline.push({
            status: 'Ready to Ship',
            time: new Date(),
            note: `Courier pickup scheduled.`
          });
        } catch (pickupErr) {
          logger.error(`[LogisticsService] Pickup Scheduling Warning: ${pickupErr.message}`);
          shipmentDoc.apiLogs.push({
            action: 'schedule_pickup',
            request: { shipmentId: shipmentDoc.shiprocketShipmentId },
            response: pickupErr.details || null,
            status: 'error',
            errorMessage: pickupErr.message
          });
        }
      }

      await shipmentDoc.save();
      await order.save();

      // Trigger Notifications
      await notifyOrderStatus(order, order.status);
      await notifyAdmin({
        title: 'New Shipment Created',
        message: `Shipment for order ${order.displayId || order.id} created via Shiprocket (${shipmentDoc.awbCode || 'Pending AWB'})`,
        type: 'General'
      });

      return shipmentDoc;
    } catch (error) {
      logger.error(`[LogisticsService] Shipment creation failed: ${error.message}`);
      shipmentDoc.status = 'Failed';
      shipmentDoc.lastError = error.message;
      shipmentDoc.apiLogs.push({
        action: 'create_order',
        request: shiprocketOrderPayload,
        response: error.details || null,
        status: 'error',
        errorMessage: error.message
      });
      await shipmentDoc.save();
      throw error;
    }
  }

  /**
   * Manual AWB Generation
   */
  async generateAWBForShipment(shipmentId, courierId = null) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new Error('Shipment not found');

    const settings = await this.getSettings();
    const token = await this.getAuthToken(shipment.provider);
    const provider = this.getProvider(shipment.provider);

    const awbRes = await provider.generateAWB(token, {
      shipmentId: shipment.shiprocketShipmentId,
      courierId
    });

    shipment.awbCode = awbRes.awbCode;
    shipment.courierCompanyId = awbRes.courierCompanyId;
    shipment.courierName = awbRes.courierName;
    shipment.freightCharge = awbRes.freightCharge || 0;
    shipment.status = 'Packed';
    shipment.trackingUrl = `https://shiprocket.co/tracking/${awbRes.awbCode}`;
    shipment.apiLogs.push({
      action: 'manual_generate_awb',
      request: { courierId },
      response: awbRes,
      status: 'success'
    });
    await shipment.save();

    const order = await Order.findById(shipment.order);
    if (order) {
      order.courierName = awbRes.courierName;
      order.trackingNumber = awbRes.awbCode;
      order.status = 'Packed';
      order.timeline.push({
        status: 'Packed',
        time: new Date(),
        note: `AWB ${awbRes.awbCode} generated via ${awbRes.courierName}.`
      });
      await order.save();
      await notifyOrderStatus(order, 'Packed');
    }

    return shipment;
  }

  /**
   * Manual Schedule Pickup
   */
  async schedulePickupForShipment(shipmentId, pickupDate = null) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new Error('Shipment not found');

    const token = await this.getAuthToken(shipment.provider);
    const provider = this.getProvider(shipment.provider);

    const pickupRes = await provider.requestPickup(token, {
      shipmentId: shipment.shiprocketShipmentId,
      pickupDate
    });

    shipment.status = 'Pickup Scheduled';
    shipment.pickupScheduledDate = pickupDate ? new Date(pickupDate) : new Date();
    shipment.apiLogs.push({
      action: 'manual_schedule_pickup',
      request: { pickupDate },
      response: pickupRes,
      status: 'success'
    });
    await shipment.save();

    await PickupRequest.create({
      shipment: shipment._id,
      shipmentId: shipment.shiprocketShipmentId,
      pickupLocation: shipment.pickupLocation,
      pickupScheduledDate: shipment.pickupScheduledDate,
      status: 'Scheduled',
      responseDetails: pickupRes
    });

    const order = await Order.findById(shipment.order);
    if (order) {
      order.status = 'Ready to Ship';
      order.timeline.push({
        status: 'Ready to Ship',
        time: new Date(),
        note: `Pickup scheduled.`
      });
      await order.save();
      await notifyOrderStatus(order, 'Ready to Ship');
    }

    return shipment;
  }

  /**
   * Generate Document (Label / Manifest / Invoice)
   */
  async generateDocument(shipmentId, docType) {
    const shipment = await Shipment.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(shipmentId) ? shipmentId : null },
        { order: mongoose.Types.ObjectId.isValid(shipmentId) ? shipmentId : null },
        { orderId: shipmentId }
      ]
    });
    if (!shipment) throw new Error('Shipment not found. Please click "Create Shipment" first.');

    const token = await this.getAuthToken(shipment.provider);
    const provider = this.getProvider(shipment.provider);

    if (docType === 'label') {
      const res = await provider.generateLabel(token, { shipmentIds: [shipment.shiprocketShipmentId] });
      if (res.labelUrl) {
        shipment.labelUrl = res.labelUrl;
        await shipment.save();
        await ShippingLabel.create({
          shipment: shipment._id,
          shipmentId: shipment.shiprocketShipmentId,
          awbCode: shipment.awbCode,
          labelUrl: res.labelUrl
        });
      }
      return res.labelUrl;
    }

    if (docType === 'manifest') {
      const res = await provider.generateManifest(token, { shipmentIds: [shipment.shiprocketShipmentId] });
      if (res.manifestUrl) {
        shipment.manifestUrl = res.manifestUrl;
        await shipment.save();
        await Manifest.create({
          shipmentIds: [shipment.shiprocketShipmentId],
          manifestUrl: res.manifestUrl
        });
      }
      return res.manifestUrl;
    }

    if (docType === 'invoice') {
      const res = await provider.generateInvoice(token, { orderIds: [shipment.shiprocketOrderId] });
      if (res.invoiceUrl) {
        shipment.invoiceUrl = res.invoiceUrl;
        await shipment.save();
      }
      return res.invoiceUrl;
    }

    throw new Error('Invalid document type requested');
  }

  /**
   * Live Sync & Fetch Tracking Info
   */
  async syncTrackingInfo(shipmentIdOrAwb) {
    let shipment = await Shipment.findOne({
      $or: [{ _id: shipmentIdOrAwb }, { awbCode: shipmentIdOrAwb }, { shiprocketShipmentId: shipmentIdOrAwb }]
    });

    if (!shipment && typeof shipmentIdOrAwb === 'string') {
      // Look up by Order ID e.g. RW-000101
      const order = await Order.findOne({ id: shipmentIdOrAwb });
      if (order) {
        shipment = await Shipment.findOne({ order: order._id });
      }
    }

    if (!shipment) throw new Error('Shipment not found for tracking');
    if (!shipment.awbCode && !shipment.shiprocketShipmentId) {
      throw new Error('Shipment has no AWB or shipment ID assigned yet.');
    }

    const token = await this.getAuthToken(shipment.provider);
    const provider = this.getProvider(shipment.provider);

    const trackingRes = await provider.trackShipment(token, {
      awbCode: shipment.awbCode,
      shipmentId: shipment.shiprocketShipmentId
    });

    // Map Shiprocket Status string to domain status enum
    const statusMap = {
      'PICKUP SCHEDULED': 'Pickup Scheduled',
      'PICKED UP': 'Picked Up',
      'IN TRANSIT': 'In Transit',
      'OUT FOR DELIVERY': 'Out For Delivery',
      'DELIVERED': 'Delivered',
      'RTO IN TRANSIT': 'RTO',
      'RTO DELIVERED': 'RTO',
      'CANCELED': 'Cancelled',
      'CANCELLED': 'Cancelled'
    };

    const mappedStatus = statusMap[trackingRes.currentStatus?.toUpperCase()] || shipment.status;

    shipment.status = mappedStatus;
    shipment.providerStatus = trackingRes.currentStatus;
    shipment.estimatedDelivery = trackingRes.edd || shipment.estimatedDelivery;
    shipment.deliveredDate = trackingRes.deliveredDate || shipment.deliveredDate;
    shipment.lastSyncedAt = new Date();
    shipment.trackingHistory = trackingRes.activities;

    if (trackingRes.activities.length > 0) {
      shipment.currentLocation = trackingRes.activities[0].location || shipment.currentLocation;
    }

    await shipment.save();

    // Log TrackingEvent
    if (trackingRes.activities.length > 0) {
      const latest = trackingRes.activities[0];
      await TrackingEvent.create({
        shipment: shipment._id,
        orderId: shipment.orderId,
        awbCode: shipment.awbCode || 'N/A',
        status: mappedStatus,
        activity: latest.activity,
        location: latest.location,
        eventTime: latest.date,
        source: 'manual_refresh',
        rawData: trackingRes
      });
    }

    // Sync with main Order document
    const order = await Order.findById(shipment.order);
    if (order && order.status !== mappedStatus) {
      const orderStatusMap = {
        'Picked Up': 'Assigned to Logistics',
        'In Transit': 'Shipped',
        'Out For Delivery': 'Out for Delivery',
        'Delivered': 'Delivered',
        'RTO': 'Returned',
        'Cancelled': 'Cancelled'
      };

      const newOrderStatus = orderStatusMap[mappedStatus];
      if (newOrderStatus && order.status !== newOrderStatus) {
        order.status = newOrderStatus;
        order.timeline.push({
          status: newOrderStatus,
          time: new Date(),
          note: `Shipment status updated to ${mappedStatus}.`
        });
        await order.save();
        await notifyOrderStatus(order, newOrderStatus);
      }
    }

    return shipment;
  }

  /**
   * Cancel Shipment
   */
  async cancelShipment(shipmentId) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new Error('Shipment not found');

    const token = await this.getAuthToken(shipment.provider);
    const provider = this.getProvider(shipment.provider);

    const cancelRes = await provider.cancelShipment(token, {
      orderIds: [shipment.shiprocketOrderId]
    });

    shipment.status = 'Cancelled';
    shipment.apiLogs.push({
      action: 'cancel_shipment',
      request: { orderId: shipment.shiprocketOrderId },
      response: cancelRes,
      status: 'success'
    });
    await shipment.save();

    const order = await Order.findById(shipment.order);
    if (order) {
      order.status = 'Cancelled';
      order.cancelledBy = 'admin';
      order.cancelledAt = new Date();
      order.cancelReason = 'Cancelled via logistics module';
      order.timeline.push({
        status: 'Cancelled',
        time: new Date(),
        note: 'Shipment cancelled in Shiprocket.'
      });
      await order.save();
      await notifyOrderStatus(order, 'Cancelled');
    }

    return shipment;
  }

  /**
   * Process Webhook updates from Shiprocket
   */
  async processWebhook(payload) {
    logger.info(`[Logistics Webhook Received]`, payload);

    const awbCode = payload.awb || payload.awb_code;
    const orderId = payload.order_id;
    const currentStatus = payload.current_status || payload.status;

    if (!awbCode && !orderId) {
      return { success: false, message: 'Missing awb or order_id in webhook payload' };
    }

    const shipment = await Shipment.findOne({
      $or: [{ awbCode }, { shiprocketOrderId: orderId }, { orderId }]
    });

    if (!shipment) {
      logger.warn(`[Logistics Webhook] No shipment found matching AWB ${awbCode} or Order ${orderId}`);
      return { success: false, message: 'Shipment not found' };
    }

    const statusMap = {
      'PICKUP SCHEDULED': 'Pickup Scheduled',
      'PICKED UP': 'Picked Up',
      'IN TRANSIT': 'In Transit',
      'OUT FOR DELIVERY': 'Out For Delivery',
      'DELIVERED': 'Delivered',
      'RTO IN TRANSIT': 'RTO',
      'RTO DELIVERED': 'RTO',
      'CANCELED': 'Cancelled',
      'CANCELLED': 'Cancelled'
    };

    const mappedStatus = statusMap[currentStatus?.toUpperCase()] || shipment.status;

    shipment.status = mappedStatus;
    shipment.providerStatus = currentStatus;
    shipment.currentLocation = payload.current_location || payload.scans?.[0]?.location || shipment.currentLocation;
    shipment.lastSyncedAt = new Date();

    if (payload.scans && Array.isArray(payload.scans)) {
      shipment.trackingHistory = payload.scans.map(s => ({
        status: s.status || s.activity,
        activity: s.activity || s.status,
        location: s.location || '',
        date: s.date ? new Date(s.date) : new Date(),
        rawData: s
      }));
    }

    await shipment.save();

    await TrackingEvent.create({
      shipment: shipment._id,
      orderId: shipment.orderId,
      awbCode: shipment.awbCode || awbCode,
      status: mappedStatus,
      activity: payload.activity || currentStatus,
      location: shipment.currentLocation,
      eventTime: new Date(),
      source: 'webhook',
      rawData: payload
    });

    const order = await Order.findById(shipment.order);
    if (order) {
      const orderStatusMap = {
        'Picked Up': 'Assigned to Logistics',
        'In Transit': 'Shipped',
        'Out For Delivery': 'Out for Delivery',
        'Delivered': 'Delivered',
        'RTO': 'Returned',
        'Cancelled': 'Cancelled'
      };

      const newOrderStatus = orderStatusMap[mappedStatus];
      if (newOrderStatus && order.status !== newOrderStatus) {
        order.status = newOrderStatus;
        order.timeline.push({
          status: newOrderStatus,
          time: new Date(),
          note: `Webhook update: status moved to ${mappedStatus}.`
        });
        await order.save();
        await notifyOrderStatus(order, newOrderStatus);
      }
    }

    return { success: true, shipmentId: shipment._id };
  }
}

module.exports = new LogisticsService();

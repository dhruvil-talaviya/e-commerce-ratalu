const Settings = require('../models/Settings');
const LogisticsSettings = require('../models/LogisticsSettings');
const { encrypt, decrypt, maskSecret } = require('../utils/crypto');
const ErrorResponse = require('../utils/errorResponse');
const sendResponse = require('../utils/response');
const logger = require('../config/logger');

// Helper to get or create Settings singleton
async function getOrCreateSettings() {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  return settings;
}

// Helper to get or create LogisticsSettings singleton
async function getOrCreateLogisticsSettings() {
  let logistics = await LogisticsSettings.findOne();
  if (!logistics) {
    logistics = await LogisticsSettings.create({});
  }
  return logistics;
}

// @desc    Get Shipping & Delivery Settings (Methods, Rules, Shiprocket defaults & pickups)
// @route   GET /api/v1/settings/shipping or /api/v1/admin/settings/shipping
// @access  Private/Admin
exports.getShippingSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    const logistics = await getOrCreateLogisticsSettings();

    const data = {
      // Methods Toggles
      storePickupEnabled: settings.storePickupEnabled ?? false,
      homeDeliveryEnabled: settings.homeDeliveryEnabled ?? true,
      sameDayDeliveryEnabled: settings.sameDayDeliveryEnabled ?? false,
      expressDeliveryEnabled: settings.expressDeliveryEnabled ?? false,
      codEnabled: settings.codEnabled ?? true,
      internationalShippingEnabled: settings.internationalShippingEnabled ?? false,

      // Rates & ETAs
      shippingFlatRate: settings.shippingFlatRate ?? 49,
      sameDayFlatRate: settings.sameDayFlatRate ?? 149,
      expressFlatRate: settings.expressFlatRate ?? 99,

      // Free Shipping Rules
      freeShippingEnabled: settings.freeShippingEnabled ?? true,
      freeShippingMinAmount: settings.freeShippingMinAmount ?? settings.shippingFreeThreshold ?? 599,
      freeShippingScope: settings.freeShippingScope || 'all_india',
      freeShippingStates: settings.freeShippingStates || [],
      freeShippingCities: settings.freeShippingCities || [],
      freeShippingPincodes: settings.freeShippingPincodes || [],
      freeShippingCategories: settings.freeShippingCategories || [],

      // Tiered Shipping Charges Rules
      shippingRules: settings.shippingRules || [],

      // Shiprocket Configuration Card Data
      shiprocket: {
        enabled: logistics.shiprocket?.enabled ?? true,
        apiEmail: logistics.shiprocket?.apiEmail || '',
        passwordMasked: logistics.shiprocket?.encryptedPassword ? maskSecret(logistics.shiprocket.encryptedPassword) : '',
        connectionStatus: logistics.shiprocket?.connectionStatus || 'unconfigured',
        lastTestedAt: logistics.shiprocket?.lastTestedAt || null,
        lastSyncAt: logistics.shiprocket?.lastSyncAt || null,
        lastError: logistics.shiprocket?.lastError || '',
        warehouseName: logistics.shiprocket?.warehouseName || 'Yamora Warehouse',
        warehousePhone: logistics.shiprocket?.warehousePhone || '+91 98250 22222',
        gstNumber: logistics.shiprocket?.gstNumber || settings.gstNumber || '',
        companyName: logistics.shiprocket?.companyName || settings.businessName || 'Yamora Chips Pvt. Ltd.',
        pickupAddress: logistics.shiprocket?.pickupAddress || settings.businessAddress || '',
      },

      // Defaults & Automations
      defaults: logistics.defaults || {},
      courierPreferences: logistics.courierPreferences || {},
      pickupLocations: logistics.pickupLocations || []
    };

    sendResponse(res, 200, { success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Shipping & Delivery Settings
// @route   PUT /api/v1/settings/shipping or /api/v1/admin/settings/shipping
// @access  Private/Admin
exports.updateShippingSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    const logistics = await getOrCreateLogisticsSettings();

    const body = req.body || {};

    // 1. Update Settings model shipping fields
    const settingsFields = [
      'storePickupEnabled', 'homeDeliveryEnabled', 'sameDayDeliveryEnabled',
      'expressDeliveryEnabled', 'codEnabled', 'internationalShippingEnabled',
      'shippingFlatRate', 'sameDayFlatRate', 'expressFlatRate',
      'freeShippingEnabled', 'freeShippingMinAmount', 'freeShippingScope',
      'freeShippingStates', 'freeShippingCities', 'freeShippingPincodes',
      'freeShippingCategories', 'shippingRules'
    ];

    settingsFields.forEach((field) => {
      if (body[field] !== undefined) {
        settings[field] = body[field];
      }
    });

    if (body.freeShippingMinAmount !== undefined) {
      const val = Number(body.freeShippingMinAmount);
      settings.freeShippingMinAmount = val;
      settings.shippingFreeThreshold = val;
    } else if (body.shippingFreeThreshold !== undefined) {
      const val = Number(body.shippingFreeThreshold);
      settings.freeShippingMinAmount = val;
      settings.shippingFreeThreshold = val;
    }

    await settings.save();

    // 2. Update LogisticsSettings model fields
    if (body.shiprocket) {
      if (body.shiprocket.enabled !== undefined) logistics.shiprocket.enabled = body.shiprocket.enabled;
      if (body.shiprocket.apiEmail !== undefined) logistics.shiprocket.apiEmail = body.shiprocket.apiEmail.trim();
      if (body.shiprocket.warehouseName !== undefined) logistics.shiprocket.warehouseName = body.shiprocket.warehouseName;
      if (body.shiprocket.warehousePhone !== undefined) logistics.shiprocket.warehousePhone = body.shiprocket.warehousePhone;
      if (body.shiprocket.gstNumber !== undefined) logistics.shiprocket.gstNumber = body.shiprocket.gstNumber;
      if (body.shiprocket.companyName !== undefined) logistics.shiprocket.companyName = body.shiprocket.companyName;
      if (body.shiprocket.pickupAddress !== undefined) logistics.shiprocket.pickupAddress = body.shiprocket.pickupAddress;

      // Only update password if a new non-masked password is passed
      if (body.shiprocket.password && !body.shiprocket.password.includes('••••')) {
        logistics.shiprocket.encryptedPassword = encrypt(body.shiprocket.password);
      }
    }

    if (body.defaults) {
      logistics.defaults = { ...logistics.defaults.toObject(), ...body.defaults };
    }
    if (body.courierPreferences) {
      logistics.courierPreferences = { ...logistics.courierPreferences.toObject(), ...body.courierPreferences };
    }

    await logistics.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Shipping and delivery settings updated successfully',
      data: { settings, logistics }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Razorpay & Payment Settings
// @route   GET /api/v1/settings/payment or /api/v1/admin/settings/payment
// @access  Private/Admin
exports.getPaymentSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    const envKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const envWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    const effectiveKeySecret = settings.encryptedRazorpayKeySecret ? decrypt(settings.encryptedRazorpayKeySecret) : envKeySecret;
    const effectiveWebhookSecret = settings.encryptedRazorpayWebhookSecret ? decrypt(settings.encryptedRazorpayWebhookSecret) : envWebhookSecret;

    const data = {
      codEnabled: settings.codEnabled ?? true,
      razorpayEnabled: settings.razorpayEnabled ?? true,
      upiEnabled: settings.upiEnabled ?? true,

      keyId: settings.razorpayKeyId || process.env.RAZORPAY_KEY_ID || '',
      keySecretMasked: effectiveKeySecret ? maskSecret(effectiveKeySecret) : '',
      webhookSecretMasked: effectiveWebhookSecret ? maskSecret(effectiveWebhookSecret) : '',
      webhookUrl: settings.razorpayWebhookUrl || `${process.env.BACKEND_ORIGIN || 'https://e-commerce-ratalu.onrender.com'}/api/v1/payment/webhook`,

      merchantName: settings.razorpayMerchantName || 'Yamora Chips',
      brandLogo: settings.razorpayBrandLogo || settings.storeLogo || '',
      themeColor: settings.razorpayThemeColor || '#5B2C6F',

      testMode: settings.razorpayTestMode ?? (process.env.NODE_ENV !== 'production'),
      autoCapture: settings.razorpayAutoCapture ?? true,
      enableRefunds: settings.razorpayEnableRefunds ?? true,
      enablePartialRefunds: settings.razorpayEnablePartialRefunds ?? true,
      enableWebhooks: settings.razorpayEnableWebhooks ?? true,

      // Method switches
      enableUPI: settings.razorpayEnableUPI ?? true,
      enableCards: settings.razorpayEnableCards ?? true,
      enableWallets: settings.razorpayEnableWallets ?? true,
      enableNetBanking: settings.razorpayEnableNetBanking ?? true,
      enableEMI: settings.razorpayEnableEMI ?? false,

      // Connection Status
      connectionStatus: (settings.razorpayKeyId || process.env.RAZORPAY_KEY_ID) && effectiveKeySecret ? 'connected' : 'unconfigured'
    };

    sendResponse(res, 200, { success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Razorpay & Payment Settings
// @route   PUT /api/v1/settings/payment or /api/v1/admin/settings/payment
// @access  Private/Admin
exports.updatePaymentSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    const body = req.body || {};

    const fields = [
      'codEnabled', 'razorpayEnabled', 'upiEnabled', 'razorpayKeyId',
      'razorpayWebhookUrl', 'razorpayMerchantName', 'razorpayBrandLogo',
      'razorpayThemeColor', 'razorpayTestMode', 'razorpayAutoCapture',
      'razorpayEnableRefunds', 'razorpayEnablePartialRefunds', 'razorpayEnableWebhooks',
      'razorpayEnableUPI', 'razorpayEnableCards', 'razorpayEnableWallets',
      'razorpayEnableNetBanking', 'razorpayEnableEMI'
    ];

    fields.forEach((f) => {
      if (body[f] !== undefined) settings[f] = body[f];
    });

    if (body.keySecret && !body.keySecret.includes('••••')) {
      settings.encryptedRazorpayKeySecret = encrypt(body.keySecret.trim());
    }

    if (body.webhookSecret && !body.webhookSecret.includes('••••')) {
      settings.encryptedRazorpayWebhookSecret = encrypt(body.webhookSecret.trim());
    }

    await settings.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Razorpay payment settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test Shiprocket Connection & Credentials
// @route   POST /api/v1/settings/test-shiprocket or /api/v1/admin/settings/test-shiprocket
// @access  Private/Admin
exports.testShiprocketConnection = async (req, res, next) => {
  try {
    const logistics = await getOrCreateLogisticsSettings();
    const email = req.body?.email || logistics.shiprocket?.apiEmail;
    const rawPassword = req.body?.password;

    let passToUse = '';
    if (rawPassword && !rawPassword.includes('••••')) {
      passToUse = rawPassword;
    } else if (logistics.shiprocket?.encryptedPassword) {
      passToUse = decrypt(logistics.shiprocket.encryptedPassword);
    }

    if (!email || !passToUse) {
      logistics.shiprocket.connectionStatus = 'unconfigured';
      await logistics.save();
      return next(new ErrorResponse('Shiprocket API Email and Password are required to test connection', 400));
    }

    const ShiprocketProvider = require('../services/logistics/ShiprocketProvider');
    const auth = await ShiprocketProvider.authenticate(email, passToUse);

    if (auth?.token) {
      logistics.shiprocket.token = auth.token;
      logistics.shiprocket.tokenExpiresAt = auth.expiresAt;
      logistics.shiprocket.connectionStatus = 'connected';
      logistics.shiprocket.lastTestedAt = new Date();
      logistics.shiprocket.lastError = '';

      if (rawPassword && !rawPassword.includes('••••')) {
        logistics.shiprocket.apiEmail = email;
        logistics.shiprocket.encryptedPassword = encrypt(rawPassword);
      }
      await logistics.save();

      return sendResponse(res, 200, {
        success: true,
        message: 'Shiprocket connection verified successfully',
        data: {
          status: 'connected',
          lastTestedAt: logistics.shiprocket.lastTestedAt,
          tokenExpiresAt: logistics.shiprocket.tokenExpiresAt
        }
      });
    }

    logistics.shiprocket.connectionStatus = 'authentication_error';
    logistics.shiprocket.lastError = 'Authentication failed with provided credentials';
    await logistics.save();

    return next(new ErrorResponse('Shiprocket authentication failed. Please verify your credentials.', 401));
  } catch (error) {
    const logistics = await getOrCreateLogisticsSettings();
    logistics.shiprocket.connectionStatus = 'failed';
    logistics.shiprocket.lastError = error.message || 'Connection test failed';
    await logistics.save();
    next(error);
  }
};

// @desc    Test Razorpay API Keys Connection
// @route   POST /api/v1/settings/test-razorpay or /api/v1/admin/settings/test-razorpay
// @access  Private/Admin
exports.testRazorpayConnection = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    const keyId = req.body?.keyId || settings.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
    const rawSecret = req.body?.keySecret;

    let secretToUse = '';
    if (rawSecret && !rawSecret.includes('••••')) {
      secretToUse = rawSecret;
    } else if (settings.encryptedRazorpayKeySecret) {
      secretToUse = decrypt(settings.encryptedRazorpayKeySecret);
    } else {
      secretToUse = process.env.RAZORPAY_KEY_SECRET;
    }

    if (!keyId || !secretToUse) {
      return next(new ErrorResponse('Razorpay Key ID and Key Secret are required to test connection', 400));
    }

    const auth = Buffer.from(`${keyId}:${secretToUse}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders?count=1', {
      method: 'GET',
      headers: { Authorization: `Basic ${auth}` }
    });

    if (response.ok) {
      if (req.body?.keyId && rawSecret && !rawSecret.includes('••••')) {
        settings.razorpayKeyId = keyId;
        settings.encryptedRazorpayKeySecret = encrypt(rawSecret);
        await settings.save();
      }

      return sendResponse(res, 200, {
        success: true,
        message: 'Razorpay API credentials verified successfully',
        data: { status: 'connected', keyId }
      });
    }

    const json = await response.json().catch(() => ({}));
    return next(new ErrorResponse(json?.error?.description || 'Razorpay key verification failed', 400));
  } catch (error) {
    next(error);
  }
};

// @desc    Sync Shiprocket Pickup Locations
// @route   POST /api/v1/settings/sync-pickups or /api/v1/admin/settings/sync-pickups
// @access  Private/Admin
exports.syncShiprocketPickups = async (req, res, next) => {
  try {
    const LogisticsService = require('../services/logistics/LogisticsService');
    const locations = await LogisticsService.syncPickupLocations();

    const logistics = await getOrCreateLogisticsSettings();
    logistics.shiprocket.lastSyncAt = new Date();
    await logistics.save();

    sendResponse(res, 200, {
      success: true,
      message: `Synchronized ${locations.length} pickup location(s) from Shiprocket`,
      data: locations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate Razorpay Webhook URL & Token
// @route   POST /api/v1/settings/generate-webhook or /api/v1/admin/settings/generate-webhook
// @access  Private/Admin
exports.generateRazorpayWebhook = async (req, res, next) => {
  try {
    const crypto = require('crypto');
    const settings = await getOrCreateSettings();

    const origin = process.env.BACKEND_ORIGIN || 'https://e-commerce-ratalu.onrender.com';
    const webhookUrl = `${origin}/api/v1/payment/webhook`;
    const newSecret = `whsec_${crypto.randomBytes(16).toString('hex')}`;

    settings.razorpayWebhookUrl = webhookUrl;
    settings.encryptedRazorpayWebhookSecret = encrypt(newSecret);
    await settings.save();

    sendResponse(res, 200, {
      success: true,
      message: 'Razorpay Webhook configuration generated successfully',
      data: {
        webhookUrl,
        webhookSecret: newSecret
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate Dynamic Shipping Charges & Free Delivery Eligibility
// @route   POST /api/v1/shipping/calculate
// @access  Public
exports.calculateShippingCharges = async (req, res, next) => {
  try {
    const { subtotal, weightKg, pincode, state, city, method = 'home_delivery' } = req.body;

    const settings = await getOrCreateSettings();

    const orderSubtotal = Number(subtotal) || 0;
    const orderWeight = Number(weightKg) || 0.5;

    // Check store pickup
    if (method === 'store_pickup') {
      if (!settings.storePickupEnabled) {
        return next(new ErrorResponse('Store Pickup is currently disabled.', 400));
      }
      return sendResponse(res, 200, {
        success: true,
        data: {
          shippingCharge: 0,
          isFree: true,
          method: 'Store Pickup',
          estimatedDays: 'Ready in 2 Hours',
          courierName: 'Self Pickup'
        }
      });
    }

    // Check express or same-day
    if (method === 'same_day') {
      if (!settings.sameDayDeliveryEnabled) {
        return next(new ErrorResponse('Same Day Delivery is currently disabled for this region.', 400));
      }
      return sendResponse(res, 200, {
        success: true,
        data: {
          shippingCharge: settings.sameDayFlatRate || 149,
          isFree: false,
          method: 'Same Day Express',
          estimatedDays: 'Today by 9 PM',
          courierName: 'Local Express Delivery'
        }
      });
    }

    if (method === 'express') {
      if (!settings.expressDeliveryEnabled) {
        return next(new ErrorResponse('Express Delivery is currently disabled.', 400));
      }
      return sendResponse(res, 200, {
        success: true,
        data: {
          shippingCharge: settings.expressFlatRate || 99,
          isFree: false,
          method: 'Air Express Delivery',
          estimatedDays: '24–48 Hours',
          courierName: 'BlueDart Express'
        }
      });
    }

    // 1. Check Free Shipping rules
    let isFreeShipping = false;
    const minFree = settings.freeShippingMinAmount || settings.shippingFreeThreshold || 599;

    if (settings.freeShippingEnabled && orderSubtotal >= minFree) {
      const scope = settings.freeShippingScope || 'all_india';
      if (scope === 'all_india') {
        isFreeShipping = true;
      } else if (scope === 'selected_states' && state && settings.freeShippingStates.includes(state)) {
        isFreeShipping = true;
      } else if (scope === 'selected_cities' && city && settings.freeShippingCities.includes(city)) {
        isFreeShipping = true;
      } else if (scope === 'selected_pincodes' && pincode && settings.freeShippingPincodes.includes(pincode)) {
        isFreeShipping = true;
      }
    }

    if (isFreeShipping) {
      return sendResponse(res, 200, {
        success: true,
        data: {
          shippingCharge: 0,
          isFree: true,
          method: 'Standard Delivery',
          freeShippingThreshold: minFree,
          estimatedDays: settings.estimatedDeliveryDays || '3–5 Business Days',
          courierName: 'Shiprocket Surface'
        }
      });
    }

    // 2. Check Shiprocket Live Carrier Rates if pincode is supplied and logistics service is active
    let liveCouriers = [];
    let liveRateResult = null;

    if (pincode && String(pincode).trim().length === 6) {
      try {
        const LogisticsService = require('../services/logistics/LogisticsService');
        const logisticsService = new LogisticsService();
        const serviceability = await logisticsService.checkServiceability({
          deliveryPincode: String(pincode).trim(),
          weight: orderWeight
        });

        if (serviceability && serviceability.serviceable && Array.isArray(serviceability.couriers) && serviceability.couriers.length > 0) {
          liveCouriers = serviceability.couriers;
          // Find recommended or lowest rate courier
          const recommended = liveCouriers.find(c => c.isRecommended) || liveCouriers.sort((a, b) => a.rate - b.rate)[0];
          if (recommended) {
            liveRateResult = {
              shippingCharge: recommended.rate,
              courierName: `${recommended.courierName} (Shiprocket Live)`,
              estimatedDays: recommended.estimatedDeliveryDays ? `${recommended.estimatedDeliveryDays} Days` : (settings.estimatedDeliveryDays || '3–5 Business Days')
            };
          }
        }
      } catch (err) {
        console.warn('Shiprocket live serviceability lookup fallback:', err.message);
      }
    }

    // 3. Check Tiered shipping rules (if live rate not fetched or disabled)
    let shippingFee = liveRateResult?.shippingCharge ?? settings.shippingFlatRate ?? 49;
    let courierName = liveRateResult?.courierName ?? 'Shiprocket Surface';
    let estimatedDays = liveRateResult?.estimatedDays ?? settings.estimatedDeliveryDays ?? '3–5 Business Days';

    if (!liveRateResult && Array.isArray(settings.shippingRules) && settings.shippingRules.length > 0) {
      for (const rule of settings.shippingRules) {
        const matchesPrice = orderSubtotal >= (rule.minPrice || 0) && orderSubtotal <= (rule.maxPrice || 999999);
        const matchesWeight = orderWeight >= (rule.minWeight || 0) && orderWeight <= (rule.maxWeight || 100);
        const matchesState = !rule.states?.length || (state && rule.states.includes(state));
        const matchesPincode = !rule.pincodes?.length || (pincode && rule.pincodes.includes(pincode));

        if (matchesPrice && matchesWeight && matchesState && matchesPincode) {
          shippingFee = rule.charge;
          break;
        }
      }
    }

    const freeShippingRemaining = Math.max(minFree - orderSubtotal, 0);

    sendResponse(res, 200, {
      success: true,
      data: {
        shippingCharge: shippingFee,
        isFree: false,
        method: 'Standard Delivery',
        freeShippingThreshold: minFree,
        freeShippingRemaining,
        estimatedDays,
        courierName,
        couriers: liveCouriers
      }
    });
  } catch (error) {
    next(error);
  }
};

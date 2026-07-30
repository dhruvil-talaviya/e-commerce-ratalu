const mongoose = require('mongoose');

const PickupLocationSchema = new mongoose.Schema({
  pickupLocation: { type: String, required: true }, // Location Name e.g. "Primary Warehouse"
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  address2: { type: String, default: '' },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, default: 'India' },
  pinCode: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  shiprocketLocationId: { type: String, default: '' }
}, { timestamps: true });

const ShippingRuleSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  states: [{ type: String }],
  minWeight: { type: Number, default: 0 },
  maxWeight: { type: Number, default: 100 },
  preferredCourierId: { type: String, default: '' },
  description: { type: String, default: '' }
});

const LogisticsSettingsSchema = new mongoose.Schema({
  activeProvider: {
    type: String,
    enum: ['shiprocket', 'delhivery', 'pickrr', 'xpressbees', 'nimbuspost', 'manual'],
    default: 'shiprocket'
  },
  shiprocket: {
    enabled: { type: Boolean, default: true },
    apiEmail: { type: String, default: '' },
    encryptedPassword: { type: String, default: '' },
    token: { type: String, default: '' },
    tokenExpiresAt: { type: Date, default: null },
    connectionStatus: {
      type: String,
      enum: ['connected', 'disconnected', 'failed', 'authentication_error', 'unconfigured'],
      default: 'unconfigured'
    },
    lastTestedAt: { type: Date, default: null },
    lastSyncAt: { type: Date, default: null },
    lastError: { type: String, default: '' },
    webhookSecret: { type: String, default: 'yamora_logistics_wh_sec_2026' },
    warehouseName: { type: String, default: 'Yamora Warehouse' },
    warehousePhone: { type: String, default: '+91 98250 22222' },
    gstNumber: { type: String, default: '' },
    companyName: { type: String, default: 'Yamora Chips Pvt. Ltd.' },
    pickupAddress: { type: String, default: '14 Marine Drive, Nariman Point, Mumbai 400021' }
  },
  defaults: {
    weight: { type: Number, default: 0.5 }, // in KG
    length: { type: Number, default: 15 }, // in CM
    breadth: { type: Number, default: 15 }, // in CM
    height: { type: Number, default: 10 }, // in CM
    tareWeightGrams: { type: Number, default: 100 },
    insuranceToggle: { type: Boolean, default: false },
    codToggle: { type: Boolean, default: false }, // COD currently disabled
    autoAssignCourier: { type: Boolean, default: true },
    autoGenerateAWB: { type: Boolean, default: true },
    autoCreateShipment: { type: Boolean, default: true },
    autoSchedulePickup: { type: Boolean, default: true },
    autoGenerateLabel: { type: Boolean, default: true },
    autoGenerateInvoice: { type: Boolean, default: true },
    autoNotifyCustomer: { type: Boolean, default: true },
    defaultCourier: { type: String, default: 'Auto Select (Shiprocket Recommended)' },
    defaultPickupLocation: { type: String, default: 'Primary Warehouse' }
  },
  courierPreferences: {
    selectionMode: {
      type: String,
      enum: ['auto', 'lowest_cost', 'fastest', 'rating', 'preferred'],
      default: 'lowest_cost'
    },
    preferredCourierId: { type: Number, default: null },
    preferredCourierName: { type: String, default: '' },
    disabledCouriers: [{ type: String }]
  },
  shippingRules: [ShippingRuleSchema],
  pickupLocations: [PickupLocationSchema],
  retrySettings: {
    maxRetries: { type: Number, default: 3 },
    backoffMinutes: [{ type: Number }] // [2, 10, 30]
  }
}, { timestamps: true });

module.exports = mongoose.model('LogisticsSettings', LogisticsSettingsSchema);

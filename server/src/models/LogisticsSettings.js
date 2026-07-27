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
    webhookToken: { type: String, default: '' },
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
    insuranceToggle: { type: Boolean, default: false },
    codToggle: { type: Boolean, default: true },
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
      enum: ['auto', 'manual', 'cheapest', 'fastest', 'preferred'],
      default: 'auto'
    },
    preferredCourierId: { type: Number, default: null },
    preferredCourierName: { type: String, default: '' }
  },
  pickupLocations: [PickupLocationSchema]
}, { timestamps: true });

module.exports = mongoose.model('LogisticsSettings', LogisticsSettingsSchema);

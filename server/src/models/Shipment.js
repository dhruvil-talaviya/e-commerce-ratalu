const mongoose = require('mongoose');

const ApiAuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  request: { type: mongoose.Schema.Types.Mixed },
  response: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['success', 'error'], required: true },
  errorMessage: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const ShipmentHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  activity: { type: String, required: true },
  location: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  rawData: { type: mongoose.Schema.Types.Mixed }
});

const ShipmentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderId: { type: String, required: true, index: true }, // Display ID (RW-000101)
  shipmentTag: { type: String, default: 'Shipment A' }, // Partial shipment identifier e.g., Shipment A, Shipment B
  provider: { type: String, default: 'shiprocket' },

  // Provider identifiers
  shiprocketOrderId: { type: mongoose.Schema.Types.Mixed, index: true },
  shiprocketShipmentId: { type: mongoose.Schema.Types.Mixed, index: true },
  awbCode: { type: String, index: true, sparse: true },

  // Courier info & ranking metadata
  courierCompanyId: { type: Number },
  courierName: { type: String },
  courierRating: { type: Number, default: 0 },
  freightCharge: { type: Number, default: 0 },
  codCharge: { type: Number, default: 0 },
  fuelSurcharge: { type: Number, default: 0 },
  totalShippingCost: { type: Number, default: 0 },

  // Status mapping
  status: {
    type: String,
    enum: [
      'Shipment Created',
      'Confirmed',
      'AWB Assigned',
      'Pickup Scheduled',
      'Picked Up',
      'In Transit',
      'Out For Delivery',
      'Delivered',
      'Delivery Failed',
      'RTO',
      'RTO In Transit',
      'RTO Delivered',
      'Cancelled',
      'Failed',
      'Pending Retry'
    ],
    default: 'Shipment Created',
    index: true
  },
  providerStatus: { type: String, default: '' },
  providerEventTime: { type: Date },
  statusStatusCode: { type: Number },

  // Package Builder Specs
  packageSpecs: {
    netWeightGrams: { type: Number, default: 0 },
    tareWeightGrams: { type: Number, default: 100 },
    deadWeightKg: { type: Number, default: 0.5 },
    volumetricWeightKg: { type: Number, default: 0.45 },
    chargeableWeightKg: { type: Number, default: 0.5 },
    presetName: { type: String, default: 'Small Box' }
  },

  // Physical dimensions
  dimensions: {
    length: { type: Number, default: 15 },
    breadth: { type: Number, default: 15 },
    height: { type: Number, default: 10 },
    weight: { type: Number, default: 0.5 }
  },

  // Pickup details
  pickupLocation: { type: String },
  pickupScheduledDate: { type: Date },
  pickupToken: { type: String },

  // Generated document URLs
  labelUrl: { type: String, default: '' },
  manifestUrl: { type: String, default: '' },
  invoiceUrl: { type: String, default: '' },
  trackingUrl: { type: String, default: '' },

  // Realtime tracking metadata
  estimatedDelivery: { type: Date },
  currentLocation: { type: String, default: '' },
  deliveryAttempts: { type: Number, default: 0 },
  deliveredDate: { type: Date },
  lastSyncedAt: { type: Date, default: Date.now },

  // Failure Retry Queue parameters
  retryCount: { type: Number, default: 0 },
  nextRetryAt: { type: Date },
  queueStatus: { type: String, enum: ['idle', 'queued', 'retrying', 'failed_max_retries'], default: 'idle' },

  // Complete history log & Audit log
  trackingHistory: [ShipmentHistorySchema],
  apiLogs: [ApiAuditLogSchema],

  // Error tracking
  lastError: { type: String, default: '' }
}, { timestamps: true });

ShipmentSchema.index({ order: 1, status: 1 });
ShipmentSchema.index({ awbCode: 1, provider: 1 });
ShipmentSchema.index({ status: 1, createdAt: -1 });
ShipmentSchema.index({ queueStatus: 1, nextRetryAt: 1 });

module.exports = mongoose.model('Shipment', ShipmentSchema);

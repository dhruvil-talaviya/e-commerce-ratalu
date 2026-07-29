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
  orderId: { type: String, required: true, index: true }, // Human readable order displayId e.g., RW-000101
  provider: { type: String, default: 'shiprocket' },

  // Provider specific identifiers
  shiprocketOrderId: { type: Number, index: true },
  shiprocketShipmentId: { type: Number, index: true },
  awbCode: { type: String, index: true, sparse: true },

  // Courier information
  courierCompanyId: { type: Number },
  courierName: { type: String },
  freightCharge: { type: Number, default: 0 },

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
      'Cancelled',
      'Failed'
    ],
    default: 'Shipment Created',
    index: true
  },
  providerStatus: { type: String, default: '' },
  providerEventTime: { type: Date },
  statusStatusCode: { type: Number }, // Shiprocket status code e.g. 6 = Shipped, 7 = Delivered

  // Physical specifications
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

  // Complete history log
  trackingHistory: [ShipmentHistorySchema],

  // Audit logs for all provider API calls
  apiLogs: [ApiAuditLogSchema],

  // Error tracking
  lastError: { type: String, default: '' }
}, { timestamps: true });

ShipmentSchema.index({ order: 1, status: 1 });
ShipmentSchema.index({ awbCode: 1, provider: 1 });

module.exports = mongoose.model('Shipment', ShipmentSchema);

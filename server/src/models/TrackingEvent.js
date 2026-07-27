const mongoose = require('mongoose');

const TrackingEventSchema = new mongoose.Schema({
  shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
  orderId: { type: String, required: true, index: true },
  awbCode: { type: String, required: true, index: true },
  status: { type: String, required: true },
  activity: { type: String, required: true },
  location: { type: String, default: '' },
  eventTime: { type: Date, default: Date.now },
  source: { type: String, enum: ['webhook', 'polling', 'manual_refresh'], default: 'polling' },
  rawData: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

TrackingEventSchema.index({ awbCode: 1, eventTime: -1 });

module.exports = mongoose.model('TrackingEvent', TrackingEventSchema);

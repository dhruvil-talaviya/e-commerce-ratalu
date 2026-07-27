const mongoose = require('mongoose');

const PickupRequestSchema = new mongoose.Schema({
  shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
  shipmentId: { type: Number, required: true },
  pickupLocation: { type: String, required: true },
  pickupScheduledDate: { type: Date, required: true },
  status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled', 'Failed'], default: 'Scheduled' },
  tokenNumber: { type: String, default: '' },
  responseDetails: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('PickupRequest', PickupRequestSchema);

const mongoose = require('mongoose');

const ShipmentTimelineSchema = new mongoose.Schema({
  status: { type: String, required: true },
  time: { type: Date, default: Date.now },
  note: { type: String }
});

const ShipmentSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  trackingNumber: { type: String, required: true },
  courierName: { type: String, required: true },
  status: { type: String, default: 'Picked Up' },
  timeline: [ShipmentTimelineSchema]
}, { timestamps: true });

module.exports = mongoose.model('Shipment', ShipmentSchema);

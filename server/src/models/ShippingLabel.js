const mongoose = require('mongoose');

const ShippingLabelSchema = new mongoose.Schema({
  shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
  shipmentId: { type: Number, required: true },
  awbCode: { type: String, required: true },
  labelUrl: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ShippingLabel', ShippingLabelSchema);

const mongoose = require('mongoose');

const CourierSchema = new mongoose.Schema({
  courierCompanyId: { type: Number, required: true, unique: true },
  courierName: { type: String, required: true },
  minWeight: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  codAvailable: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  coveragePincodesCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Courier', CourierSchema);

const mongoose = require('mongoose');

const DeliveryPartnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('DeliveryPartner', DeliveryPartnerSchema);

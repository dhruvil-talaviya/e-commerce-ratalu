const mongoose = require('mongoose');

const DeliveryPartnerSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  logo: { type: String, default: '' },
  contact: { type: String, required: true },
  email: { type: String, required: true },
  gst: { type: String, default: '' },
  address: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  apiKeys: { type: String, default: '' },
  supportedRegions: [{ type: String }],
  trackingUrl: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('DeliveryPartner', DeliveryPartnerSchema);

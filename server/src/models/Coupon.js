const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'flat'], required: true },
  value: { type: Number, required: true }, // 10 for 10% or 50 for ₹50
  minSubtotal: { type: Number, default: 0 },
  maxDiscount: { type: Number },
  expiryDate: { type: Date },
  usageLimit: { type: Number, default: 1000 },
  usageCount: { type: Number, default: 0 },
  description: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', CouponSchema);

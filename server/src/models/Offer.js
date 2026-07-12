const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  discount: { type: String, required: true }, // e.g. "Flat 15% Off", "Buy 2 Get 1"
  banner: { type: String, required: true }, // e.g. "Homepage Header Banner"
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  type: {
    type: String,
    enum: ['homepage', 'category', 'flash', 'festival', 'combo', 'bundle'],
    default: 'homepage'
  }
}, { timestamps: true });

module.exports = mongoose.model('Offer', OfferSchema);

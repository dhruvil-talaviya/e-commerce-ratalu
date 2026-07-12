const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  rating: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
  quote: { type: String, required: true },
  flavor: { type: String, required: true }, // e.g. "Original Salted"
  initials: { type: String, required: true },
  avatarGradient: {
    from: { type: String, required: true },
    to: { type: String, required: true }
  },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Review', ReviewSchema);

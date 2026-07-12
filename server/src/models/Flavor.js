const mongoose = require('mongoose');

const FlavorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  tagline: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  heat: { type: Number, enum: [0, 1, 2, 3], default: 0 },
  ingredients: [{ type: String }],
  gradient: {
    from: { type: String, required: true },
    via: { type: String, required: true },
    to: { type: String, required: true }
  },
  accent: { type: String, required: true },
  badge: { type: String },
  bestSeller: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Flavor', FlavorSchema);

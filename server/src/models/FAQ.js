const mongoose = require('mongoose');

const FAQSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true
  },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

FAQSchema.index({ active: 1, sortOrder: 1 });

module.exports = mongoose.model('FAQ', FAQSchema);

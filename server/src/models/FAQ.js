const mongoose = require('mongoose');

const FAQSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['Shipping', 'Shelf Life', 'Ingredients', 'Storage', 'Returns'],
    required: true
  },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('FAQ', FAQSchema);

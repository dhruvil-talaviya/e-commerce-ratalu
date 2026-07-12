const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  flavorId: { type: String, required: true },
  packId: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, max: 99 }
});

const CartSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    unique: true
  },
  items: [CartItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('Cart', CartSchema);

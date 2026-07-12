const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  tag: {
    type: String,
    enum: ['Home', 'Work', 'Other'],
    default: 'Home'
  },
  addressLine: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true }
}, { timestamps: true });

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  status: {
    type: String,
    enum: ['Active', 'Blocked'],
    default: 'Active'
  },
  addresses: [AddressSchema],
  activeAddressId: { type: String, default: null },
  refreshTokens: [String]
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);

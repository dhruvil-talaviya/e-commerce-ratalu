const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  houseNo: { type: String, required: true, trim: true },
  building: { type: String, trim: true, default: '' },
  street: { type: String, required: true, trim: true },
  area: { type: String, required: true, trim: true },
  landmark: { type: String, trim: true, default: '' },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  country: { type: String, default: 'India', trim: true },
  pinCode: { type: String, required: true, trim: true },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  accuracy: { type: Number, default: null },
  addressType: {
    type: String,
    enum: ['Home', 'Work', 'Other'],
    default: 'Home'
  },
  isDefault: { type: Boolean, default: false },
  tag: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
  addressLine: { type: String },
  pincode: { type: String }
}, { timestamps: true });

AddressSchema.set('toJSON', { virtuals: true });
AddressSchema.set('toObject', { virtuals: true });

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin'],
    default: 'admin'
  },
  addresses: [AddressSchema],
  activeAddressId: { type: String, default: null },
  refreshTokens: [String]
}, { timestamps: true });

AdminSchema.pre('validate', function (next) {
  // Always normalize role to lowercase
  this.role = 'admin';
  next();
});

// Hash password before saving
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

AdminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', AdminSchema);

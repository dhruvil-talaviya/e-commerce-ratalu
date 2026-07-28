const mongoose = require('mongoose');
const { isAdminPhone } = require('../config/admin');

/**
 * Address sub-document.
 *
 * Backward compatible: `tag`, `addressLine`, `city`, `state` and `pincode`
 * keep their original names and requirements, so existing documents and the
 * existing address APIs continue to work untouched. Everything below them is
 * an optional enrichment used by the redesigned checkout.
 */
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

  // Backward compatibility fields
  tag: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
  addressLine: { type: String },
  pincode: { type: String }
}, { timestamps: true });

AddressSchema.pre('validate', function (next) {
  this.tag = this.addressType;
  this.pincode = this.pinCode;
  const buildingPart = this.building ? `${this.building}, ` : '';
  const landmarkPart = this.landmark ? ` (Landmark: ${this.landmark})` : '';
  this.addressLine = `${this.houseNo}, ${buildingPart}${this.street}, ${this.area}${landmarkPart}`;
  next();
});

/**
 * The client addresses each entry by `id` (select, edit, delete, and the
 * `activeAddressId` comparison). Virtuals are not inherited from the parent
 * schema, so without this the subdocuments serialise with `_id` only and every
 * `addr.id` is undefined.
 */
AddressSchema.set('toJSON', { virtuals: true });
AddressSchema.set('toObject', { virtuals: true });

const bcrypt = require('bcryptjs');

const CustomerSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['google'],
    default: 'google'
  },
  googleId: { type: String, default: null },
  avatar: { type: String, default: '' },
  phone: { type: String, trim: true, default: null },
  role: {
    type: String,
    enum: ['customer'],
    default: 'customer'
  },
  status: {
    type: String,
    enum: ['Active', 'Blocked'],
    default: 'Active'
  },

  isEmailVerified: { type: Boolean, default: false },
  profileCompleted: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },

  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },

  lastLogin: { type: Date, default: null },

  addresses: [AddressSchema],
  activeAddressId: { type: String, default: null },

  // Commerce
  couponsUsed: [{ type: String, uppercase: true, trim: true }],

  /** Internal admin-only notes about this customer. */
  notes: { type: String, default: '' },

  refreshTokens: [String]
}, { timestamps: true });

// Performance indexes
CustomerSchema.index({ status: 1, createdAt: -1 });
CustomerSchema.index({ name: 'text', phone: 'text', email: 'text' });

// Hash password before saving
CustomerSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

CustomerSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

/** Self-heal legacy/incorrectly-cased roles */
CustomerSchema.pre('validate', function (next) {
  if (typeof this.role === 'string') {
    this.role = this.role.toLowerCase();
  }
  // Check profileCompleted
  const hasDefault = this.addresses && this.addresses.some(a => a.isDefault);
  if (this.name && this.phone && (hasDefault || (this.addresses && this.addresses.length > 0))) {
    this.profileCompleted = true;
  }
  next();
});

CustomerSchema.virtual('profileComplete').get(function () {
  const hasDefault = this.addresses && this.addresses.some(a => a.isDefault);
  return Boolean(this.name && this.name.trim().length > 0 && this.phone && (hasDefault || (this.addresses && this.addresses.length > 0)));
});

CustomerSchema.set('toJSON', { virtuals: true });
CustomerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Customer', CustomerSchema);

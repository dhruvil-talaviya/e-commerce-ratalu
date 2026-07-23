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

const CustomerSchema = new mongoose.Schema({
  /**
   * Passwordless auth: the customer is auto-created the moment their mobile
   * number is OTP-verified — before we know their name. `name` is therefore
   * optional here and captured later on the "Complete Profile" step.
   * (Previously `required: true`, which made auto-create impossible.)
   */
  name: { type: String, trim: true, default: '' },
  phone: { type: String, required: true, unique: true, trim: true },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    // sparse => many customers may have no email, but emails stay unique
    index: { unique: true, sparse: true }
  },
  /**
   * Must stay capitalised: `generateAccessToken` embeds this value and the
   * `protect` middleware routes 'Customer' tokens to this collection.
   */
  role: {
    type: String,
    enum: ['Customer'],
    default: 'Customer'
  },
  status: {
    type: String,
    enum: ['Active', 'Blocked'],
    default: 'Active'
  },

  addresses: [AddressSchema],
  activeAddressId: { type: String, default: null },

  // Commerce
  couponsUsed: [{ type: String, uppercase: true, trim: true }],

  /** Internal admin-only notes about this customer. */
  notes: { type: String, default: '' },

  refreshTokens: [String]
}, { timestamps: true });

// Performance indexes for frequent admin queries
CustomerSchema.index({ status: 1, createdAt: -1 });
CustomerSchema.index({ name: 'text', phone: 'text', email: 'text' });

/**
 * Self-heal legacy/incorrectly-cased roles (e.g. 'customer') so older
 * documents keep saving cleanly instead of failing enum validation.
 */
CustomerSchema.pre('validate', function (next) {
  if (typeof this.role === 'string' && this.role.toLowerCase() === 'customer') {
    this.role = 'Customer';
  }
  next();
});

/**
 * The store owner's number can never also be a customer.
 *
 * Enforced on the model rather than at each call site: the customer OTP verify
 * auto-registers any number it validates, and `register` / `updateProfile` can
 * both set a phone too. Guarding here means no current or future code path can
 * create a shadow customer for the admin number.
 */
CustomerSchema.pre('validate', function (next) {
  if (isAdminPhone(this.phone)) {
    return next(new Error(
      'This number belongs to the store admin and cannot be used for a customer account.'
    ));
  }
  next();
});

/** True once we have enough detail to actually ship this customer an order. */
CustomerSchema.virtual('profileComplete').get(function () {
  return Boolean(this.name && this.name.trim().length > 0);
});

CustomerSchema.set('toJSON', { virtuals: true });
CustomerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Customer', CustomerSchema);

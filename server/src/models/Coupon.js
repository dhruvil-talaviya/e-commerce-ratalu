const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'flat'], required: true },
  value: { type: Number, required: true }, // 10 for 10% or 50 for ₹50
  minSubtotal: { type: Number, default: 0 },
  maxDiscount: { type: Number },
  expiryDate: { type: Date },
  /** Total redemptions allowed across ALL customers. */
  usageLimit: { type: Number, default: 1000 },
  usageCount: { type: Number, default: 0 },

  /**
   * How many times ONE account may use this code.
   *
   * The old rule was hardcoded to "once ever" via Customer.couponsUsed, which
   * made a code like "5% off every order" impossible to express. 0 = unlimited.
   */
  perAccountLimit: { type: Number, default: 1 },

  /**
   * Only redeemable on a customer's FIRST order. This is what makes a real
   * welcome offer possible — previously "first order only" was a marketing
   * claim in the popup copy with nothing enforcing it.
   */
  firstOrderOnly: { type: Boolean, default: false },

  /* ─── Where this coupon is advertised ────────────────────────────────────
   *
   * Placement is owned by the coupon, not scattered across Settings. The
   * welcome-offer copy used to live in Settings (welcomeOfferTitle / …Coupon),
   * duplicating a code that also existed in this collection — so the popup could
   * advertise a code that was expired, inactive, or didn't exist.
   */
  showOnLoginPopup: { type: Boolean, default: false },
  showOnHomepage: { type: Boolean, default: false },

  /** Marketing copy shown wherever it's advertised. */
  title: { type: String, default: '' },        // "Get 10% OFF your first order!"
  displayLabel: { type: String, default: '' }, // "10% OFF"

  description: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', CouponSchema);

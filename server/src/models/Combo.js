const mongoose = require('mongoose');

/**
 * A bundle: several packs sold together for less than the sum of their parts.
 *
 * Distinct from `Offer`, which is a free-text marketing banner ("Flat 15% Off")
 * with no items and no price — it can't be added to a cart. A Combo is a real
 * purchasable thing: it names the exact packs and the price they cost together.
 *
 * Prices are stored, not computed at read time, because the customer must pay
 * what they were shown. If a pack's price changes later, `savings` is
 * recalculated for display but `comboPrice` stands until an admin changes it.
 */

const ComboItemSchema = new mongoose.Schema({
  flavorId: { type: String, required: true },   // Flavor.slug
  flavorName: { type: String, required: true }, // snapshot for display
  packId: { type: String, required: true },     // e.g. '200g'
  packLabel: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 }
}, { _id: false });

const ComboSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  images: { type: [String], default: [] },

  items: {
    type: [ComboItemSchema],
    validate: {
      validator: (v) => Array.isArray(v) && v.length >= 2,
      message: 'A combo needs at least two items — otherwise it is just a product.'
    }
  },

  /** What the customer pays for the bundle. */
  comboPrice: { type: Number, required: true, min: 0 },

  /** Sum of individual items at regular prices. */
  originalPrice: { type: Number, default: 0 },

  /** Which category this combo belongs to. */
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },

  badge: { type: String, default: '' },      // e.g. "Best value"
  rating: { type: Number, default: 4.8, min: 1, max: 5 },
  reviewCount: { type: Number, default: 16 },
  sortOrder: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },

  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },

  seo: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    keywords: { type: String, default: '' }
  },

  /** Optional scheduling window. */
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null }
}, { timestamps: true });

ComboSchema.index({ status: 1, sortOrder: 1 });

/** What the customer saves versus buying the packs separately. */
ComboSchema.virtual('savings').get(function () {
  return Math.max((this.originalPrice || 0) - (this.comboPrice || 0), 0);
});

ComboSchema.virtual('discountPercent').get(function () {
  if (!this.originalPrice) return 0;
  return Math.round(((this.originalPrice - this.comboPrice) / this.originalPrice) * 100);
});

/** Is this combo buyable right now? */
ComboSchema.methods.isLive = function (now = new Date()) {
  if (this.status !== 'Active') return false;
  if (this.startsAt && now < this.startsAt) return false;
  if (this.endsAt && now > this.endsAt) return false;
  return true;
};

ComboSchema.set('toJSON', { virtuals: true });
ComboSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Combo', ComboSchema);

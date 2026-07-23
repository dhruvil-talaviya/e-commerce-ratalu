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
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  maxQtyPerCheckout: { type: Number },
  image: { type: String },
  inStock: { type: Boolean, default: true },

  /**
   * Which category this product sits in. Was missing entirely — Category existed
   * as an orphan collection that nothing referenced, so category pages and
   * filters had nothing to filter on. Nullable: an uncategorised product still
   * shows in the full catalogue.
   */
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },

  // Product-level tax settings
  taxOverrideEnabled: { type: Boolean, default: false },
  taxRate: { type: Number, default: 5 },
  hsnCode: { type: String, default: '' },
  taxCategory: { type: String, default: '' },
  taxInclusive: { type: Boolean, default: true },

  /* ─── Product page content (was hardcoded in the React components) ────────
   *
   * All Mixed/loose sub-objects rather than rigid sub-schemas, because these are
   * CMS content: the admin adds an unlimited number of badges or highlights, and
   * a new field should not require a schema migration.
   *
   * They live on Flavor (not a separate collection) so they ride the existing
   * draft → preview → publish → version → restore engine for free. Adding them
   * to EDITABLE_FIELDS below is all that is needed.
   */

  /** Pills shown on the card and product page: "Best Seller", "New Arrival"… */
  labels: [{
    _id: false,
    text: String,
    tone: String,      // primary | success | warning | danger | neutral
    enabled: { type: Boolean, default: true },
    showOn: { type: String, default: 'all' } // all | product | card
  }],

  /** The three-up icon row under the gallery. Unlimited. */
  trustBadges: [{
    _id: false,
    icon: String,      // a name from the storefront icon registry
    title: String,
    description: String,
    color: String,
    enabled: { type: Boolean, default: true }
  }],

  /** Bullet highlights ("Freshly made", "Crispy texture"…). */
  highlights: [{
    _id: false,
    icon: String,
    title: String,
    description: String
  }],

  /** Per-100g nutrition table. */
  nutrition: {
    servingSize: { type: String, default: '100g' },
    calories: String,
    protein: String,
    fat: String,
    saturatedFat: String,
    carbohydrates: String,
    sugar: String,
    fibre: String,
    sodium: String,
    note: String
  },

  /** The legal / packaging block. */
  productInfo: {
    allergens: String,
    storage: String,
    shelfLife: String,
    countryOfOrigin: String,
    manufacturer: String,
    packedBy: String,
    netWeight: String,
    fssai: String
  },

  /**
   * Delivery copy. Blank fields fall back to the store-wide Settings values, so
   * a product only overrides what it needs to.
   */
  delivery: {
    title: String,
    description: String,
    estimate: String,
    dispatch: String,
    sameDay: { type: Boolean, default: false },
    codAvailable: { type: Boolean, default: true },
    returnSummary: String
  },

  /* ─── Draft / publish ─────────────────────────────────────────────────────
   *
   * Same shape as PageSection, deliberately: the fields ABOVE are what the
   * storefront serves (the published state), and `draft` is the admin's working
   * copy. Saving a draft can therefore never disturb the live site, and
   * publishing is one atomic copy of draft → live.
   *
   * Schemaless (Mixed) because a draft only carries the fields the admin
   * actually changed — a partial overlay, not a second full product.
   */
  draft: { type: mongoose.Schema.Types.Mixed, default: null },

  /** True while `draft` differs from what's live. Drives the "unpublished" pill. */
  hasUnpublishedChanges: { type: Boolean, default: false },

  publishedAt: { type: Date, default: null },
  publishedBy: { type: String, default: '' },
  updatedBy: { type: String, default: '' }
}, { timestamps: true });

/** The fields an admin may edit. Anything outside this list is ignored on save. */
FlavorSchema.statics.EDITABLE_FIELDS = [
  'name',
  'tagline',
  'description',
  'heat',
  'ingredients',
  'gradient',
  'accent',
  'badge',
  'bestSeller',
  'status',
  'maxQtyPerCheckout',
  'image',
  'inStock',
  'categoryId',
  // Product page content — inherits draft/preview/publish/versioning by being here.
  'labels',
  'trustBadges',
  'highlights',
  'nutrition',
  'productInfo',
  'delivery',
  'taxOverrideEnabled',
  'taxRate',
  'hsnCode',
  'taxCategory',
  'taxInclusive'
];

/**
 * What this product looks like WITH the draft applied — i.e. exactly what the
 * customer would see if it were published right now. This is what the preview
 * renders, so the preview cannot drift from the publish.
 */
FlavorSchema.methods.withDraft = function () {
  const live = this.toObject();
  if (!this.draft) return live;
  return { ...live, ...this.draft, draft: undefined };
};

module.exports = mongoose.model('Flavor', FlavorSchema);

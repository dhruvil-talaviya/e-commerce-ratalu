const mongoose = require('mongoose');

/**
 * A single editable section of the website.
 *
 * This is the backbone of the Website Builder. Every visible block on the
 * storefront — hero, announcement bar, why-choose-us, newsletter, footer — is
 * one of these documents, so the owner can edit copy, images, links, ordering
 * and visibility without touching code.
 *
 * Draft vs published
 * ------------------
 * `draft` is the working copy the admin edits; `published` is what the
 * storefront serves. They are separate fields rather than separate documents so
 * that saving a draft can never disturb the live site, and publishing is a
 * single atomic copy of draft → published.
 *
 * `content` is intentionally schemaless (Mixed): a hero has slides, a footer has
 * link columns, a newsletter has a headline. Forcing one rigid shape across all
 * section types would mean a schema migration every time a new section is added.
 * The shape each section expects is documented in its admin editor.
 */
const PageSectionSchema = new mongoose.Schema({
  /** Which page this section belongs to, e.g. 'homepage', 'contact'. */
  page: { type: String, required: true, trim: true, index: true },

  /** Stable identifier within the page, e.g. 'hero'. Never shown to customers. */
  key: { type: String, required: true, trim: true },

  /** Human label shown in the Website Builder list. */
  label: { type: String, required: true, trim: true },

  /** Drives which editor form the admin console renders. */
  type: {
    type: String,
    enum: [
      'hero',
      'announcement',
      'rich-text',
      'feature-grid',
      'product-list',
      'testimonials',
      'newsletter',
      'faq',
      'offers',
      'gallery',
      'contact',
      'footer',
      'custom'
    ],
    default: 'custom'
  },

  // ─── Live vs working copy ──────────────────────────────────────────────────
  published: { type: mongoose.Schema.Types.Mixed, default: null },
  draft: { type: mongoose.Schema.Types.Mixed, default: null },

  /** True when `draft` differs from `published` — drives the "unpublished changes" pill. */
  hasUnpublishedChanges: { type: Boolean, default: false },

  // ─── Display ───────────────────────────────────────────────────────────────
  enabled: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },

  // ─── Scheduling ────────────────────────────────────────────────────────────
  // A section is live when enabled AND now is within [publishAt, expireAt].
  // Null on either side means "no bound".
  publishAt: { type: Date, default: null },
  expireAt: { type: Date, default: null },

  // ─── Audit ─────────────────────────────────────────────────────────────────
  updatedBy: { type: String, default: '' },
  publishedAt: { type: Date, default: null },
  publishedBy: { type: String, default: '' }
}, { timestamps: true });

// One section per key per page.
PageSectionSchema.index({ page: 1, key: 1 }, { unique: true });
PageSectionSchema.index({ page: 1, enabled: 1, sortOrder: 1 });

/**
 * Should the storefront render this section right now?
 * Enabled, published, and inside its schedule window.
 */
PageSectionSchema.methods.isLive = function (now = new Date()) {
  if (!this.enabled) return false;
  if (!this.published) return false;
  if (this.publishAt && now < this.publishAt) return false;
  if (this.expireAt && now > this.expireAt) return false;
  return true;
};

module.exports = mongoose.model('PageSection', PageSectionSchema);

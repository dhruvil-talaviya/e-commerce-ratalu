const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
  // ─── Content ───────────────────────────────────────────────────────────────
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  imageUrl: { type: String, required: true },
  mobileImageUrl: { type: String, default: '' },  // optional mobile-specific image

  // ─── Call to Action ────────────────────────────────────────────────────────
  ctaText: { type: String, default: '' },
  ctaLink: { type: String, default: '/' },
  ctaStyle: {
    type: String,
    enum: ['primary', 'secondary', 'outline', 'ghost'],
    default: 'primary'
  },

  // ─── Display Settings ──────────────────────────────────────────────────────
  type: {
    type: String,
    enum: ['hero', 'slider', 'offer', 'category', 'promotional'],
    default: 'slider'
  },
  position: {
    type: String,
    enum: ['homepage-hero', 'homepage-slider', 'offers-page', 'category-page', 'sidebar'],
    default: 'homepage-slider'
  },
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true },

  // ─── Styling ───────────────────────────────────────────────────────────────
  textColor: { type: String, default: '#ffffff' },
  overlayColor: { type: String, default: 'rgba(0,0,0,0.3)' },
  textAlign: {
    type: String,
    enum: ['left', 'center', 'right'],
    default: 'center'
  },

  // ─── Schedule ──────────────────────────────────────────────────────────────
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null }

}, { timestamps: true });

// Index for fast ordering queries
BannerSchema.index({ active: 1, position: 1, sortOrder: 1 });

module.exports = mongoose.model('Banner', BannerSchema);

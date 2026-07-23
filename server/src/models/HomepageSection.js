const mongoose = require('mongoose');

const HomepageSectionSchema = new mongoose.Schema({
  // ─── Identifier ────────────────────────────────────────────────────────────
  sectionName: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'hero',
      'announcement',
      'categories',
      'featured-products',
      'best-sellers',
      'offers',
      'about',
      'testimonials',
      'faqs',
      'newsletter',
      'instagram-gallery',
      'why-choose-us',
      'how-its-made'
    ]
  },

  // ─── Display ───────────────────────────────────────────────────────────────
  enabled: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },

  // ─── Text Content ──────────────────────────────────────────────────────────
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  eyebrow: { type: String, default: '' },   // small label above the title

  // ─── Freeform JSON Content ─────────────────────────────────────────────────
  // Each section type may store its own shape of data here.
  // e.g. hero: { ctaText, ctaLink, backgroundImage }
  //      categories: { items: [...] }
  content: { type: mongoose.Schema.Types.Mixed, default: {} }

}, { timestamps: true });

HomepageSectionSchema.index({ enabled: 1, sortOrder: 1 });

module.exports = mongoose.model('HomepageSection', HomepageSectionSchema);

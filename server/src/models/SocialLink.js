const mongoose = require('mongoose');

/**
 * One social / contact channel, rendered wherever the site shows social icons
 * (header, footer, contact page, mobile menu).
 *
 * A collection rather than fields on Settings, because the spec calls for
 * arbitrary ordering, enable/disable and future platforms — all of which mean
 * adding a row, not a schema migration.
 */

/** Platforms the storefront knows how to render an icon for. */
const PLATFORMS = [
  'instagram',
  'facebook',
  'x',
  'linkedin',
  'youtube',
  'pinterest',
  'telegram',
  'threads',
  'snapchat',
  'discord',
  'whatsapp',
  'email',
  'phone'
];

const SocialLinkSchema = new mongoose.Schema({
  platform: { type: String, enum: PLATFORMS, required: true, unique: true },

  /** Full URL, or a mailto:/tel: for email and phone. */
  url: { type: String, default: '' },
  username: { type: String, default: '' },

  /** Overrides the built-in icon. Reserved for a future custom-icon upload. */
  icon: { type: String, default: '' },

  sortOrder: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true },
  openInNewTab: { type: Boolean, default: true }
}, { timestamps: true });

SocialLinkSchema.index({ enabled: 1, sortOrder: 1 });
SocialLinkSchema.statics.PLATFORMS = PLATFORMS;

module.exports = mongoose.model('SocialLink', SocialLinkSchema);

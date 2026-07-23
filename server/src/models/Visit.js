const mongoose = require('mongoose');

/**
 * One page view by one visitor.
 *
 * Deliberately minimal and privacy-light: we store a random visitor id (set as a
 * cookie/localStorage value by the browser, NOT tied to any account), the path,
 * and whether the visitor was signed in. No IP, no fingerprint. That's enough to
 * count "visitors today" and "page views" honestly without building a tracking
 * profile of anyone.
 *
 * TTL: raw visits are only needed for the rolling analytics window, so each doc
 * self-deletes after 90 days to keep the collection small.
 */
const VisitSchema = new mongoose.Schema(
  {
    /** Random per-browser id. Not linked to a customer. */
    visitorId: { type: String, required: true, index: true },
    path: { type: String, default: '/' },
    /** True if a customer session was active when the view happened. */
    authed: { type: Boolean, default: false },
    referrer: { type: String, default: '' },
  },
  { timestamps: true }
);

// Fast "today" queries, and auto-expiry after 90 days.
VisitSchema.index({ createdAt: -1 });
VisitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('Visit', VisitSchema);

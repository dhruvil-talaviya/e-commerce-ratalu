const mongoose = require('mongoose');

/**
 * An immutable snapshot of a section's content, written on every publish.
 *
 * Append-only by design: restoring an old version does not delete the newer
 * ones, it writes the old content back as a *new* draft. That means "restore"
 * is itself undoable, and the history is a true audit trail rather than
 * something the admin can rewrite.
 */
const ContentVersionSchema = new mongoose.Schema({
  page: { type: String, required: true, index: true },
  key: { type: String, required: true, index: true },

  /** Monotonic per (page,key). v1 is the first publish. */
  version: { type: Number, required: true },

  /** Full snapshot of what was published — not a diff, so restore never depends on replay. */
  content: { type: mongoose.Schema.Types.Mixed, required: true },

  /** What happened: 'publish' or 'restore'. */
  action: { type: String, enum: ['publish', 'restore'], default: 'publish' },

  /** Free-text note, e.g. "Restored from v3". */
  note: { type: String, default: '' },

  createdBy: { type: String, default: '' }
}, { timestamps: true });

ContentVersionSchema.index({ page: 1, key: 1, version: -1 });

module.exports = mongoose.model('ContentVersion', ContentVersionSchema);

const mongoose = require('mongoose');

/**
 * An admin-editable message template.
 *
 * Bodies contain `{variables}` which are substituted at send time. The set of
 * variables is an allowlist (see message.service.js) rather than free-form
 * interpolation — a template is admin-authored content, and blindly evaluating
 * whatever it contains against a live object is how you leak internals.
 */

/** Channels the templates can target. Only `whatsapp` actually delivers today. */
const CHANNELS = ['whatsapp', 'notification', 'email', 'sms'];

const MessageTemplateSchema = new mongoose.Schema({
  /** Stable identifier the code asks for, e.g. 'whatsapp.product_inquiry'. */
  key: { type: String, required: true, unique: true, trim: true },

  label: { type: String, required: true, trim: true },
  description: { type: String, default: '' },

  channel: { type: String, enum: CHANNELS, default: 'whatsapp' },

  /** Used by email/notification channels; WhatsApp deep links have no subject. */
  subject: { type: String, default: '' },

  body: { type: String, required: true },

  /**
   * Which variables this template is allowed to use. Shown to the admin as
   * clickable chips, and used to warn when a template references something the
   * calling context can't provide.
   */
  variables: [{ type: String }],

  enabled: { type: Boolean, default: true },

  /** Grouping in the admin UI: 'Support', 'Orders', 'Marketing'. */
  category: { type: String, default: 'General' }
}, { timestamps: true });

MessageTemplateSchema.statics.CHANNELS = CHANNELS;

module.exports = mongoose.model('MessageTemplate', MessageTemplateSchema);

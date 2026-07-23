const MessageTemplate = require('../models/MessageTemplate');
const Settings = require('../models/Settings');
const logger = require('../config/logger');

/**
 * Renders admin-authored templates and turns them into WhatsApp links/messages.
 *
 * Two rules keep this safe:
 *
 *   1. Substitution is a plain string replace over an ALLOWLIST of variable
 *      names. It never evaluates the template, and never walks an arbitrary
 *      object path — otherwise an admin could write `{customer.password}` (or
 *      worse) and the renderer would happily resolve it.
 *
 *   2. An unknown variable renders as an empty string, not as the literal
 *      `{foo}`. Customers should never receive a message with braces in it.
 */

/** Every variable a template may use, and how to derive it from the context. */
const VARIABLES = {
  customerName: (c) => c.customer?.name || 'there',
  customerPhone: (c) => c.customer?.phone || '',
  productName: (c) => c.product?.name || '',
  productPrice: (c) => (c.product?.price != null ? `₹${c.product.price}` : ''),
  productUrl: (c) => c.product?.url || '',
  orderNumber: (c) => c.order?.displayId || c.order?.id || '',
  orderStatus: (c) => c.order?.status || '',
  orderAmount: (c) => (c.order?.total != null ? `₹${c.order.total}` : ''),
  trackingNumber: (c) => c.order?.trackingNumber || '',
  refundId: (c) => c.refund?.refundId || '',
  refundAmount: (c) => (c.refund?.amount != null ? `₹${c.refund.amount}` : ''),
  couponCode: (c) => c.couponCode || '',
  storeName: (c) => c.settings?.storeName || 'Ratalu Wafers',
  supportNumber: (c) => c.settings?.storePhone || '',
  websiteUrl: (c) => c.settings?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || ''
};

/** Names the admin UI offers as clickable chips. */
const VARIABLE_NAMES = Object.keys(VARIABLES);

/**
 * Substitute `{variable}` tokens in a body.
 *
 * Unknown tokens collapse to '' so a stale template can't leak `{foo}` to a
 * customer. Whitespace inside the braces is tolerated: `{ orderNumber }`.
 */
const render = (body, context = {}) =>
  String(body || '').replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (_match, name) => {
    const resolver = VARIABLES[name];
    if (!resolver) return '';
    try {
      return String(resolver(context) ?? '');
    } catch {
      return '';
    }
  });

/** Fetch a template by key and render it. Returns null if missing/disabled. */
const renderTemplate = async (key, context = {}) => {
  const template = await MessageTemplate.findOne({ key, enabled: true }).lean();
  if (!template) return null;

  return {
    key,
    subject: render(template.subject, context),
    body: render(template.body, context)
  };
};

/* ------------------------------------------------------------------ */
/* WHATSAPP                                                           */
/* ------------------------------------------------------------------ */

/** Full international number, digits only — what wa.me expects. */
const whatsappNumber = (settings) =>
  `${settings.whatsappCountryCode || '91'}${settings.whatsappNumber || ''}`.replace(/\D/g, '');

/**
 * Build a click-to-chat link.
 *
 * This is the transport that works TODAY, with no Meta credentials, no business
 * verification and no cost: the customer's own WhatsApp opens with the message
 * pre-filled. It cannot *push* messages — that needs the Cloud API below.
 */
const buildWhatsAppLink = async (key, context = {}) => {
  const settings = (await Settings.findOne().lean()) || {};
  const number = whatsappNumber(settings);

  if (!number) return null;

  const rendered = await renderTemplate(key, { ...context, settings });
  const text = rendered?.body || '';

  return {
    number,
    text,
    url: `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`
  };
};

/**
 * Server-initiated WhatsApp (order confirmations, shipping updates, broadcasts).
 *
 * Deliberately a thin, honest shim. Meta's Cloud API needs a verified business,
 * a phone number id and an access token — none of which exist here. Rather than
 * pretend to send and silently drop the message, this logs and reports
 * `delivered: false` until credentials are configured. When they are, only the
 * body of the `if` below changes: every caller already speaks this interface.
 */
const sendWhatsApp = async (toPhone, key, context = {}) => {
  const settings = (await Settings.findOne().lean()) || {};

  const rendered = await renderTemplate(key, { ...context, settings });
  if (!rendered) {
    return { delivered: false, reason: `No enabled template for "${key}"` };
  }

  if (!settings.whatsappApiEnabled || !settings.whatsappAccessToken || !settings.whatsappPhoneNumberId) {
    logger.info(
      `[WhatsApp not configured] would send to ${toPhone}: ${rendered.body.slice(0, 80)}…`
    );
    return {
      delivered: false,
      reason: 'WhatsApp Business API is not configured. Add a phone number id and access token in Settings.',
      preview: rendered.body
    };
  }

  // ── Meta Cloud API ──────────────────────────────────────────────────────
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${settings.whatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.whatsappAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: String(toPhone).replace(/\D/g, ''),
          type: 'text',
          text: { body: rendered.body }
        })
      }
    );

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = body?.error?.message || `WhatsApp API returned ${res.status}`;
      logger.error(`WhatsApp send failed: ${message}`);
      return { delivered: false, reason: message, gateway: body };
    }

    return { delivered: true, messageId: body?.messages?.[0]?.id, gateway: body };
  } catch (error) {
    logger.error(`WhatsApp send error: ${error.message}`);
    return { delivered: false, reason: error.message };
  }
};

module.exports = {
  VARIABLES,
  VARIABLE_NAMES,
  render,
  renderTemplate,
  buildWhatsAppLink,
  sendWhatsApp,
  whatsappNumber
};

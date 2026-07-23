const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  // ─── Store Info ────────────────────────────────────────────────────────────
  storeName: { type: String, default: 'Ratalu Wafers' },
  storeLogo: { type: String, default: '' },
  storeLogoDark: { type: String, default: '' },
  storeFavicon: { type: String, default: '' },
  storeTagline: { type: String, default: 'India\'s finest purple yam wafers' },
  storeDescription: { type: String, default: 'Handcrafted purple yam wafers in 6 bold flavours. No artificial preservatives.' },

  // ─── Business Address ──────────────────────────────────────────────────────
  businessAddress: { type: String, default: '14 Marine Drive, Nariman Point, Mumbai, Maharashtra 400021' },
  businessCity: { type: String, default: 'Mumbai' },
  businessState: { type: String, default: 'Maharashtra' },
  businessPincode: { type: String, default: '400021' },

  // ─── GST / Tax / Registration ──────────────────────────────────────────────
  gstNumber: { type: String, default: '' },
  gstEnabled: { type: Boolean, default: true },
  taxRate: { type: Number, default: 5 }, // percentage, e.g. 5 for 5% GST
  companyRegistration: { type: String, default: '' },
  businessName: { type: String, default: 'Ratalu Wafers Private Limited' },
  panNumber: { type: String, default: '' },
  gstSlabs: { type: [Number], default: [0, 3, 5, 12, 18, 28] },
  defaultHsnCode: { type: String, default: '1905' },
  invoicePrefix: { type: String, default: 'INV-' },
  invoiceStartNumber: { type: Number, default: 1 },
  financialYear: { type: String, default: '2026-27' },
  reverseChargeEnabled: { type: Boolean, default: false },
  compositionSchemeEnabled: { type: Boolean, default: false },
  roundOffEnabled: { type: Boolean, default: true },
  taxInclusive: { type: Boolean, default: true },

  // ─── Email & Phone Channels ───────────────────────────────────────────────
  supportEmail: { type: String, default: 'support@rataluwafers.com' },
  salesEmail: { type: String, default: 'sales@rataluwafers.com' },
  customerCareNumber: { type: String, default: '+91 98250 22222' },
  businessWorkingHours: { type: String, default: '9 AM - 6 PM IST, Mon - Sat' },
  timeZone: { type: String, default: 'Asia/Kolkata' },
  currency: { type: String, default: 'INR' },
  language: { type: String, default: 'en' },

  // ─── Shipping ──────────────────────────────────────────────────────────────
  shippingFreeThreshold: { type: Number, default: 599 },  // free shipping above this
  shippingFlatRate: { type: Number, default: 49 },         // flat fee if below threshold

  // ─── Payment Methods ───────────────────────────────────────────────────────
  codEnabled: { type: Boolean, default: true },
  razorpayEnabled: { type: Boolean, default: true },
  upiEnabled: { type: Boolean, default: true },
  razorpayKeyId: { type: String, default: '' },

  // ─── Announcement Bar ──────────────────────────────────────────────────────
  announcementText: { type: String, default: 'Free shipping on orders above ₹599!' },
  announcementEnabled: { type: Boolean, default: true },
  announcementBgColor: { type: String, default: '#7c3aed' },
  announcementTextColor: { type: String, default: '#ffffff' },

  // ─── Welcome Offer Popup ───────────────────────────────────────────────────

  /* ─── Footer ───────────────────────────────────────────────────────────────
   * Contact details are NOT duplicated here. The footer reads supportEmail,
   * customerCareNumber and businessAddress — the same fields the console's
   * Company & Brand Profile edits. There used to be three copies of the same
   * email and phone, and the site rendered a different one from the one the
   * admin was editing.
   */
  footerTagline: { type: String, default: 'Small batch. Natural ingredients. Guilt-free crunch.' },
  footerCopyright: { type: String, default: '© 2026 Ratalu Wafers. All rights reserved.' },

  // ─── SEO / Head Integrations ──────────────────────────────────────────────
  seoTitle: { type: String, default: 'Ratalu Wafers — India\'s Finest Purple Yam Snacks' },
  seoDescription: { type: String, default: 'Handcrafted purple yam wafers in 6 bold flavours. No artificial preservatives. Free shipping above ₹599.' },
  seoKeywords: { type: String, default: 'ratalu wafers, purple yam chips, indian snacks, healthy chips' },
  ogImage: { type: String, default: '' },
  googleAnalyticsId: { type: String, default: '' },
  googleTagManagerId: { type: String, default: '' },
  facebookPixelId: { type: String, default: '' },
  metaVerification: { type: String, default: '' },
  googleSearchConsoleVerification: { type: String, default: '' },
  robotsTxt: { type: String, default: 'User-agent: *\nAllow: /\nSitemap: https://rataluwafers.com/sitemap.xml' },
  sitemapXml: { type: String, default: '' },

  // ─── Order Limits ──────────────────────────────────────────────────────────
  maxOrderLimit: { type: Number, default: 10 },

  // ─── WhatsApp Business ─────────────────────────────────────────────────────
  whatsappEnabled: { type: Boolean, default: true },
  whatsappCountryCode: { type: String, default: '91' },
  whatsappNumber: { type: String, default: '9825000000' },  // no country code
  whatsappButtonText: { type: String, default: 'Chat with us' },
  whatsappButtonPosition: {
    type: String,
    enum: ['bottom-right', 'bottom-left'],
    default: 'bottom-right'
  },
  whatsappShowOnDesktop: { type: Boolean, default: true },
  whatsappShowOnMobile: { type: Boolean, default: true },

  // Dynamic template overrides
  defaultGreetingMessage: { type: String, default: 'Hello, I need assistance regarding your products.' },
  defaultSupportMessage: { type: String, default: 'Hello, I need assistance regarding your products.' },
  defaultOrderInquiryMessage: { type: String, default: 'Hello, I would like to know the status of my order #{Order Number}.' },
  defaultProductInquiryMessage: { type: String, default: 'Hello, I am interested in the product: {Product Name}. Please provide more details.' },
  defaultBulkOrderMessage: { type: String, default: 'Hello, I would like to place a wholesale order. Please contact me.' },
  defaultRefundMessage: { type: String, default: 'Hello, I need assistance regarding my refund request for order #{Order Number}.' },
  defaultComplaintMessage: { type: String, default: 'Hello, I want to log a complaint.' },

  // ─── Video Library Management ──────────────────────────────────────────────
  homepageHeroVideo: { type: String, default: '' },
  ourStoryVideo: { type: String, default: '' },
  whyUsVideo: { type: String, default: '' },
  manufacturingProcessVideo: { type: String, default: '' },
  customerTestimonialsVideo: { type: String, default: '' },
  brandStoryVideo: { type: String, default: '' },
  autoplayVideo: { type: Boolean, default: true },
  muteVideo: { type: Boolean, default: true },
  loopVideo: { type: Boolean, default: true },

  /**
   * Meta Cloud API credentials. Left blank, the site falls back to wa.me deep
   * links — which need no credentials and work today. Filling these in enables
   * server-initiated messages (order confirmations, broadcasts) later without a
   * code change; see services/whatsapp.service.js.
   */
  whatsappApiEnabled: { type: Boolean, default: false },
  whatsappPhoneNumberId: { type: String, default: '' },
  whatsappAccessToken: { type: String, default: '' },

  // ─── Refunds & Returns ─────────────────────────────────────────────────────
  refundsEnabled: { type: Boolean, default: true },
  // Days after delivery in which a customer may still open a request.
  returnWindowDays: { type: Number, default: 7 },
  // Deducted from the customer's payout. 0 = we absorb it.
  restockingFeePercent: { type: Number, default: 0 },
  // Require the item back before money moves (vs. refund on approval).
  requireItemReceivedBeforeRefund: { type: Boolean, default: true },

  // ─── Maintenance Mode ──────────────────────────────────────────────────────
  // When on, the storefront serves a maintenance screen and every customer
  // write endpoint returns 503. Admin routes stay open so the switch can be
  // turned back off.
  maintenanceMode: { type: Boolean, default: false },
  maintenanceTitle: { type: String, default: 'We\'ll be right back' },
  maintenanceMessage: {
    type: String,
    default: 'We\'re doing a little kitchen upkeep. The store will be open again shortly — thanks for your patience!'
  },
  maintenanceEndsAt: { type: Date, default: null },

  // ─── About Us ─────────────────────────────────────────────────────────────
  aboutTitle: { type: String, default: 'Our Story' },
  aboutDescription: { type: String, default: '' },

  // ─── Our Story Page Content ───────────────────────────────────────────────
  ourStoryTitle: { type: String, default: 'A Humble Yam, Reimagined' },
  ourStoryDescription: { type: String, default: 'Born in Gujarat, kettle-cooked in small batches, and seasoned with local pride.' },
  ourStoryMainText: {
    type: String,
    default: 'Ratalu — the purple yam — has been a monsoon favourite in Gujarati kitchens for generations. We grew up on it. So we set out to do one thing exceptionally well: turn this humble root into the crispiest, most flavourful wafer you\'ve ever tasted.\n\nNo shortcuts. No factory line churning out millions. Just carefully chosen yam, thin-sliced, kettle-cooked in small batches, and seasoned by hand with spices we\'d proudly serve our own family.'
  },

  // ─── Why Choose Us Page Content ───────────────────────────────────────────
  whyUsTitle: { type: String, default: 'Why Choose Ratalu Chips' },
  whyUsDescription: {
    type: String,
    default: 'Crafting the ultimate guilt-free gourmet snack. Sourced responsibly, cooked traditionally, seasoned by hand.'
  },

  // ─── Contact Us Page Content ──────────────────────────────────────────────
  contactTitle: { type: String, default: 'We\'d love to hear from you' },
  contactDescription: {
    type: String,
    default: 'Questions about an order, wholesale, or just want to tell us your favourite flavour? Drop us a line.'
  },
  contactSupportHours: { type: String, default: 'Mon–Sat, 9 AM – 7 PM IST' },

  // ─── Contact Information ───────────────────────────────────────────────────
  contactMapEmbedUrl: { type: String, default: '' },
  contactWhatsapp: { type: String, default: '' },
  contactInstagram: { type: String, default: '' },
  contactFacebook: { type: String, default: '' },
  contactTwitter: { type: String, default: '' },

  // ─── Notifications ─────────────────────────────────────────────────────────
  notifyOrderPlaced: { type: Boolean, default: true },
  notifyOrderShipped: { type: Boolean, default: true },
  notifyOrderDelivered: { type: Boolean, default: true },
  notifyLowStock: { type: Boolean, default: true },
  lowStockThreshold: { type: Number, default: 10 },
  orderExpirationMinutes: { type: Number, default: 15 },

  // ─── Extended Business Policy Settings ──────────────────────────────────────
  inventoryEnabled: { type: Boolean, default: false },
  allowCustomerCancellationInPreparing: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);

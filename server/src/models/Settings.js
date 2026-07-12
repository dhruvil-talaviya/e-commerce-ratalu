const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  announcementText: { type: String, default: "Free shipping on orders above ₹599!" },
  announcementEnabled: { type: Boolean, default: true },
  footerEmail: { type: String, default: "hello@ratalu.com" },
  footerPhone: { type: String, default: "+91 98250 11111" },
  footerAddress: { type: String, default: "14 Marine Drive, Nariman Point, Mumbai, Maharashtra 400021" },
  maxOrderLimit: { type: Number, default: 10 },
  welcomeOfferTitle: { type: String, default: "Get 10% OFF on your first order!" },
  welcomeOfferDesc: { type: String, default: "Join thousands of happy snackers who love our natural, perfectly crispy purple yam wafers." },
  welcomeOfferCoupon: { type: String, default: "WELCOME10" },
  welcomeOfferDiscount: { type: String, default: "10% OFF" }
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);

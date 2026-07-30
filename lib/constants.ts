/**
 * Central brand configuration for Yamora Wafers. A single source of truth so copy,
 * contact details and links stay consistent across the site, metadata
 * and structured data.
 */
export const SITE = {
  name: "Yamora Wafers",
  legalName: "Yamora Wafers Pvt. Ltd.",
  tagline: "Crispy. Natural. Irresistible.",
  description:
    "Yamora Wafers are crafted from hand-selected fresh purple yam, thin-sliced and kettle-cooked into perfectly crispy wafers with unforgettable flavours. Small-batch, no artificial colours, delivered fresh across India.",
  url: "https://yamorawafers.com",
  email: "hello@yamorawafers.com",
  phone: "+91 98250 22222",
  phoneHref: "tel:+919825022222",
  whatsapp: "919825022222", // WhatsApp Business number (country code + number, no +)
  address: "Unit 7, Artisan Foods Park, Rajkot, Gujarat 360001, India",
  currency: "INR",
  gstRate: 0.05, // 5% GST on packaged namkeen/wafers
  freeShippingThreshold: 599,
  flatShippingFee: 49,
  social: {
    instagram: "https://instagram.com/yamorawafers",
    facebook: "https://facebook.com/yamorawafers",
    twitter: "https://twitter.com/yamorawafers",
    youtube: "https://youtube.com/@yamorawafers",
  },
} as const;

export const NAV_LINKS = [
  { label: "Shop", href: "/shop" },
  { label: "Our Story", href: "/our-story" },
  { label: "Why Us", href: "/why-us" },
  { label: "Reviews", href: "/reviews" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact Us", href: "/contact" },
] as const;

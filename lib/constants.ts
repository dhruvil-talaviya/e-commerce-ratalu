/**
 * Central brand configuration. A single source of truth so copy,
 * contact details and links stay consistent across the site, metadata
 * and structured data.
 */
export const SITE = {
  name: "Ratalu Wafers",
  legalName: "Ratalu Wafers Pvt. Ltd.",
  tagline: "Crispy. Natural. Irresistible.",
  description:
    "Ratalu Wafers are crafted from hand-selected fresh purple yam, thin-sliced and kettle-cooked into perfectly crispy wafers with unforgettable flavours. Small-batch, no artificial colours, delivered fresh across India.",
  url: "https://rataluwafers.com",
  email: "hello@rataluwafers.com",
  phone: "+91 98250 00000",
  phoneHref: "tel:+919825000000",
  address: "Unit 7, Artisan Foods Park, Rajkot, Gujarat 360001, India",
  currency: "INR",
  gstRate: 0.05, // 5% GST on packaged namkeen/wafers
  freeShippingThreshold: 599,
  flatShippingFee: 49,
  social: {
    instagram: "https://instagram.com/rataluwafers",
    facebook: "https://facebook.com/rataluwafers",
    twitter: "https://twitter.com/rataluwafers",
    youtube: "https://youtube.com/@rataluwafers",
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

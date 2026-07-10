export interface PolicySection {
  heading: string;
  body: string[];
}

export interface Policy {
  slug: string;
  title: string;
  summary: string;
  updated: string;
  sections: PolicySection[];
}

export const POLICIES: Policy[] = [
  {
    slug: "shipping",
    title: "Shipping & Delivery",
    summary: "How and when your Ratalu Wafers reach you.",
    updated: "1 January 2026",
    sections: [
      {
        heading: "Dispatch times",
        body: [
          "Orders placed before 2 PM IST are dispatched the same working day. Orders after 2 PM, or on Sundays and public holidays, are dispatched the next working day.",
        ],
      },
      {
        heading: "Delivery estimates",
        body: [
          "Metro cities: 2–3 business days. Rest of India: 4–6 business days. You'll receive a tracking link by email and SMS the moment your order ships.",
        ],
      },
      {
        heading: "Shipping charges",
        body: [
          "Enjoy free shipping on all orders above ₹599. For orders below ₹599, a flat shipping fee of ₹49 applies, calculated at checkout.",
        ],
      },
    ],
  },
  {
    slug: "returns",
    title: "Refund & Returns",
    summary: "Your happiness is guaranteed.",
    updated: "1 January 2026",
    sections: [
      {
        heading: "Freshness guarantee",
        body: [
          "If a pack arrives damaged, stale, or you're simply not delighted, write to us within 7 days of delivery with a photo and your order number. We'll send a free replacement or a full refund — no lengthy questions asked.",
        ],
      },
      {
        heading: "How refunds are processed",
        body: [
          "Approved refunds are credited back to your original payment method within 5–7 business days. For UPI and cards, timelines depend on your bank.",
        ],
      },
      {
        heading: "Food safety note",
        body: [
          "As a food product, opened packs cannot be resold and are therefore non-returnable unless there's a quality issue. This does not affect your statutory rights.",
        ],
      },
    ],
  },
  {
    slug: "refunds",
    title: "Refund Policy",
    summary: "Clear, fair and fast refunds.",
    updated: "1 January 2026",
    sections: [
      {
        heading: "Eligibility",
        body: [
          "You may request a refund within 7 days of delivery for damaged, defective or incorrect items. Please include your order number and a photo of the issue.",
        ],
      },
      {
        heading: "Timelines",
        body: [
          "Once approved, refunds are initiated immediately and typically reflect in your account within 5–7 business days depending on your bank or UPI provider.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "How we collect, use and protect your data.",
    updated: "1 January 2026",
    sections: [
      {
        heading: "What we collect",
        body: [
          "We collect the information you provide at checkout — name, contact details and delivery address — plus basic analytics about how you use our site. We never sell your personal data.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "Your data is used to process and deliver orders, provide support, and (only with your consent) send you offers and new-flavour news. You can unsubscribe from marketing at any time.",
        ],
      },
      {
        heading: "Security",
        body: [
          "Payments are processed securely by Razorpay; we never store full card details. Data is encrypted in transit and access is strictly limited.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    summary: "The terms that govern use of our store.",
    updated: "1 January 2026",
    sections: [
      {
        heading: "Using our store",
        body: [
          "By placing an order you confirm the information you provide is accurate and that you are authorised to use the chosen payment method. Prices and availability may change without notice.",
        ],
      },
      {
        heading: "Pricing & taxes",
        body: [
          "All prices are in Indian Rupees and inclusive of applicable taxes unless stated otherwise. GST is calculated and shown at checkout.",
        ],
      },
    ],
  },
  {
    slug: "fssai",
    title: "FSSAI & Compliance",
    summary: "Made to the highest food-safety standards.",
    updated: "1 January 2026",
    sections: [
      {
        heading: "Licensing",
        body: [
          "Ratalu Wafers is manufactured and packed in an FSSAI-licensed facility (Lic. No. 10012345678901). Every batch is traceable and quality-checked before dispatch.",
        ],
      },
      {
        heading: "Labelling",
        body: [
          "Each pack carries the manufacturing date, best-before date, full ingredient list, nutritional information and the veg mark, in line with FSSAI regulations.",
        ],
      },
    ],
  },
];

export function getPolicy(slug: string): Policy | undefined {
  return POLICIES.find((p) => p.slug === slug);
}

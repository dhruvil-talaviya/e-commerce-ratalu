import type { FaqItem } from "@/lib/types";

export const FAQS: FaqItem[] = [
  {
    id: "shipping",
    category: "Shipping",
    question: "How fast do you ship, and where do you deliver?",
    answer:
      "We process orders within 1–2 business days. Delivery typically takes 1–3 business days for local orders, 2–4 business days within Gujarat, and 3–7 business days for the rest of India. Delivery timelines may vary based on your location and courier serviceability.",
  },
  {
    id: "shelf-life",
    category: "Products",
    question: "How long do the wafers stay fresh?",
    answer:
      "Our wafers are freshly prepared in small batches and hygienically packed to lock in maximum crunch. They stay fresh for up to 3 months from the manufacturing date when stored in a cool, dry place. Once opened, keep them in an airtight container.",
  },
  {
    id: "returns",
    category: "Returns",
    question: "What is your refund and replacement policy?",
    answer:
      "Due to the perishable nature of our products, we do not accept returns. However, if you receive a damaged, defective, incorrect, or missing item, please contact us within 48 hours of delivery with your Order ID and photos/unboxing video. Verified claims will receive a free replacement or refund as per our Refund Policy.",
  },
  {
    id: "damaged-parcel",
    category: "Shipping",
    question: "What should I do if my parcel arrives damaged?",
    answer:
      "If the outer package appears damaged, tampered with, or unsealed, do not accept the delivery. Inform the delivery partner immediately and contact our customer support with photos. We will investigate right away and arrange a suitable resolution.",
  },
  {
    id: "cancellation",
    category: "Orders",
    question: "Can I cancel my order?",
    answer:
      "Yes. Orders can be cancelled within 5 minutes of placing them directly from your Account Dashboard. Once the 5-minute cancellation window expires, your order enters active kitchen preparation and cannot be cancelled.",
  },
  {
    id: "payments",
    category: "Payments",
    question: "Which payment methods do you accept?",
    answer:
      "We accept 100% prepaid online payments only, including UPI (GPay, PhonePe, Paytm), Credit Cards, Debit Cards, Net Banking, and Wallet payments through our secure PCI-DSS compliant payment gateway.",
  },
  {
    id: "freshness",
    category: "Products",
    question: "Are your wafers made fresh?",
    answer:
      "Yes! Our purple yam wafers are kettle-cooked in small batches using hand-selected fresh yam and cold-pressed oil, then nitrogen-flushed and hygienically sealed to guarantee fresh taste and irresistible crunch.",
  },
  {
    id: "account",
    category: "Orders",
    question: "Do I need an account to place an order?",
    answer:
      "Yes. You need to sign in using your Google account before placing an order. This ensures your delivery addresses, live tracking, order history, and account security are managed seamlessly.",
  },
  {
    id: "tracking",
    category: "Orders",
    question: "How can I track my order?",
    answer:
      "Once your order is shipped, you will receive real-time tracking links via SMS and email. You can also track your live shipment progress anytime directly under your Account Dashboard -> My Orders page on our website.",
  },
  {
    id: "support",
    category: "Support",
    question: "How can I contact customer support?",
    answer:
      "You can reach our support team via our Contact Us page, email us at yamorawafers@gmail.com, or chat with us on WhatsApp (+91 91041 18363). We operate Mon–Sat (10:00 AM – 7:00 PM) and respond within a few business hours.",
  },
];

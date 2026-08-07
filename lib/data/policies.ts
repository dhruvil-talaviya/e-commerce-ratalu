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
    title: "Shipping & Delivery Policy",
    summary: "Complete details on order processing, delivery timelines, tracking, and shipping coverage for Yamora Wafers.",
    updated: "7 August 2026",
    sections: [
      {
        heading: "1. Order Processing",
        body: [
          "At **Yamora Wafers**, we craft and package fresh purple yam snacks daily.\n\n• Orders are typically processed and dispatched within **1–2 business days** after order confirmation.\n• Orders placed on Sundays or national public holidays will be processed on the next business day.\n• During festive sales, new flavor launches, or high-demand periods, processing times may extend slightly."
        ]
      },
      {
        heading: "2. Shipping Coverage",
        body: [
          "We deliver fresh purple yam snacks across India to over 27,000+ PIN codes via our integrated logistics network (powered by Shiprocket and premium national couriers).\n\nDelivery availability and COD options depend on courier serviceability at your specific PIN code, which is verified automatically during checkout."
        ]
      },
      {
        heading: "3. Delivery Timelines",
        body: [
          "Estimated delivery windows from the date of courier dispatch:\n\n• **Local & Nearby (Rajkot / Saurashtra):** 1–2 business days\n• **Gujarat State:** 2–4 business days\n• **Metro Cities (Mumbai, Delhi, Bengaluru, etc.):** 2–5 business days\n• **Rest of India:** 3–7 business days\n\n*Please note that delivery timelines are estimates and may vary due to transit factors outside our direct control.*"
        ]
      },
      {
        heading: "4. Shipping Charges",
        body: [
          "• **Free Shipping:** Applicable on all orders above **₹599**.\n• **Standard Shipping:** A flat shipping fee of **₹49** applies for orders under ₹599.\n• Shipping charges (if applicable) are displayed transparently in your cart summary before payment."
        ]
      },
      {
        heading: "5. Real-Time Order Tracking",
        body: [
          "The moment your order is packed and dispatched, you will receive an AWB tracking code and tracking link via **SMS, Email, and WhatsApp**.\n\nYou can also monitor live shipment milestones directly under your **Account Dashboard -> Orders** page."
        ]
      },
      {
        heading: "6. Delivery Attempts & Failed Delivery",
        body: [
          "Our courier partners will attempt delivery up to **3 times** at your specified address.\n\nIf delivery fails due to an incorrect address, recipient unavailability, or refusal to accept the parcel, the shipment will be returned to our warehouse. Additional shipping fees may apply to re-ship returned packages."
        ]
      },
      {
        heading: "7. Address Accuracy & Modifications",
        body: [
          "Customers are responsible for providing complete and accurate shipping information (including house number, landmark, city, and 6-digit PIN code).\n\nYamora Wafers is not liable for delivery delays or misdeliveries resulting from inaccurate or incomplete address details provided during checkout."
        ]
      },
      {
        heading: "8. Damaged, Missing, or Tampered Shipments",
        body: [
          "If your parcel arrives physically damaged, tampered with, incomplete, or with incorrect items, please contact our support team within **24 hours of delivery** with:\n\n• Your **Order ID**\n• Unboxing photos/videos of the package and shipping label\n\nWe will investigate with the courier partner and dispatch a free replacement box or process a refund as per our Refund & Returns Policy."
        ]
      },
      {
        heading: "9. Unforeseen Delivery Delays",
        body: [
          "While we make every effort to deliver within promised timeframes, unexpected delays may occasionally occur due to extreme weather, transport strikes, festive rush, natural calamities, or regional movement restrictions.\n\nWe proactively track affected shipments and appreciate your patience in such events."
        ]
      },
      {
        heading: "10. Contact Shipping Support",
        body: [
          "If you have questions regarding an existing shipment or delivery serviceability, our logistics team is happy to assist:\n\n**Yamora Wafers Private Limited**\n• **Email:** yamorawafers@gmail.com\n• **Phone:** +91 91041 18363\n• **Address:** Surat, Gujarat\n• **Website:** https://yamorawafers.com"
        ]
      }
    ],
  },
  {
    slug: "returns",
    title: "Refund & Returns Policy",
    summary: "Clear, transparent information on return eligibility, refund processes, and order cancellations for Yamora Wafers.",
    updated: "7 August 2026",
    sections: [
      {
        heading: "1. Return Policy Overview",
        body: [
          "At **Yamora Wafers**, we are dedicated to crafting fresh, kettle-cooked purple yam snacks delivered with maximum quality. Because our products are fresh packaged food items, we generally **do not accept returns or exchanges** once an order has been delivered.\n\nHowever, if there is a defect or issue with your parcel, we are fully committed to making it right."
        ]
      },
      {
        heading: "2. Non-Returnable Items",
        body: [
          "Due to strict food safety and hygiene regulations, we cannot accept returns for:\n\n• Change of mind after order dispatch or delivery\n• Incorrect product or flavor selection made by the customer\n• Taste preferences or personal flavor opinions\n• Opened, unsealed, or partially consumed snack packs"
        ]
      },
      {
        heading: "3. Eligible Refunds or Replacements",
        body: [
          "You are fully eligible for a **free replacement box** or **refund** if:\n\n• You received the wrong product or flavor variant\n• The product or outer box was physically damaged during transit\n• The packaging seal was tampered with before arrival\n• The product has passed its best-before date upon delivery\n• Items are missing from your ordered pack\n\n*To request a claim, you must notify our customer support team within **24 hours of receiving your delivery**.*"
        ]
      },
      {
        heading: "4. How to Submit a Refund Claim",
        body: [
          "To initiate a claim, please reach out to our support team with:\n\n• Your **Order ID** (e.g., RW-000024)\n• Your registered Name and Mobile Number\n• Clear photos/videos of the damaged or wrong product and shipping label\n• A brief description of the issue\n\n*Claims submitted without visual proof or beyond the 24-hour delivery window may not be eligible for processing.*"
        ]
      },
      {
        heading: "5. Refund Approval & Resolution Options",
        body: [
          "Once your request is submitted, our Quality Assurance team will review the details promptly.\n\nDepending on the issue, we will offer one of the following resolutions:\n• A **Full Refund** credited to your original payment method\n• A **Partial Refund** for missing individual packs\n• A **Free Priority Replacement** dispatched at no extra charge"
        ]
      },
      {
        heading: "6. Refund Processing Timelines",
        body: [
          "All orders at Yamora Wafers are 100% prepaid. **Cash on Delivery (COD) is not available.**\n\nApproved refunds are credited back to your original source payment method:\n\n• **UPI (GPay / PhonePe / Paytm):** 2–5 business days\n• **Credit / Debit Cards:** 5–7 business days\n• **Net Banking:** 5–7 business days"
        ]
      },
      {
        heading: "7. Strict 5-Minute Order Cancellation Policy",
        body: [
          "Because our kitchen team begins processing, packing, and dispatching orders immediately:\n\n• **5-Minute Window:** Orders can ONLY be cancelled within **5 minutes** of placing the order via your account dashboard or by calling customer support.\n• **After 5 Minutes:** Once 5 minutes have elapsed, the order enters active preparation & dispatch, and **no cancellation or modification will be permitted** under any circumstances.\n• **Prepaid Refunds:** If cancelled within the 5-minute window, a **100% full refund** is automatically credited back to your original payment method."
        ]
      },
      {
        heading: "8. Delivery Issues & Non-Refundable Scenarios",
        body: [
          "Refunds or replacements **will not be issued** under the following delivery circumstances:\n\n• Attempting to cancel an order after the 5-minute cancellation window\n• Delivery failure due to an incorrect or incomplete address provided by the customer\n• Customer unavailable after multiple delivery attempts by the courier\n• Refusal to accept the parcel at doorstep\n• Normal minor aesthetic variations in packaging graphics that do not affect food quality"
        ]
      },
      {
        heading: "9. Contact Customer Support",
        body: [
          "For any return, refund, or delivery inquiries, our support team is ready to assist you:\n\n**Yamora Wafers**\n• **Email:** yamorawafers@gmail.com\n• **Phone:** +91 91041 18363\n• **Address:** Surat, Gujarat\n• **Website:** https://yamorawafers.com"
        ]
      }
    ],
  },
  {
    slug: "refunds",
    title: "Refund & Returns Policy",
    summary: "Clear, transparent information on return eligibility, refund processes, and order cancellations for Yamora Wafers.",
    updated: "7 August 2026",
    sections: [
      {
        heading: "1. Return Policy Overview",
        body: [
          "At **Yamora Wafers**, we are dedicated to crafting fresh, kettle-cooked purple yam snacks delivered with maximum quality. Because our products are fresh packaged food items, we generally **do not accept returns or exchanges** once an order has been delivered.\n\nHowever, if there is a defect or issue with your parcel, we are fully committed to making it right."
        ]
      },
      {
        heading: "2. Non-Returnable Items",
        body: [
          "Due to strict food safety and hygiene regulations, we cannot accept returns for:\n\n• Change of mind after order dispatch or delivery\n• Incorrect product or flavor selection made by the customer\n• Taste preferences or personal flavor opinions\n• Opened, unsealed, or partially consumed snack packs"
        ]
      },
      {
        heading: "3. Eligible Refunds or Replacements",
        body: [
          "You are fully eligible for a **free replacement box** or **refund** if:\n\n• You received the wrong product or flavor variant\n• The product or outer box was physically damaged during transit\n• The packaging seal was tampered with before arrival\n• The product has passed its best-before date upon delivery\n• Items are missing from your ordered pack\n\n*To request a claim, you must notify our customer support team within **24 hours of receiving your delivery**.*"
        ]
      },
      {
        heading: "4. How to Submit a Refund Claim",
        body: [
          "To initiate a claim, please reach out to our support team with:\n\n• Your **Order ID** (e.g., RW-000024)\n• Your registered Name and Mobile Number\n• Clear photos/videos of the damaged or wrong product and shipping label\n• A brief description of the issue\n\n*Claims submitted without visual proof or beyond the 24-hour delivery window may not be eligible for processing.*"
        ]
      },
      {
        heading: "5. Refund Approval & Resolution Options",
        body: [
          "Once your request is submitted, our Quality Assurance team will review the details promptly.\n\nDepending on the issue, we will offer one of the following resolutions:\n• A **Full Refund** credited to your original payment method\n• A **Partial Refund** for missing individual packs\n• A **Free Priority Replacement** dispatched at no extra charge"
        ]
      },
      {
        heading: "6. Refund Processing Timelines",
        body: [
          "All orders at Yamora Wafers are 100% prepaid. **Cash on Delivery (COD) is not available.**\n\nApproved refunds are credited back to your original source payment method:\n\n• **UPI (GPay / PhonePe / Paytm):** 2–5 business days\n• **Credit / Debit Cards:** 5–7 business days\n• **Net Banking:** 5–7 business days"
        ]
      },
      {
        heading: "7. Strict 5-Minute Order Cancellation Policy",
        body: [
          "Because our kitchen team begins processing, packing, and dispatching orders immediately:\n\n• **5-Minute Window:** Orders can ONLY be cancelled within **5 minutes** of placing the order via your account dashboard or by calling customer support.\n• **After 5 Minutes:** Once 5 minutes have elapsed, the order enters active preparation & dispatch, and **no cancellation or modification will be permitted** under any circumstances.\n• **Prepaid Refunds:** If cancelled within the 5-minute window, a **100% full refund** is automatically credited back to your original payment method."
        ]
      },
      {
        heading: "8. Delivery Issues & Non-Refundable Scenarios",
        body: [
          "Refunds or replacements **will not be issued** under the following delivery circumstances:\n\n• Attempting to cancel an order after the 5-minute cancellation window\n• Delivery failure due to an incorrect or incomplete address provided by the customer\n• Customer unavailable after multiple delivery attempts by the courier\n• Refusal to accept the parcel at doorstep\n• Normal minor aesthetic variations in packaging graphics that do not affect food quality"
        ]
      },
      {
        heading: "9. Contact Customer Support",
        body: [
          "For any return, refund, or delivery inquiries, our support team is ready to assist you:\n\n**Yamora Wafers**\n• **Email:** yamorawafers@gmail.com\n• **Phone:** +91 91041 18363\n• **Address:** Surat, Gujarat\n• **Website:** https://yamorawafers.com"
        ]
      }
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "Clear, transparent information about how Yamora Wafers collects, uses, stores, and safeguards your personal data.",
    updated: "7 August 2026",
    sections: [
      {
        heading: "1. Information We Collect",
        body: [
          "We collect information to provide you with a smooth snacking experience:\n\n• **Personal Information:** Full Name, Email Address, Mobile Number, Shipping Address, Billing Address, Order History, and Customer Support Communications.\n• **Account Information (Google Sign-In):** If you sign in via Google, we collect your Google account name, email address, and profile picture (if shared). *We never receive or store your Google password.*\n• **Technical Data:** IP Address, Browser Type, Device Information, Operating System, Website Usage Information, Cookies, and similar technologies."
        ]
      },
      {
        heading: "2. How We Use Your Information",
        body: [
          "We use your information to:\n\n• Create and manage your user account\n• Process, pack, and fulfill your orders\n• Deliver products directly to your specified address\n• Provide responsive customer support\n• Send order confirmations and real-time shipping updates\n• Improve our website performance and shopping experience\n• Prevent fraud and unauthorized account activity\n• Comply with legal and regulatory obligations\n• Send promotional offers and new flavor drops *(only if opted in)*"
        ]
      },
      {
        heading: "3. Google Sign-In Authentication",
        body: [
          "Our website allows you to sign in quickly and securely using your Google account.\n\n• We receive only the basic profile information you authorize Google to share.\n• We do **not** receive or store your Google password.\n• You may revoke our access at any time through your Google Account security settings."
        ]
      },
      {
        heading: "4. Payment Security",
        body: [
          "All online payments are processed securely through trusted, RBI-authorized payment providers (such as Razorpay).\n\n**We do not store or process sensitive financial data.** Your Credit/Debit card numbers, CVV, UPI PIN, or Net Banking credentials never touch our servers."
        ]
      },
      {
        heading: "5. Shipping & Delivery Fulfillment",
        body: [
          "To deliver your orders quickly and fresh, we share necessary order fulfillment information (Full Name, Mobile Number, Delivery Address, and Order Items) with our shipping and courier partners (e.g., Shiprocket).\n\nThis data is shared strictly for the purpose of parcel dispatch and delivery."
        ]
      },
      {
        heading: "6. Cookies & Browser Storage",
        body: [
          "Our website uses cookies and browser storage technologies to:\n\n• Keep you signed in securely\n• Remember your active shopping cart items\n• Improve website loading performance\n• Analyze website traffic patterns\n• Enhance your overall shopping experience\n\nYou can manage or disable cookies via your browser settings."
        ]
      },
      {
        heading: "7. Analytics & Advertising Tools",
        body: [
          "We use trusted third-party analytics and advertising tools, including:\n\n• Google Analytics\n• Google Ads\n• Meta (Facebook) Pixel\n\nThese services help us analyze aggregate website traffic, measure ad performance, and display relevant promotions without compromising individual identities."
        ]
      },
      {
        heading: "8. Sharing Your Information",
        body: [
          "We **never sell, rent, or trade** your personal information. We share data only with trusted service partners required to operate our business:\n\n• Payment service providers\n• Courier and logistics partners\n• Technology, hosting, and database service providers\n• Customer support tools\n• Government or regulatory authorities when required by Indian law"
        ]
      },
      {
        heading: "9. Data Security Measures",
        body: [
          "We take rigorous technical and organizational security measures to safeguard your personal information:\n\n• Full **HTTPS (SSL)** encryption across all pages\n• Restricted administrative access to customer data\n• Secure server infrastructure with regular security monitoring\n\nWhile no method of electronic storage is 100% immune, we continuously maintain best practices to protect your data."
        ]
      },
      {
        heading: "10. Data Retention",
        body: [
          "We retain your personal information only as long as necessary to:\n\n• Complete and deliver your orders\n• Maintain order history for customer support\n• Comply with statutory legal, tax, and accounting obligations\n• Resolve disputes and enforce our policies"
        ]
      },
      {
        heading: "11. Your Rights & Choices",
        body: [
          "You have the right to:\n\n• Access your personal information stored with us\n• Correct or update inaccurate account details\n• Delete your customer account (subject to legal record retention requirements)\n• Withdraw consent for promotional communications at any time"
        ]
      },
      {
        heading: "12. Children's Privacy",
        body: [
          "Our website is intended for individuals who are at least **18 years of age** or accessing the site under parent or legal guardian supervision. We do not knowingly collect personal information from children."
        ]
      },
      {
        heading: "13. Changes to This Privacy Policy",
        body: [
          "We may update this Privacy Policy periodically. Any revisions become effective immediately upon posting on this page with the updated revision date."
        ]
      },
      {
        heading: "14. Contact Us",
        body: [
          "If you have any questions, concerns, or privacy requests, please contact our team:\n\n**Yamora Wafers**\n• **Email:** yamorawafers@gmail.com\n• **Phone:** +91 91041 18363\n• **Address:** Surat, Gujarat\n• **Website:** https://yamorawafers.com"
        ]
      }
    ],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    summary: "Clear, transparent terms governing the use of the Yamora Wafers website and product purchases.",
    updated: "7 August 2026",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: [
          "Welcome to Yamora Wafers. By accessing our website, creating an account, or placing an order for our purple yam snacks, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service.\n\n*If you do not agree with any part of these terms, please discontinue using our website and services.*"
        ]
      },
      {
        heading: "2. Eligibility",
        body: [
          "You must be at least **18 years of age** or accessing the website under the supervision and authorization of a parent or legal guardian to make purchases or create an account on Yamora Wafers."
        ]
      },
      {
        heading: "3. Products & Availability",
        body: [
          "We take immense pride in crafting artisanal, kettle-cooked purple yam wafers. While we make every effort to represent our snacks with complete accuracy:\n\n• Product packaging, colors, and visuals are for illustrative purposes and may vary slightly in physical appearance.\n• All products are subject to stock availability. We reserve the right to limit order quantities or discontinue items without prior notice."
        ]
      },
      {
        heading: "4. Pricing & Tax Details",
        body: [
          "• All prices are displayed in **Indian Rupees (INR)**.\n• Prices include all applicable GST taxes unless explicitly stated otherwise at checkout.\n• Prices are subject to change without prior notice. We reserve the right to correct typographical or system pricing errors before order processing."
        ]
      },
      {
        heading: "5. Orders & Confirmation",
        body: [
          "An order is formally accepted and confirmed once payment is cleared (for prepaid orders) or once phone/OTP confirmation is completed (for Cash on Delivery orders, where applicable).\n\nWe reserve the right to refuse or cancel orders for reasons including:\n• Fraudulent, suspicious, or unauthorized activity\n• Stock unavailability or supply chain disruption\n• Pricing, technical, or system errors\n\n*If an order is cancelled after payment completion, full reimbursement will be processed swiftly as per our Refund Policy.*"
        ]
      },
      {
        heading: "6. Payment Security",
        body: [
          "Online payments on Yamora Wafers are processed securely via RBI-registered payment gateways (e.g., Razorpay).\n\n**We do not store sensitive payment details.** Your Credit/Debit card numbers, UPI PINs, CVV, or Net Banking credentials are never stored or accessible on our servers."
        ]
      },
      {
        heading: "7. Shipping & Delivery Terms",
        body: [
          "We partner with top-tier courier providers (via Shiprocket) to ensure fresh delivery across India.\n\n• Delivery timelines provided at checkout are estimates.\n• Delays may occasionally occur due to weather, regional restrictions, courier delays, or incorrect addresses provided by the customer.\n• Customers are responsible for providing complete and accurate shipping information."
        ]
      },
      {
        heading: "8. Order Cancellation",
        body: [
          "• Orders can be cancelled prior to dispatch directly from your account dashboard or by contacting customer support.\n• Once an order has been shipped and assigned a courier tracking number, cancellation is no longer possible."
        ]
      },
      {
        heading: "9. Returns & Damage Reports",
        body: [
          "Due to the perishable nature of packaged food snacks, returns are accepted strictly for **damaged, defective, or incorrect items** received.\n\nIf your parcel arrives damaged, please notify our team within **48 hours of delivery** with unboxing photos/videos of the package and shipping label so we can dispatch a replacement or issue a full refund."
        ]
      },
      {
        heading: "10. User Accounts & OTP Login",
        body: [
          "When creating an account or signing in via OTP:\n\n• You agree to provide accurate and current contact details.\n• You are responsible for maintaining the confidentiality of your login session.\n• You must notify us immediately if you suspect unauthorized access to your account."
        ]
      },
      {
        heading: "11. Prohibited Conduct",
        body: [
          "You agree not to engage in any of the following activities:\n\n• Using the website for unlawful or deceptive purposes\n• Attempting unauthorized access to website databases, servers, or backend APIs\n• Extracting data using automated bots, scrapers, or crawlers\n• Copying, redistributing, or re-selling website material without explicit written consent"
        ]
      },
      {
        heading: "12. Intellectual Property Rights",
        body: [
          "All content on this website — including the Yamora Wafers brand name, logos, packaging graphics, product photography, text copy, and website code — is the exclusive intellectual property of **Yamora Wafers Private Limited**.\n\nUnauthorized duplication or commercial use without prior written authorization is strictly prohibited."
        ]
      },
      {
        heading: "13. Limitation of Liability",
        body: [
          "To the maximum extent permitted under applicable law, Yamora Wafers shall not be liable for indirect, incidental, or consequential damages resulting from courier delays, temporary website downtime, or inaccurate delivery details submitted by customers.\n\n*Our total liability for any transaction shall not exceed the total monetary value paid for that specific order.*"
        ]
      },
      {
        heading: "14. Privacy Integration",
        body: [
          "Your use of our website and purchase of products is also governed by our comprehensive **Privacy Policy**, which outlines how your data is collected and protected."
        ]
      },
      {
        heading: "15. Amendments to Terms",
        body: [
          "We reserve the right to modify these Terms of Service at any time. Any changes will take effect immediately upon publication on this page with the updated revision date."
        ]
      },
      {
        heading: "16. Governing Law & Jurisdiction",
        body: [
          "These Terms of Service are governed by and construed in accordance with the laws of India.\n\nAny legal claims or legal disputes arising out of these terms or your purchases shall be subject to the exclusive jurisdiction of the courts located in **Gujarat, India**."
        ]
      },
      {
        heading: "17. Contact Information",
        body: [
          "If you have questions regarding these Terms of Service, please reach out to our team:\n\n**Yamora Wafers**\n• **Email:** yamorawafers@gmail.com\n• **Phone:** +91 91041 18363\n• **Address:** Surat, Gujarat\n• **Website:** https://yamorawafers.com"
        ]
      }
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

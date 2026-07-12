/**
 * Ratalu Wafers — Translation Dictionary
 * ----------------------------------------
 * Three languages: English (en), Hindi (hi), Gujarati (gu).
 * Rules:
 *  - Numbers, prices, weights, quantities always remain in English digits (0-9).
 *  - Product images, order IDs, coupon codes, OTPs stay unchanged.
 *  - EN is the source of truth; hi & gu must have identical keys.
 */

export const EN = {
  /* ---- Navigation ------------------------------------------------- */
  nav_shop:       "Shop",
  nav_our_story:  "Our Story",
  nav_why_us:     "Why Us",
  nav_reviews:    "Reviews",
  nav_faq:        "FAQ",
  nav_contact:    "Contact Us",
  nav_shop_now:   "Shop Now",
  nav_account:    "Account",
  nav_wishlist:   "Wishlist",
  nav_admin:      "Admin Console",
  nav_open_menu:  "Open menu",
  nav_close_menu: "Close menu",

  /* ---- Announcement bar ------------------------------------------ */
  announcement_default: "🎉 Free shipping on orders above ₹499! Use code FIRST10 for 10% off your first order.",

  /* ---- Hero ------------------------------------------------------- */
  hero_badge:        "Loved by {count}+ snackers",
  hero_heading_1:    "Crispy. Natural.",
  hero_heading_2:    "Irresistible.",
  hero_description:  "Made from hand-selected fresh Ratalu, kettle-cooked into perfectly crispy wafers with unforgettable flavours. Small-batch, no artificial colours, delivered fresh.",
  hero_cta_shop:     "Shop Now",
  hero_cta_explore:  "Explore Flavours",
  hero_stat_rating:  "Avg. rating",
  hero_stat_flavors: "Bold flavours",
  hero_stat_natural: "Natural",
  hero_price_from:   "From",
  hero_scroll:       "Scroll",

  /* ---- Best Sellers ----------------------------------------------- */
  bestsellers_eyebrow:      "Fan favourites",
  bestsellers_title_1:      "This week's",
  bestsellers_title_2:      "best sellers",
  bestsellers_description:  "The three packs flying off our shelves — loved by thousands across India.",
  bestsellers_view_all:     "View all",
  bestsellers_view_all_mob: "View all flavours",
  bestsellers_rank:         "#{rank} Best seller",

  /* ---- Product Card ----------------------------------------------- */
  card_add_to_cart: "Add to Cart",
  card_add:         "Add",
  card_wishlist:    "Wishlist",
  card_added:       "Added!",
  card_pack:        "{weight} Pack",
  card_off:         "{pct}% OFF",
  card_rating:      "{rating} · {count} reviews",

  /* ---- Flavor badges ---------------------------------------------- */
  badge_bestseller: "Best Seller",
  badge_new:        "New",
  badge_hot:        "Hot 🔥",
  badge_signature:  "Signature",

  /* ---- Heat labels ------------------------------------------------ */
  heat_0: "Mild",
  heat_1: "Gentle",
  heat_2: "Medium",
  heat_3: "Fiery 🔥",

  /* ---- Section headings ------------------------------------------ */
  farm_fresh_eyebrow:     "From the earth",
  farm_fresh_title:       "Farm Fresh",
  why_us_eyebrow:         "Why Ratalu",
  why_us_title:           "Why choose us",
  reviews_eyebrow:        "Happy customers",
  reviews_title:          "What our snackers say",
  faq_eyebrow:            "Questions?",
  faq_title:              "Frequently Asked",
  newsletter_eyebrow:     "Stay in the loop",
  newsletter_title:       "Get the best deals",
  newsletter_placeholder: "Enter your email",
  newsletter_cta:         "Subscribe",

  /* ---- Footer ---------------------------------------------------- */
  footer_tagline:       "Crispy. Natural. Irresistible. Small-batch purple-yam wafers, kettle-cooked and delivered fresh across India.",
  footer_col_shop:      "Shop",
  footer_col_company:   "Company",
  footer_col_support:   "Support",
  footer_col_legal:     "Legal",
  footer_made_in:       "Made with care in Gujarat, India",
  footer_fssai:         "FSSAI Lic. 10012345678901",

  /* ---- Account --------------------------------------------------- */
  account_title:         "Welcome back, {name}",
  account_description:   "Manage your orders, addresses, wishlist and rewards — all in one place.",
  tab_profile:           "Profile",
  tab_orders:            "Orders",
  tab_addresses:         "Addresses",
  tab_wishlist:          "Wishlist",
  tab_rewards:           "Rewards",
  tab_coupons:           "Coupons",
  tab_settings:          "Settings",

  /* ---- Settings tab ---------------------------------------------- */
  settings_title:             "Preferences",
  settings_language_label:    "Language",
  settings_language_subtitle: "Choose your preferred language for the interface",
  settings_language_en:       "English",
  settings_language_hi:       "हिन्दी (Hindi)",
  settings_language_gu:       "ગુજરાતી (Gujarati)",
  settings_saved:             "Preferences saved!",

  /* ---- Common ---------------------------------------------------- */
  common_loading:        "Loading…",
  common_error:          "Something went wrong.",
  common_free_shipping:  "Free shipping",
  common_in_stock:       "In stock",
  common_out_of_stock:   "Out of stock",
  common_login_required: "Sign in required",
  common_login_prompt:   "Please log in to manage your account details.",
  common_currency:       "₹",
} as const;

export const HI: Record<keyof typeof EN, string> = {
  /* ---- Navigation ------------------------------------------------- */
  nav_shop:       "दुकान",
  nav_our_story:  "हमारी कहानी",
  nav_why_us:     "क्यों हम",
  nav_reviews:    "समीक्षाएँ",
  nav_faq:        "सवाल-जवाब",
  nav_contact:    "संपर्क करें",
  nav_shop_now:   "अभी खरीदें",
  nav_account:    "खाता",
  nav_wishlist:   "विशलिस्ट",
  nav_admin:      "एडमिन कंसोल",
  nav_open_menu:  "मेनू खोलें",
  nav_close_menu: "मेनू बंद करें",

  /* ---- Announcement bar ------------------------------------------ */
  announcement_default: "🎉 ₹499 से ऊपर के ऑर्डर पर मुफ्त डिलीवरी! पहले ऑर्डर पर 10% छूट के लिए FIRST10 का उपयोग करें।",

  /* ---- Hero ------------------------------------------------------- */
  hero_badge:        "{count}+ ग्राहकों का प्यार",
  hero_heading_1:    "कुरकुरा। प्राकृतिक।",
  hero_heading_2:    "अप्रतिरोध्य।",
  hero_description:  "ताज़े रतालू से बने, कड़ाही में पकाए गए, लाजवाब स्वाद वाले वेफर्स। छोटे बैच में, बिना कृत्रिम रंग के, सीधे आपके दरवाज़े तक।",
  hero_cta_shop:     "अभी खरीदें",
  hero_cta_explore:  "फ्लेवर देखें",
  hero_stat_rating:  "औसत रेटिंग",
  hero_stat_flavors: "बेहतरीन फ्लेवर",
  hero_stat_natural: "प्राकृतिक",
  hero_price_from:   "से शुरू",
  hero_scroll:       "स्क्रोल करें",

  /* ---- Best Sellers ----------------------------------------------- */
  bestsellers_eyebrow:      "पसंदीदा प्रोडक्ट",
  bestsellers_title_1:      "इस हफ्ते के",
  bestsellers_title_2:      "बेस्ट सेलर",
  bestsellers_description:  "हज़ारों ग्राहकों की पसंद — ये तीन पैक सबसे ज़्यादा बिकते हैं।",
  bestsellers_view_all:     "सभी देखें",
  bestsellers_view_all_mob: "सभी फ्लेवर देखें",
  bestsellers_rank:         "#{rank} बेस्ट सेलर",

  /* ---- Product Card ----------------------------------------------- */
  card_add_to_cart: "कार्ट में जोड़ें",
  card_add:         "जोड़ें",
  card_wishlist:    "विशलिस्ट",
  card_added:       "जोड़ा गया!",
  card_pack:        "{weight} पैक",
  card_off:         "{pct}% छूट",
  card_rating:      "{rating} · {count} समीक्षाएँ",

  /* ---- Flavor badges ---------------------------------------------- */
  badge_bestseller: "बेस्ट सेलर",
  badge_new:        "नया",
  badge_hot:        "तीखा 🔥",
  badge_signature:  "सिग्नेचर",

  /* ---- Heat labels ------------------------------------------------ */
  heat_0: "हल्का",
  heat_1: "सौम्य",
  heat_2: "मध्यम",
  heat_3: "तीखा 🔥",

  /* ---- Section headings ------------------------------------------ */
  farm_fresh_eyebrow:     "धरती से",
  farm_fresh_title:       "खेत की ताज़गी",
  why_us_eyebrow:         "क्यों रतालू",
  why_us_title:           "हमें क्यों चुनें",
  reviews_eyebrow:        "खुश ग्राहक",
  reviews_title:          "हमारे ग्राहक क्या कहते हैं",
  faq_eyebrow:            "सवाल हैं?",
  faq_title:              "अक्सर पूछे जाने वाले सवाल",
  newsletter_eyebrow:     "जुड़े रहें",
  newsletter_title:       "बेहतरीन ऑफर पाएँ",
  newsletter_placeholder: "अपना ईमेल दर्ज करें",
  newsletter_cta:         "सदस्यता लें",

  /* ---- Footer ---------------------------------------------------- */
  footer_tagline:       "कुरकुरा। प्राकृतिक। अप्रतिरोध्य। छोटे बैच में बने रतालू वेफर्स, कड़ाही में पकाए गए, पूरे भारत में ताज़ा डिलीवरी।",
  footer_col_shop:      "दुकान",
  footer_col_company:   "कंपनी",
  footer_col_support:   "सहायता",
  footer_col_legal:     "कानूनी",
  footer_made_in:       "गुजरात, भारत में प्रेम से बनाया गया",
  footer_fssai:         "FSSAI लाइसेंस नं. 10012345678901",

  /* ---- Account --------------------------------------------------- */
  account_title:         "वापस स्वागत है, {name}",
  account_description:   "अपने ऑर्डर, पते, विशलिस्ट और रिवॉर्ड एक जगह से प्रबंधित करें।",
  tab_profile:           "प्रोफ़ाइल",
  tab_orders:            "ऑर्डर",
  tab_addresses:         "पते",
  tab_wishlist:          "विशलिस्ट",
  tab_rewards:           "रिवॉर्ड",
  tab_coupons:           "कूपन",
  tab_settings:          "सेटिंग्स",

  /* ---- Settings tab ---------------------------------------------- */
  settings_title:             "प्राथमिकताएँ",
  settings_language_label:    "भाषा",
  settings_language_subtitle: "अपनी पसंदीदा भाषा चुनें",
  settings_language_en:       "English",
  settings_language_hi:       "हिन्दी (Hindi)",
  settings_language_gu:       "ગુજરાતી (Gujarati)",
  settings_saved:             "प्राथमिकताएँ सहेजी गईं!",

  /* ---- Common ---------------------------------------------------- */
  common_loading:        "लोड हो रहा है…",
  common_error:          "कुछ गलत हो गया।",
  common_free_shipping:  "मुफ्त डिलीवरी",
  common_in_stock:       "स्टॉक में है",
  common_out_of_stock:   "स्टॉक में नहीं",
  common_login_required: "लॉगिन आवश्यक है",
  common_login_prompt:   "अपने खाते का विवरण प्रबंधित करने के लिए लॉगिन करें।",
  common_currency:       "₹",
};

export const GU: Record<keyof typeof EN, string> = {
  /* ---- Navigation ------------------------------------------------- */
  nav_shop:       "દુકાન",
  nav_our_story:  "અમારી વાર્તા",
  nav_why_us:     "શા માટે અમે",
  nav_reviews:    "સમીક્ષાઓ",
  nav_faq:        "પ્રશ્નો",
  nav_contact:    "સંપર્ક કરો",
  nav_shop_now:   "હવે ખરીદો",
  nav_account:    "એકાઉન્ટ",
  nav_wishlist:   "વિશલિસ્ટ",
  nav_admin:      "એડમિન કન્સોલ",
  nav_open_menu:  "મેનૂ ખોલો",
  nav_close_menu: "મેનૂ બંધ કરો",

  /* ---- Announcement bar ------------------------------------------ */
  announcement_default: "🎉 ₹499 થી વધુ ઓર્ડર પર મફત ડિલિવરી! પ્રથમ ઓર્ડર પર 10% છૂટ માટે FIRST10 વાપરો।",

  /* ---- Hero ------------------------------------------------------- */
  hero_badge:        "{count}+ ગ્રાહકોનો પ્રેમ",
  hero_heading_1:    "ક્રિસ્પી. કુદરતી.",
  hero_heading_2:    "અપ્રતિરોધ્ય.",
  hero_description:  "તાજા રતાળુમાંથી બનેલા, કઢાઈમાં પકવેલા, અવિસ્મરણીય સ્વાદ વાળા વેફર્સ. નાના બૅચમાં, કૃત્રિમ રંગ વિના, સીધા તમારા દ્વાર સુધી.",
  hero_cta_shop:     "હવે ખરીદો",
  hero_cta_explore:  "ફ્લેવર જુઓ",
  hero_stat_rating:  "સરેરાશ રેટિંગ",
  hero_stat_flavors: "અસાધારણ ફ્લેવર",
  hero_stat_natural: "કુદરતી",
  hero_price_from:   "થી શરૂ",
  hero_scroll:       "સ્ક્રોલ કરો",

  /* ---- Best Sellers ----------------------------------------------- */
  bestsellers_eyebrow:      "પ્રિય ઉત્પાદનો",
  bestsellers_title_1:      "આ અઠવાડિયાના",
  bestsellers_title_2:      "બેસ્ટ સેલર",
  bestsellers_description:  "હજારો ગ્રાહકોની પસંદ — આ ત્રણ પૅક સૌથી વધુ વેચાય છે.",
  bestsellers_view_all:     "બધા જુઓ",
  bestsellers_view_all_mob: "બધા ફ્લેવર જુઓ",
  bestsellers_rank:         "#{rank} બેસ્ટ સેલર",

  /* ---- Product Card ----------------------------------------------- */
  card_add_to_cart: "કાર્ટમાં ઉમેરો",
  card_add:         "ઉમેરો",
  card_wishlist:    "વિશલિસ્ટ",
  card_added:       "ઉમેર્યું!",
  card_pack:        "{weight} પૅક",
  card_off:         "{pct}% છૂટ",
  card_rating:      "{rating} · {count} સમીક્ષા",

  /* ---- Flavor badges ---------------------------------------------- */
  badge_bestseller: "બેસ્ટ સેલર",
  badge_new:        "નવો",
  badge_hot:        "તીખો 🔥",
  badge_signature:  "સિગ્નેચર",

  /* ---- Heat labels ------------------------------------------------ */
  heat_0: "હળવો",
  heat_1: "સૌમ્ય",
  heat_2: "મધ્યમ",
  heat_3: "તીખો 🔥",

  /* ---- Section headings ------------------------------------------ */
  farm_fresh_eyebrow:     "ધરતીમાંથી",
  farm_fresh_title:       "ખેતર-તાજો",
  why_us_eyebrow:         "શા માટે રતાળુ",
  why_us_title:           "અમને શા માટે પસંદ કરો",
  reviews_eyebrow:        "ખુશ ગ્રાહકો",
  reviews_title:          "અમારા ગ્રાહકો શું કહે છે",
  faq_eyebrow:            "પ્રશ્નો છે?",
  faq_title:              "વારંવાર પૂછાતા પ્રશ્નો",
  newsletter_eyebrow:     "જોડાયેલા રહો",
  newsletter_title:       "શ્રેષ્ઠ ઑફર મેળવો",
  newsletter_placeholder: "તમારો ઈ-મેઈલ દાખલ કરો",
  newsletter_cta:         "સભ્ય બનો",

  /* ---- Footer ---------------------------------------------------- */
  footer_tagline:       "ક્રિસ્પી. કુદરતી. અપ્રતિરોધ્ય. નાના બૅચ રતાળુ વેફર્સ, કઢાઈમાં પકવેલા, ભારત ભરમાં તાજા ડિલિવરી.",
  footer_col_shop:      "દુકાન",
  footer_col_company:   "કંપની",
  footer_col_support:   "સહાય",
  footer_col_legal:     "કાનૂની",
  footer_made_in:       "ગુજરાત, ભારતમાં પ્રેમ સાથે બનાવ્યું",
  footer_fssai:         "FSSAI લાઇ. નં. 10012345678901",

  /* ---- Account --------------------------------------------------- */
  account_title:         "પાછા આવ્યા, {name}",
  account_description:   "તમારા ઓર્ડર, સરનામાં, વિશલિસ્ટ અને રિવૉર્ડ એક જ જગ્યાએ સંચાલિત કરો.",
  tab_profile:           "પ્રોફ઼ાઇલ",
  tab_orders:            "ઓર્ડર",
  tab_addresses:         "સરનામાં",
  tab_wishlist:          "વિશલિસ્ટ",
  tab_rewards:           "રિવૉર્ડ",
  tab_coupons:           "કૂપન",
  tab_settings:          "સેટિંગ્સ",

  /* ---- Settings tab ---------------------------------------------- */
  settings_title:             "પ્રાધાન્યતા",
  settings_language_label:    "ભાષા",
  settings_language_subtitle: "ઈન્ટરફેસ માટે તમારી પ્રિય ભાષા પસંદ કરો",
  settings_language_en:       "English",
  settings_language_hi:       "हिन्दी (Hindi)",
  settings_language_gu:       "ગુજરાતી (Gujarati)",
  settings_saved:             "પ્રાધાન્યતા સાચવ્યા!",

  /* ---- Common ---------------------------------------------------- */
  common_loading:        "લોડ થઈ રહ્યું છે…",
  common_error:          "કંઈક ખોટું થયું.",
  common_free_shipping:  "મફત ડિલિવરી",
  common_in_stock:       "સ્ટૉકમાં છે",
  common_out_of_stock:   "સ્ટૉકમાં નથી",
  common_login_required: "લૉગઇન જરૂરી છે",
  common_login_prompt:   "એકાઉન્ટ વિગતો સંચાલિત કરવા માટે લૉગઇન કરો.",
  common_currency:       "₹",
};

export const TRANSLATIONS = { en: EN, hi: HI, gu: GU } as const;

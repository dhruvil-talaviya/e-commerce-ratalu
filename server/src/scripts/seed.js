const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Flavor = require('../models/Flavor');
const Product = require('../models/Product');
const Category = require('../models/Category');
const FAQ = require('../models/FAQ');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const Settings = require('../models/Settings');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const { ADMIN_PHONE, ADMIN_USERNAME } = require('../config/admin');

const FLAVORS = [
  {
    id: "original-salted",
    slug: "original-salted",
    name: "Original Salted",
    tagline: "The one that started it all",
    description: "Fresh purple yam, thin-sliced and kettle-cooked in premium oil, finished with a whisper of Himalayan pink salt. Clean, honest crunch that lets the natural nuttiness of the ratalu shine.",
    heat: 0,
    ingredients: ["Fresh Ratalu (purple yam)", "Cold-pressed sunflower oil", "Himalayan pink salt"],
    gradient: { from: "#7a3f9c", via: "#5b2c6f", to: "#3d1d4c" },
    accent: "#f4c542",
    badge: "Signature",
    bestSeller: true
  },
  {
    id: "classic-masala",
    slug: "classic-masala",
    name: "Classic Masala",
    tagline: "Nostalgia in every bite",
    description: "A heritage blend of roasted cumin, coriander, amchur and a hint of black salt. Warm, tangy and deeply aromatic — the flavour that tastes like home.",
    heat: 1,
    ingredients: ["Fresh Ratalu", "Sunflower oil", "Roasted cumin & coriander", "Amchur", "Black salt"],
    gradient: { from: "#ec8a35", via: "#c9691a", to: "#7a3f10" },
    accent: "#f4c542",
    bestSeller: true
  },
  {
    id: "peri-peri",
    slug: "peri-peri",
    name: "Peri Peri",
    tagline: "Bold, fiery, unforgettable",
    description: "African bird's-eye chilli meets zesty lemon and roasted garlic. A confident, smoky heat that builds slowly and keeps you reaching for more.",
    heat: 3,
    ingredients: ["Fresh Ratalu", "Sunflower oil", "Peri peri chilli", "Roasted garlic", "Lemon", "Sea salt"],
    gradient: { from: "#e0452e", via: "#c9291a", to: "#7a1210" },
    accent: "#f4c542",
    badge: "Hot"
  },
  {
    id: "black-pepper",
    slug: "black-pepper",
    name: "Black Pepper",
    tagline: "Refined & aromatic",
    description: "Coarsely cracked Malabar black pepper over sea salt. Sharp, fragrant and grown-up — the wafer for those who like a little edge.",
    heat: 2,
    ingredients: ["Fresh Ratalu", "Sunflower oil", "Malabar black pepper", "Sea salt"],
    gradient: { from: "#4a4a52", via: "#2c2c2c", to: "#141416" },
    accent: "#f4c542"
  },
  {
    id: "cheese",
    slug: "cheese",
    name: "Cheese",
    tagline: "Creamy, savoury, moreish",
    description: "Aged cheddar and a touch of cultured cream dusted over each crisp. Rich and indulgent without ever being heavy — an instant crowd favourite.",
    heat: 0,
    ingredients: ["Fresh Ratalu", "Sunflower oil", "Aged cheddar", "Cultured cream", "Sea salt"],
    gradient: { from: "#f7d660", via: "#f4c542", to: "#c3941a" },
    accent: "#e67e22",
    badge: "New"
  },
  {
    id: "green-chilli",
    slug: "green-chilli",
    name: "Green Chilli",
    tagline: "Fresh heat with a kick",
    description: "Bright, grassy green chilli lifted with lime and a pinch of chaat masala. Vibrant, punchy and impossible to put down.",
    heat: 2,
    ingredients: ["Fresh Ratalu", "Sunflower oil", "Green chilli", "Lime", "Chaat masala", "Sea salt"],
    gradient: { from: "#4e9c5a", via: "#2f7d3d", to: "#134a1f" },
    accent: "#f4c542"
  }
];

const PACK_SIZES = [
  { id: "100g", label: "100g", grams: 100, price: 99, note: "Snack pack", stock: 120 },
  { id: "200g", label: "200g", grams: 200, price: 179, compareAt: 198, note: "Most loved", stock: 100 },
  { id: "500g", label: "500g", grams: 500, price: 399, compareAt: 495, note: "Family size", stock: 80 },
  { id: "1kg", label: "1kg", grams: 1000, price: 749, compareAt: 990, note: "Best value", stock: 50 }
];

const CATEGORIES = [
  { name: "Kettle Wafers", slug: "kettle-wafers", status: "Active", sorting: 1 },
  { name: "Premium Variety Packs", slug: "premium-variety-packs", status: "Inactive", sorting: 2 },
  { name: "Gift Box Combos", slug: "gift-box-combos", status: "Active", sorting: 3 }
];

const FAQS = [
  {
    category: "Shipping",
    question: "How fast do you ship, and where do you deliver?",
    answer: "We ship pan-India via trusted courier partners. Orders placed before 2 PM IST are dispatched the same day. Metro cities typically receive orders in 2–3 business days; the rest of India within 4–6 business days. Enjoy free shipping on all orders above ₹599."
  },
  {
    category: "Shelf Life",
    question: "How long do the wafers stay fresh?",
    answer: "Because we cook in small batches with no artificial preservatives, each pack is best enjoyed within 3 months of the manufacturing date printed on the pack. Our nitrogen-flushed pouches lock in that just-cooked crunch until you open them."
  },
  {
    category: "Ingredients",
    question: "What exactly goes into a pack of Ratalu Wafers?",
    answer: "Just three essentials: hand-selected fresh ratalu (purple yam), cold-pressed sunflower oil, and natural seasoning. No artificial colours, no MSG, no palm oil. Every flavour is 100% vegetarian, and most are naturally gluten-free."
  },
  {
    category: "Storage",
    question: "How should I store my wafers after opening?",
    answer: "Keep them in a cool, dry place away from direct sunlight. Once opened, press out the air and reseal the pouch, or transfer to an airtight container to keep them crisp for up to a week — though they rarely last that long."
  },
  {
    category: "Returns",
    question: "What is your returns and refund policy?",
    answer: "Your happiness is guaranteed. If a pack arrives damaged, stale, or you're simply not delighted, write to us within 7 days of delivery with a photo and we'll send a free replacement or a full refund — no lengthy questions asked."
  }
];

const REVIEWS = [
  {
    name: "Ananya Mehta",
    location: "Mumbai, MH",
    rating: 5,
    quote: "I genuinely didn't expect a yam wafer to become my whole family's obsession. The Original Salted is impossibly crisp and doesn't taste oily at all. We're on our fourth order.",
    flavor: "Original Salted",
    initials: "AM",
    avatarGradient: { from: "#7a3f9c", to: "#5b2c6f" }
  },
  {
    name: "Rohan Desai",
    location: "Ahmedabad, GJ",
    rating: 5,
    quote: "The Peri Peri is the real deal — proper slow-building heat, not just spice powder. Packaging arrived sealed and premium. Feels like a brand from abroad, made right here.",
    flavor: "Peri Peri",
    initials: "RD",
    avatarGradient: { from: "#e0452e", to: "#c9291a" }
  },
  {
    name: "Sneha Iyer",
    location: "Bengaluru, KA",
    rating: 5,
    quote: "Classic Masala took me straight back to my grandmother's kitchen. You can actually taste the roasted cumin. My kids finished a 500g pack in two days.",
    flavor: "Classic Masala",
    initials: "SI",
    avatarGradient: { from: "#ec8a35", to: "#c9691a" }
  }
];

const COUPONS = [
  { code: "CRISPY10", type: "percent", value: 10, description: "10% off your order" },
  { code: "RATALU50", type: "flat", value: 50, minSubtotal: 399, description: "₹50 off orders over ₹399" },
  { code: "FIRSTBITE", type: "percent", value: 15, minSubtotal: 299, description: "15% off your first order over ₹299" }
];

const CUSTOMERS = [
  {
    name: "Ananya Mehta",
    phone: "9825000000",
    addresses: [
      {
        fullName: "Ananya Mehta",
        phone: "9825000000",
        houseNo: "14",
        street: "Marine Drive",
        area: "Nariman Point",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400021",
        addressType: "Home"
      },
      {
        fullName: "Ananya Mehta",
        phone: "9825000000",
        houseNo: "Naman Centre",
        street: "G Block",
        area: "Bandra Kurla Complex",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400051",
        addressType: "Work"
      }
    ]
  },
  {
    name: "Rahul Sharma",
    phone: "9876543210",
    addresses: [
      {
        fullName: "Rahul Sharma",
        phone: "9876543210",
        houseNo: "Apt 201",
        street: "Green Glades",
        area: "HSR Layout",
        city: "Bengaluru",
        state: "Karnataka",
        pinCode: "560102",
        addressType: "Home"
      }
    ]
  },
  {
    name: "Kabir Singh",
    phone: "9911223344",
    addresses: []
  }
];

const seed = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ratalu';
    console.log(`Connecting to MongoDB for seeding: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Database connected successfully.');

    // Create uploads directory if it does not exist
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Created local uploads/ directory.');
    }

    // Clean up collections
    await Flavor.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    await FAQ.deleteMany();
    await Review.deleteMany();
    await Coupon.deleteMany();
    await Settings.deleteMany();
    await Admin.deleteMany();
    await Customer.deleteMany();
    await Inventory.deleteMany();
    console.log('Collections cleared.');

    // Seed the single admin. Auth is OTP-only, so the password is random
    // filler that satisfies the schema and is never used to sign in.
    await Admin.create({
      username: ADMIN_USERNAME,
      phone: ADMIN_PHONE,
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      role: 'Super Admin'
    });
    console.log(`Single admin seeded (Phone: ${ADMIN_PHONE}, OTP login only).`);

    // Seed Settings
    await Settings.create({});
    console.log('Default Store Settings seeded.');

    // Seed Customers
    for (const cust of CUSTOMERS) {
      const c = await Customer.create({
        name: cust.name,
        phone: cust.phone,
        addresses: cust.addresses,
        activeAddressId: null
      });
      if (c.addresses.length > 0) {
        c.activeAddressId = c.addresses[0]._id.toString();
        await c.save();
      }
    }
    console.log('Mock Customers seeded.');

    // Seed Categories
    await Category.insertMany(CATEGORIES);
    console.log('Categories seeded.');

    // Seed FAQs
    await FAQ.insertMany(FAQS);
    console.log('FAQs seeded.');

    // Seed Reviews
    await Review.insertMany(REVIEWS);
    console.log('Reviews seeded.');

    // Seed Coupons
    await Coupon.insertMany(COUPONS);
    console.log('Coupons seeded.');

    // Seed Flavors & Products & Inventory
    for (const f of FLAVORS) {
      await Flavor.create(f);

      // Map static packs and include unique SKU
      const productPacks = PACK_SIZES.map(p => ({
        ...p,
        sku: `${f.id}-${p.id}`.toUpperCase()
      }));

      await Product.create({
        flavorId: f.id,
        packs: productPacks
      });

      for (const pack of productPacks) {
        await Inventory.create({
          flavorId: f.id,
          packId: pack.id,
          currentStock: pack.stock
        });
      }
    }
    console.log('Flavors, products, and inventory stock seeded.');

    console.log('Database Seeding Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed with error:', err.message);
    process.exit(1);
  }
};

seed();

require('dotenv').config();
const mongoose = require('mongoose');
const PageSection = require('../models/PageSection');

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/e-commerce-ratalu";

const TARGET_ORDER = [
  'hero',
  'flavours',
  'product-list',
  'combos',
  'full_width_carousel',
  'carousel',
  'best-sellers',
  'testimonials',
  'reviews',
  'faqs',
  'faq',
  'why-choose-us',
  'announcement',
  'how-its-made',
  'farm-fresh',
  'about',
  'offers',
  'newsletter',
  'instagram'
];

async function updateOrder() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB...");

  const sections = await PageSection.find({ page: 'homepage' });
  console.log(`Found ${sections.length} homepage sections.`);

  for (let i = 0; i < TARGET_ORDER.length; i++) {
    const keyName = TARGET_ORDER[i];
    await PageSection.updateMany(
      { page: 'homepage', key: keyName },
      { $set: { sortOrder: i } }
    );
  }

  // Also adjust remaining sections by current order
  const updatedSections = await PageSection.find({ page: 'homepage' }).sort({ sortOrder: 1 });
  console.log("Updated Homepage Layout Order:");
  updatedSections.forEach((s, idx) => {
    console.log(` ${idx + 1}. [${s.key}] ${s.label} (sortOrder: ${s.sortOrder}, enabled: ${s.enabled})`);
  });

  await mongoose.disconnect();
  console.log("Done!");
}

updateOrder().catch(console.error);

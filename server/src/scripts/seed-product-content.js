/**
 * Import the product page's CURRENT hardcoded content into the database.
 *
 * Lossless, not a demo seed: every string below is what the product page renders
 * today (lifted from product-detail-client.tsx and lib/data/product-meta.ts).
 * Publishing straight after this changes nothing visible — which is the point.
 * It proves the CMS is serving the real page rather than replacing it.
 *
 * Idempotent, and it never overwrites content an admin has already edited.
 *
 *   npm run seed:product-content
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Flavor = require('../models/Flavor');

/** The three badges hardcoded under the gallery today. */
const TRUST_BADGES = [
  { icon: 'Leaf', title: '100% Veg', description: 'Pure ingredients', color: 'text-green-600', enabled: true },
  { icon: 'ShieldCheck', title: 'Gluten Free', description: 'No wheat / starch', color: 'text-purple-600', enabled: true },
  { icon: 'RotateCcw', title: 'Kettle Cooked', description: 'Crafted in batches', color: 'text-orange-600', enabled: true }
];

/** Nutrition, verbatim from lib/data/product-meta.ts (per 100g). */
const NUTRITION = {
  servingSize: '100g',
  calories: '512 kcal',
  fat: '27 g',
  saturatedFat: '3.1 g',
  carbohydrates: '60 g',
  sugar: '2.4 g',
  fibre: '6.8 g',
  protein: '5.2 g',
  sodium: '1.1 g',
  note: 'Typical values per 100g. Made in a facility that also handles dairy. Free from added preservatives, MSG and artificial colours.'
};

const PRODUCT_INFO = {
  allergens: 'Made in a facility that also handles dairy.',
  storage: 'Store in a cool, dry place away from direct sunlight. Once opened, consume within 3 days.',
  shelfLife: '4 months from the date of packaging',
  countryOfOrigin: 'India',
  manufacturer: 'Ratalu Wafers Private Limited',
  packedBy: 'Ratalu Wafers, Rajkot, Gujarat',
  netWeight: 'As marked on the pack',
  fssai: ''
};

const DELIVERY = {
  title: 'Check delivery time',
  description: 'Enter your PIN code to see when this arrives.',
  estimate: '2–4 business days',
  dispatch: 'Dispatched within 24 hours',
  sameDay: false,
  codAvailable: true,
  returnSummary: 'Not happy? Tell us within 7 days of delivery and we\'ll make it right.'
};

const HIGHLIGHTS = [
  { icon: 'Flame', title: 'Kettle-cooked', description: 'Small batches, cooked low and slow.' },
  { icon: 'Leaf', title: 'Nothing artificial', description: 'No colours, no MSG, no preservatives.' },
  { icon: 'Sparkles', title: 'Seasoned by hand', description: 'Real spices, tossed on fresh.' }
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ratalu');

  const flavors = await Flavor.find();
  let seeded = 0;
  let skipped = 0;

  for (const flavor of flavors) {
    // Never trample content the owner has already written.
    if (flavor.trustBadges?.length) {
      console.log(`  · skipped  ${flavor.slug.padEnd(18)} (already has content)`);
      skipped++;
      continue;
    }

    flavor.trustBadges = TRUST_BADGES;
    flavor.highlights = HIGHLIGHTS;
    flavor.nutrition = NUTRITION;
    flavor.productInfo = PRODUCT_INFO;
    flavor.delivery = DELIVERY;

    // Labels derived from the flags the product already carries, so nothing
    // is invented — the "Best Seller" pill only appears where it already did.
    const labels = [];
    if (flavor.bestSeller) labels.push({ text: 'Best Seller', tone: 'warning', enabled: true, showOn: 'all' });
    if (flavor.badge) labels.push({ text: flavor.badge, tone: 'primary', enabled: true, showOn: 'all' });
    flavor.labels = labels;

    await flavor.save();
    console.log(`  + seeded   ${flavor.slug.padEnd(18)} (${TRUST_BADGES.length} badges, ${labels.length} label(s))`);
    seeded++;
  }

  console.log(`\n${seeded} seeded, ${skipped} skipped.`);
  console.log('The product page content now lives in MongoDB. Nothing visible changed.');

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

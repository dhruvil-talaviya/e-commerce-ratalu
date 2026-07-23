/**
 * Backfill: assign sequential `orderNumber`s to orders created before the
 * counter existed, oldest first, then seed the counter past the highest value
 * so new checkouts continue the sequence instead of colliding with it.
 *
 * Idempotent — orders that already have a number are left alone.
 *
 *   npm run migrate:order-numbers
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Counter = require('../models/Counter');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ratalu');

  const missing = await Order.find({ orderNumber: { $in: [null, undefined] } })
    .sort({ createdAt: 1 });

  if (!missing.length) {
    console.log('Nothing to backfill — every order already has an orderNumber.');
  } else {
    const highest = await Order.findOne({ orderNumber: { $ne: null } })
      .sort({ orderNumber: -1 })
      .select('orderNumber');

    let seq = highest?.orderNumber || 0;

    for (const order of missing) {
      seq += 1;
      order.orderNumber = seq;
      await order.save();
      console.log(`  ${order.id.padEnd(10)} -> RW-${String(seq).padStart(6, '0')}`);
    }
    console.log(`\nBackfilled ${missing.length} order(s).`);
  }

  // Park the counter above the highest assigned number.
  const top = await Order.findOne({ orderNumber: { $ne: null } })
    .sort({ orderNumber: -1 })
    .select('orderNumber');

  const seed = top?.orderNumber || 0;
  await Counter.findOneAndUpdate(
    { _id: 'orderNumber' },
    { $set: { seq: seed } },
    { upsert: true }
  );
  console.log(`Counter 'orderNumber' seeded at ${seed}. Next order -> RW-${String(seed + 1).padStart(6, '0')}`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

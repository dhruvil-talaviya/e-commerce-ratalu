/**
 * detectDuplicateOrders.js — Idempotent duplicate order detection & archival
 *
 * Finds orders created by the payment-retry bug:
 *   - Same customer (customerId)
 *   - Same total amount (totals.total)
 *   - Same item count
 *   - Created within 30 minutes of each other
 *   - One has payment.status = Pending/Failed (original), one Paid (the retry dup)
 *   - No shipment attached to the duplicate
 *
 * Usage:
 *   node server/src/scripts/detectDuplicateOrders.js           # dry-run report
 *   node server/src/scripts/detectDuplicateOrders.js --archive  # stamp duplicates
 *   node server/src/scripts/detectDuplicateOrders.js --delete   # DANGER: hard delete
 *
 * Fully IDEMPOTENT — running twice produces no extra changes.
 */
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Order = require('../models/Order');
const Shipment = require('../models/Shipment');
const logger = require('../config/logger');

const WINDOW_MS = 30 * 60 * 1000;
const DRY_RUN = !process.argv.includes('--archive') && !process.argv.includes('--delete');
const ARCHIVE = process.argv.includes('--archive');
const DELETE_MODE = process.argv.includes('--delete');

const main = async () => {
  try {
    await connectDB();
    logger.info('[DuplicateDetect] Connected to database.');
    logger.info('[DuplicateDetect] Mode: ' + (DRY_RUN ? 'DRY-RUN' : ARCHIVE ? 'ARCHIVE' : 'DELETE'));

    const orders = await Order.find({}).sort({ createdAt: 1 }).lean();
    logger.info('[DuplicateDetect] Loaded ' + orders.length + ' total orders.');

    const byCustomer = new Map();
    for (const order of orders) {
      const key = String(order.customerId || 'guest');
      if (!byCustomer.has(key)) byCustomer.set(key, []);
      byCustomer.get(key).push(order);
    }

    const shipmentOrderIds = new Set(
      (await Shipment.find({}).select('order').lean()).map(s => String(s.order))
    );

    const duplicatePairs = [];

    for (const [, customerOrders] of byCustomer) {
      if (customerOrders.length < 2) continue;

      for (let i = 0; i < customerOrders.length; i++) {
        for (let j = i + 1; j < customerOrders.length; j++) {
          const a = customerOrders[i];
          const b = customerOrders[j];

          const timeDiff = Math.abs(
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          if (timeDiff > WINDOW_MS) continue;
          if (a.totals?.total !== b.totals?.total) continue;

          const aItems = (a.items || []).reduce((s, x) => s + (x.quantity || 0), 0);
          const bItems = (b.items || []).reduce((s, x) => s + (x.quantity || 0), 0);
          if (aItems !== bItems) continue;

          const aPaid = a.payment?.status === 'Paid';
          const bPaid = b.payment?.status === 'Paid';
          if (aPaid === bPaid) continue;

          const originalOrder = new Date(a.createdAt) <= new Date(b.createdAt) ? a : b;
          const duplicateOrder = originalOrder === a ? b : a;

          if (duplicateOrder.archivedByDuplicateCleanup) continue;

          const hasShipment = shipmentOrderIds.has(String(duplicateOrder._id));
          duplicatePairs.push({ original: originalOrder, duplicate: duplicateOrder, timeDiffMinutes: Math.round(timeDiff / 60000), hasShipment });
        }
      }
    }

    logger.info('[DuplicateDetect] Found ' + duplicatePairs.length + ' potential duplicate pair(s).');

    console.log('\n========== DUPLICATE ORDER REPORT ==========\n');
    let safeCount = 0, reviewCount = 0;

    for (const pair of duplicatePairs) {
      const safe = !pair.hasShipment;
      safe ? safeCount++ : reviewCount++;
      console.log('ORIGINAL : ' + pair.original.id + ' | ' + pair.original.status + ' | Payment: ' + pair.original.payment?.status);
      console.log('DUPLICATE: ' + pair.duplicate.id + ' | ' + pair.duplicate.status + ' | Payment: ' + pair.duplicate.payment?.status);
      console.log('Time gap : ' + pair.timeDiffMinutes + ' min | Amount: Rs.' + pair.duplicate.totals?.total);
      console.log('Shipment : ' + (pair.hasShipment ? 'YES - MANUAL REVIEW REQUIRED' : 'None - safe to archive'));
      console.log('');
    }

    console.log('Summary: ' + safeCount + ' safe to archive, ' + reviewCount + ' need manual review.\n');

    if (DRY_RUN) {
      logger.info('[DuplicateDetect] DRY-RUN complete. Run with --archive to process.');
      process.exit(0);
    }

    let processed = 0, skipped = 0;
    for (const pair of duplicatePairs) {
      if (pair.hasShipment) { skipped++; continue; }

      if (DELETE_MODE) {
        await Order.deleteOne({ _id: pair.duplicate._id });
        logger.info('[DuplicateDetect] DELETED: ' + pair.duplicate.id);
      } else {
        await Order.findByIdAndUpdate(pair.duplicate._id, {
          $set: {
            archivedByDuplicateCleanup: true,
            archivedAt: new Date(),
            archivedReason: 'Duplicate of ' + pair.original.id + ' (payment-retry bug, fixed 2026-07-29)',
            status: 'Expired',
            orderStatus: 'Expired',
            closedReason: 'Archived: retry-bug duplicate'
          }
        });
        logger.info('[DuplicateDetect] ARCHIVED: ' + pair.duplicate.id + ' (original: ' + pair.original.id + ')');
      }
      processed++;
    }

    logger.info('[DuplicateDetect] Done. ' + processed + ' processed, ' + skipped + ' skipped.');
    process.exit(0);
  } catch (err) {
    logger.error('[DuplicateDetect] Error: ' + err.message);
    process.exit(1);
  }
};

main();

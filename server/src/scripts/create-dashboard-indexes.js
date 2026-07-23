#!/usr/bin/env node
/**
 * Create performance indexes for dashboard analytics queries.
 * Run: node server/src/scripts/create-dashboard-indexes.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ratalu';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to', MONGO_URI);

  const db = mongoose.connection.db;

  // ── Order Indexes ──────────────────────────────────────────────────────────
  const orders = db.collection('orders');
  await orders.createIndex({ 'payment.status': 1, status: 1, createdAt: -1 }, { name: 'idx_payment_status_date', background: true });
  await orders.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_status_date', background: true });
  await orders.createIndex({ cancelledBy: 1, createdAt: -1 }, { name: 'idx_cancelledBy_date', background: true, sparse: true });
  await orders.createIndex({ customerId: 1, createdAt: -1 }, { name: 'idx_customerId_date', background: true });
  console.log('✔ Order indexes created');

  // ── Refund Indexes ──────────────────────────────────────────────────────────
  const refunds = db.collection('refunds');
  await refunds.createIndex({ refundedAt: -1 }, { name: 'idx_refundedAt', background: true, sparse: true });
  console.log('✔ Refund indexes created');

  // ── Customer Indexes ────────────────────────────────────────────────────────
  const customers = db.collection('customers');
  await customers.createIndex({ status: 1, updatedAt: -1 }, { name: 'idx_status_updated', background: true });
  console.log('✔ Customer indexes created');

  // ── Inventory Indexes (already has compound unique on flavorId+packId) ─────
  console.log('✔ Inventory indexes already in place');

  console.log('\nAll dashboard indexes created successfully.');
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });

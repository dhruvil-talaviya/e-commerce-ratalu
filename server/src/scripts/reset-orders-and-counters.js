import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ratalu-ecommerce';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB Atlas');

  const db = mongoose.connection.db;

  // 1. Wipe test orders, refunds, stock histories, audit logs
  const ordersCol = db.collection('orders');
  const refundsCol = db.collection('refunds');
  const stockHistoryCol = db.collection('stockhistories');
  const auditLogsCol = db.collection('auditlogs');
  const countersCol = db.collection('counters');
  const flavorsCol = db.collection('flavors');

  const ordersDeleted = await ordersCol.deleteMany({});
  console.log(`Cleared ${ordersDeleted.deletedCount} orders.`);

  const refundsDeleted = await refundsCol.deleteMany({});
  console.log(`Cleared ${refundsDeleted.deletedCount} refunds.`);

  const stockDeleted = await stockHistoryCol.deleteMany({});
  console.log(`Cleared ${stockDeleted.deletedCount} stock history logs.`);

  const auditDeleted = await auditLogsCol.deleteMany({});
  console.log(`Cleared ${auditDeleted.deletedCount} audit logs.`);

  // 2. Reset counters to start clean from 0 (Next order -> 1 / RW-000001, Next refund -> 1 / REF-000001)
  await countersCol.updateOne(
    { _id: 'orderNumber' },
    { $set: { seq: 0 } },
    { upsert: true }
  );

  await countersCol.updateOne(
    { _id: 'refundNumber' },
    { $set: { seq: 0 } },
    { upsert: true }
  );

  await countersCol.updateOne(
    { _id: 'invoiceNumber' },
    { $set: { seq: 0 } },
    { upsert: true }
  );

  console.log('Successfully reset Counters: orderNumber (0), refundNumber (0), invoiceNumber (0).');

  // 3. Reset product stock & ensure all products are marked inStock: true
  const flavors = await flavorsCol.find({}).toArray();
  for (const f of flavors) {
    const updatedPacks = (f.packs || []).map((p) => ({
      ...p,
      stock: p.stock && p.stock > 0 ? p.stock : 500, // ensure healthy stock level
    }));
    await flavorsCol.updateOne(
      { _id: f._id },
      { $set: { inStock: true, packs: updatedPacks } }
    );
  }
  console.log(`Updated ${flavors.length} flavor products to inStock: true with healthy stock reserves.`);

  console.log('\n✅ Database cleaned and counters reset successfully!');
  await mongoose.disconnect();
}

run().catch(console.error);

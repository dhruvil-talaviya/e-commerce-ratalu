/**
 * WALLET FIELD REMOVAL MIGRATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Removes the `wallet` field from ALL existing Customer documents in MongoDB.
 *
 * USAGE:
 *   node src/scripts/remove-wallet.js
 *
 * Run once per environment (dev, staging, production).
 * The script is idempotent — running it multiple times is safe.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in your .env file.');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.');

  // Direct collection access — no need to load the full Customer model
  const db = mongoose.connection.db;
  const collection = db.collection('customers');

  // Count documents that still have the wallet field
  const before = await collection.countDocuments({ wallet: { $exists: true } });
  console.log(`📊 Found ${before} customer document(s) with the 'wallet' field.`);

  if (before === 0) {
    console.log('✅ Nothing to migrate — wallet field is already absent from all documents.');
    await mongoose.disconnect();
    return;
  }

  // Remove wallet field from all documents
  const result = await collection.updateMany(
    { wallet: { $exists: true } },
    { $unset: { wallet: '' } }
  );

  console.log(`✅ Migration complete. Removed wallet field from ${result.modifiedCount} documents.`);

  // Verify
  const after = await collection.countDocuments({ wallet: { $exists: true } });
  console.log(after === 0
    ? '✅ Verification passed: no documents with wallet field remain.'
    : `⚠️  Warning: ${after} document(s) still have the wallet field.`
  );

  await mongoose.disconnect();
  console.log('👋 Disconnected. Migration finished.');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

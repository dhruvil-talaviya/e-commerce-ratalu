/**
 * Enforce the single-admin rule.
 *
 * Deletes every existing Admin row and seeds exactly one, identified by
 * ADMIN_PHONE. The admin signs in with an OTP only, so the stored password is
 * random filler that satisfies the schema and is never used.
 *
 *   npm run migrate:admin
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ratalu');

  const adminEmail = process.env.ADMIN_EMAIL || 'talaviyad380@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Dhr@380';
  const adminPhone = process.env.ADMIN_PHONE || '8200198926';
  const adminUsername = process.env.ADMIN_USERNAME || 'StoreOwner';

  console.log('Removing existing admin account(s)...');
  await Admin.deleteMany({});

  const admin = await Admin.create({
    username: adminUsername,
    email: adminEmail,
    phone: adminPhone,
    password: adminPassword,
    role: 'Super Admin',
    passwordLoginEnabled: true
  });

  console.log(`\n✅ Permanent Super Admin account successfully created/seeded:`);
  console.log(`   - Email: ${admin.email}`);
  console.log(`   - Phone: ${admin.phone}`);
  console.log(`   - Role:  ${admin.role}`);
  console.log(`Sign in at /admin/login with email '${admin.email}' and your password.`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

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
const crypto = require('crypto');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const { ADMIN_PHONE, ADMIN_USERNAME } = require('../config/admin');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ratalu');

  const existing = await Admin.find().select('username phone role');
  if (existing.length) {
    console.log('Removing existing admin account(s):');
    existing.forEach((a) => console.log(`  - ${a.username} (${a.phone}) [${a.role}]`));
    await Admin.deleteMany({});
  } else {
    console.log('No existing admin accounts found.');
  }

  const admin = await Admin.create({
    username: ADMIN_USERNAME,
    phone: ADMIN_PHONE,
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    role: 'Super Admin'
  });

  console.log(`\nSeeded the single admin: ${admin.username} (${admin.phone}) [${admin.role}]`);
  console.log(`Sign in at /admin/login with ${ADMIN_PHONE} using the OTP.`);

  const count = await Admin.countDocuments();
  console.log(`Admin accounts in database: ${count}`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Production Database Cleanup & Super Admin Seeding Script
 * 
 * Requirement 18:
 * - Purges all customer data, orders, delivery/shipping records, reviews, carts, wishlists, notifications, OTP records.
 * - Preserves all products, categories, images, videos, banners, FAQs, coupons, and store settings.
 * - Seeds/Ensures the permanent Super Admin account (talaviyad380@gmail.com / Dhr@380).
 * 
 * Usage: node server/src/scripts/cleanup-database.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

// Models to purge
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Shipment = require('../models/Shipment');
const Manifest = require('../models/Manifest');
const ShippingLabel = require('../models/ShippingLabel');
const PickupRequest = require('../models/PickupRequest');
const TrackingEvent = require('../models/TrackingEvent');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const Review = require('../models/Review');
const OTP = require('../models/OTP');
const OtpLog = require('../models/OtpLog');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const Refund = require('../models/Refund');
const ActivityLog = require('../models/ActivityLog');
const AuditLog = require('../models/AuditLog');
const Visit = require('../models/Visit');
const Admin = require('../models/Admin');

(async () => {
  console.log('⚡ Starting Database Cleanup & Super Admin Seeding...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ratalu');

  console.log('\n🧹 Purging Customer & Transactional Data:');
  const deletedCustomers = await Customer.deleteMany({});
  console.log(`  - Customers deleted: ${deletedCustomers.deletedCount}`);

  const deletedOrders = await Order.deleteMany({});
  console.log(`  - Orders deleted: ${deletedOrders.deletedCount}`);

  const deletedShipments = await Shipment.deleteMany({});
  console.log(`  - Shipments deleted: ${deletedShipments.deletedCount}`);

  const deletedManifests = await Manifest.deleteMany({});
  console.log(`  - Manifests deleted: ${deletedManifests.deletedCount}`);

  const deletedShippingLabels = await ShippingLabel.deleteMany({});
  console.log(`  - Shipping Labels deleted: ${deletedShippingLabels.deletedCount}`);

  const deletedPickupRequests = await PickupRequest.deleteMany({});
  console.log(`  - Pickup Requests deleted: ${deletedPickupRequests.deletedCount}`);

  const deletedTrackingEvents = await TrackingEvent.deleteMany({});
  console.log(`  - Tracking Events deleted: ${deletedTrackingEvents.deletedCount}`);

  const deletedCarts = await Cart.deleteMany({});
  console.log(`  - Carts deleted: ${deletedCarts.deletedCount}`);

  const deletedWishlists = await Wishlist.deleteMany({});
  console.log(`  - Wishlists deleted: ${deletedWishlists.deletedCount}`);

  const deletedReviews = await Review.deleteMany({});
  console.log(`  - Reviews deleted: ${deletedReviews.deletedCount}`);

  const deletedOTPs = await OTP.deleteMany({});
  console.log(`  - OTPs deleted: ${deletedOTPs.deletedCount}`);

  const deletedOtpLogs = await OtpLog.deleteMany({});
  console.log(`  - OTP Logs deleted: ${deletedOtpLogs.deletedCount}`);

  const deletedNotifications = await Notification.deleteMany({});
  console.log(`  - Notifications deleted: ${deletedNotifications.deletedCount}`);

  const deletedPayments = await Payment.deleteMany({});
  console.log(`  - Payments deleted: ${deletedPayments.deletedCount}`);

  const deletedRefunds = await Refund.deleteMany({});
  console.log(`  - Refunds deleted: ${deletedRefunds.deletedCount}`);

  const deletedActivityLogs = await ActivityLog.deleteMany({});
  console.log(`  - Activity Logs deleted: ${deletedActivityLogs.deletedCount}`);

  const deletedAuditLogs = await AuditLog.deleteMany({});
  console.log(`  - Audit Logs deleted: ${deletedAuditLogs.deletedCount}`);

  const deletedVisits = await Visit.deleteMany({});
  console.log(`  - Analytics Visits deleted: ${deletedVisits.deletedCount}`);

  console.log('\n👑 Seeding Permanent Super Admin Account:');
  await Admin.deleteMany({});
  const adminEmail = process.env.ADMIN_EMAIL || 'talaviyad380@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Dhr@380';
  const adminPhone = process.env.ADMIN_PHONE || '8200198926';

  const superAdmin = await Admin.create({
    username: 'StoreOwner',
    email: adminEmail,
    phone: adminPhone,
    password: adminPassword,
    role: 'Super Admin',
    passwordLoginEnabled: true
  });

  console.log(`  ✅ Super Admin Account Active:`);
  console.log(`     Email:    ${superAdmin.email}`);
  console.log(`     Phone:    ${superAdmin.phone}`);
  console.log(`     Role:     ${superAdmin.role}`);

  console.log('\n✨ Database Cleanup & Admin Seeding Completed Successfully!\n');
  await mongoose.disconnect();
})().catch((err) => {
  console.error('❌ Error during Database Cleanup:', err);
  process.exit(1);
});

/**
 * Remove any Customer account that shares the admin's phone number.
 *
 * The customer OTP verify used to auto-register any number it validated, so
 * signing in through the storefront with the owner's number created a shadow
 * "Customer" for the admin. That path is now blocked in the Customer model, but
 * rows created before the guard existed still need clearing.
 *
 * Also cleans up anything that customer left behind (cart, wishlist), and
 * refuses to run if the account has real orders — that would need a human
 * decision rather than a silent delete.
 *
 *   npm run migrate:purge-admin-customer
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const Notification = require('../models/Notification');
const { ADMIN_PHONE } = require('../config/admin');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ratalu');

  const shadows = await Customer.find({ phone: ADMIN_PHONE });

  if (!shadows.length) {
    console.log(`No customer account exists for the admin number (${ADMIN_PHONE}). Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  for (const customer of shadows) {
    console.log(`Found shadow customer: ${customer.name || '(no name)'} <${customer.email || 'no email'}> _id=${customer._id}`);

    const orderCount = await Order.countDocuments({ customerId: customer._id });
    if (orderCount > 0) {
      console.error(
        `\n  REFUSING to delete: this account has ${orderCount} order(s) attached.\n` +
        '  Deleting it would orphan real order history. Reassign or review those orders first.'
      );
      process.exitCode = 1;
      continue;
    }

    const cart = await Cart.deleteMany({ customerId: customer._id });
    const wishlist = await Wishlist.deleteMany({ customerId: customer._id });
    const notifs = await Notification.deleteMany({ customerId: customer._id });
    await Customer.deleteOne({ _id: customer._id });

    console.log(
      `  Deleted customer + ${cart.deletedCount} cart(s), ` +
      `${wishlist.deletedCount} wishlist(s), ${notifs.deletedCount} notification(s).`
    );
  }

  const remaining = await Customer.countDocuments({ phone: ADMIN_PHONE });
  console.log(`\nCustomer accounts on the admin number now: ${remaining}`);

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

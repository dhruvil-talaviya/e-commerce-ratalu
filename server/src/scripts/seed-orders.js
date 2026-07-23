require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Flavor = require('../models/Flavor');
const Product = require('../models/Product');
const Counter = require('../models/Counter');

const STATUSES = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled'
];

const seedOrders = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ratalu';
    console.log(`Connecting to MongoDB for seeding orders: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Database connected successfully.');

    // Clear existing orders
    await Order.deleteMany({});
    await Counter.deleteMany({ _id: 'orderNumber' });
    console.log('Existing orders and counters cleared.');

    const customers = await Customer.find({});
    const flavors = await Flavor.find({});
    const products = await Product.find({});

    if (customers.length === 0 || flavors.length === 0 || products.length === 0) {
      console.error('Please run the main seed script first (npm run seed) to create customers, flavors, and products.');
      process.exit(1);
    }

    const orderData = [];

    // Let's create orders spread across the last 30 days
    const now = new Date();
    for (let i = 0; i < 20; i++) {
      const customer = customers[i % customers.length];
      const address = customer.addresses.length > 0
        ? customer.addresses[0]
        : { addressLine: '123 Default St', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' };

      // Select 1 to 2 random flavors
      const numItems = Math.floor(Math.random() * 2) + 1;
      const items = [];
      let subtotal = 0;

      for (let j = 0; j < numItems; j++) {
        const flavor = flavors[(i + j) % flavors.length];
        const product = products.find(p => p.flavorId === flavor.id);
        const pack = product && product.packs.length > 0
          ? product.packs[Math.floor(Math.random() * product.packs.length)]
          : { id: '200g', label: '200g', grams: 200, price: 179 };

        const qty = Math.floor(Math.random() * 2) + 1;
        const itemPrice = pack.price;
        subtotal += itemPrice * qty;

        items.push({
          flavorId: flavor.id,
          flavorName: flavor.name,
          packId: pack.id,
          packLabel: pack.label,
          grams: pack.grams || 200,
          unitPrice: itemPrice,
          quantity: qty,
          gradient: flavor.gradient
        });
      }

      const discount = i % 4 === 0 ? 50 : 0;
      const gstRate = 0.05; // 5% GST
      const gst = Math.round((subtotal - discount) * gstRate);
      const shipping = subtotal > 500 ? 0 : 49;
      const total = subtotal - discount + gst + shipping;

      const orderSeq = await Counter.next('orderNumber');
      const orderId = `RW${1000 + orderSeq}`;

      const daysAgo = 20 - i; // spread over last 20 days
      const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 8 * 60 * 60 * 1000);

      // Status logic: older orders are delivered, newer ones are shipped/pending
      let status = 'Delivered';
      if (daysAgo <= 2) {
        status = STATUSES[Math.floor(Math.random() * 3)]; // Pending, Confirmed, Preparing
      } else if (daysAgo <= 5) {
        status = Math.random() > 0.5 ? 'Shipped' : 'Delivered';
      } else if (daysAgo === 10) {
        status = 'Cancelled';
      }

      const isPaid = status !== 'Cancelled' && status !== 'Pending';
      const paymentStatus = isPaid ? 'Paid' : (status === 'Cancelled' ? 'Cancelled' : 'Pending');

      const order = {
        id: orderId,
        orderNumber: orderSeq,
        customerId: customer._id,
        userName: customer.name || 'Anonymous Guest',
        userPhone: customer.phone,
        items,
        totals: {
          subtotal,
          discount,
          gst,
          shipping,
          total,
          gstEnabled: true,
          cgst: Math.round(gst / 2),
          sgst: Math.round(gst / 2),
          igst: 0,
          state: address.state
        },
        address: {
          tag: address.tag || 'Home',
          addressLine: address.addressLine || `${address.houseNo}, ${address.street}, ${address.area}`,
          city: address.city,
          state: address.state,
          pincode: address.pincode || address.pinCode
        },
        method: 'Razorpay',
        payment: {
          method: 'Razorpay',
          status: paymentStatus,
          transactionId: `pay_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          gatewayOrderId: `order_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          paidAt: isPaid ? orderDate : null
        },
        status,
        createdAt: orderDate,
        updatedAt: orderDate
      };

      orderData.push(order);
    }

    await Order.insertMany(orderData);
    console.log(`Successfully seeded ${orderData.length} mock orders!`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding orders failed:', err);
    process.exit(1);
  }
};

seedOrders();

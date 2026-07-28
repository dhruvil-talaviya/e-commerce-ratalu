const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ratalu');
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Auto-seed permanent Admin account if missing
    const Admin = require('../models/Admin');
    const Customer = require('../models/Customer');
    try {
      await Customer.collection.dropIndex('phone_1');
      logger.info('Dropped legacy phone_1 index on Customer collection');
    } catch {
      // Index might not exist or already dropped
    }

    const adminExists = await Admin.findOne({ email: 'talaviyad380@gmail.com' });
    if (!adminExists) {
      await Admin.create({
        username: 'Admin',
        email: 'talaviyad380@gmail.com',
        password: process.env.ADMIN_PASSWORD || 'Dhr@380',
        role: 'admin'
      });
      logger.info('Auto-seeded Admin account (talaviyad380@gmail.com)');
    } else if (adminExists.role !== 'admin') {
      // Migrate any old role value to lowercase 'admin'
      await Admin.updateOne({ email: 'talaviyad380@gmail.com' }, { $set: { role: 'admin' } });
      logger.info('Migrated admin role to lowercase \'admin\'');
    }
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

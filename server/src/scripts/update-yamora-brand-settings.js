const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const Settings = require('../models/Settings');

async function updateYamoraSettings() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ratalu_db';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
    }

    settings.storeName = 'Yamora Wafers';
    settings.businessName = 'Yamora Wafers Private Limited';
    settings.footerCopyright = '© 2026 Yamora Wafers. All rights reserved.';
    settings.seoTitle = 'Yamora Wafers — India\'s Finest Purple Yam Snacks';
    settings.seoKeywords = 'yamora wafers, ratalu wafers, purple yam chips, indian snacks, healthy chips';
    settings.seoDescription = 'Handcrafted purple yam wafers in 6 bold flavours. No artificial preservatives. Free shipping above ₹599.';
    settings.robotsTxt = 'User-agent: *\nAllow: /\nSitemap: https://yamorawafers.com/sitemap.xml';
    settings.supportEmail = 'support@yamorawafers.com';
    settings.salesEmail = 'sales@yamorawafers.com';

    await settings.save();
    console.log('✅ Updated MongoDB Settings document to Yamora Wafers!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating settings:', error);
    process.exit(1);
  }
}

updateYamoraSettings();

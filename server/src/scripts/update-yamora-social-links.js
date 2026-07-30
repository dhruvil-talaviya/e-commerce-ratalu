import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ratalu-ecommerce';

const socialLinkSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  url: { type: String, default: '' },
  username: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  openInNewTab: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

const SocialLink = mongoose.models.SocialLink || mongoose.model('SocialLink', socialLinkSchema);

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const links = [
    { platform: 'instagram', url: 'https://instagram.com/yamorawafers', username: 'yamorawafers', enabled: true, sortOrder: 0 },
    { platform: 'facebook', url: 'https://facebook.com/yamorawafers', username: 'yamorawafers', enabled: true, sortOrder: 1 },
    { platform: 'x', url: 'https://x.com/yamorawafers', username: 'yamorawafers', enabled: true, sortOrder: 2 },
    { platform: 'youtube', url: 'https://youtube.com/@yamorawafers', username: 'yamorawafers', enabled: true, sortOrder: 3 }
  ];

  for (const l of links) {
    await SocialLink.findOneAndUpdate(
      { platform: l.platform },
      { $set: l },
      { upsert: true, new: true }
    );
  }

  console.log('SocialLink DB records updated successfully');

  await mongoose.disconnect();
  console.log('Disconnected');
}

run().catch(console.error);

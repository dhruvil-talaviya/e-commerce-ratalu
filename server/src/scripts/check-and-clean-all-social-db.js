import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ratalu-ecommerce';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // 1. Clean SocialLink collection
  const socialLinksCol = db.collection('sociallinks');
  const allSocials = await socialLinksCol.find({}).toArray();
  console.log('Current SocialLinks in DB:', allSocials);

  for (const s of allSocials) {
    if (s.platform === 'instagram' || (s.url && s.url.includes('instagram'))) {
      await socialLinksCol.updateOne(
        { _id: s._id },
        { $set: { url: 'https://instagram.com/yamorawafers', username: 'yamorawafers', enabled: true } }
      );
    }
  }

  // 2. Clean PageSection / HomepageSection collections
  const pageSectionsCol = db.collection('pagesections');
  const pageSections = await pageSectionsCol.find({}).toArray();
  for (const ps of pageSections) {
    let str = JSON.stringify(ps);
    if (str.includes('dhruvil') || str.includes('ratalu')) {
      console.log('Found old reference in PageSection:', ps._id, ps.sectionKey);
      if (ps.draft && ps.draft.posts) {
        ps.draft.handle = '@yamorawafers';
        ps.draft.posts = ps.draft.posts.map((p) => ({
          ...p,
          link: 'https://instagram.com/yamorawafers'
        }));
      }
      if (ps.published && ps.published.posts) {
        ps.published.handle = '@yamorawafers';
        ps.published.posts = ps.published.posts.map((p) => ({
          ...p,
          link: 'https://instagram.com/yamorawafers'
        }));
      }
      await pageSectionsCol.updateOne({ _id: ps._id }, { $set: { draft: ps.draft, published: ps.published } });
    }
  }

  // 3. Clean Settings collection
  const settingsCol = db.collection('settings');
  const settings = await settingsCol.find({}).toArray();
  for (const st of settings) {
    if (st.contactInstagram && (st.contactInstagram.includes('dhruvil') || st.contactInstagram.includes('ratalu'))) {
      await settingsCol.updateOne(
        { _id: st._id },
        { $set: { contactInstagram: 'https://instagram.com/yamorawafers' } }
      );
    }
  }

  console.log('All DB references cleaned to https://instagram.com/yamorawafers successfully');

  await mongoose.disconnect();
  console.log('Disconnected');
}

run().catch(console.error);

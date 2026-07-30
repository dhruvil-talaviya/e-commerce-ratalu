import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ratalu-ecommerce';

const pageSectionSchema = new mongoose.Schema({
  page: { type: String, required: true },
  sectionKey: { type: String, required: true },
  label: { type: String, default: '' },
  type: { type: String, default: 'gallery' },
  sortOrder: { type: Number, default: 6 },
  enabled: { type: Boolean, default: true },
  draft: { type: mongoose.Schema.Types.Mixed, default: {} },
  published: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const PageSection = mongoose.models.PageSection || mongoose.model('PageSection', pageSectionSchema);

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const content = {
    eyebrow: "📸 INSTAGRAM COMMUNITY",
    title: "Join the",
    titleHighlight: "crunch community",
    handle: "@yamorawafers",
    description: "Tag @yamorawafers to get featured. Real snackers, real love.",
    postLimit: 6,
    posts: [
      {
        flavorIndex: 0,
        caption: "Movie night sorted with Original Salted 🍿 #YamoraWafers #CrunchTime",
        image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80",
        likes: 1420
      },
      {
        flavorIndex: 2,
        caption: "That peri peri kick 🔥 #SnackTime #PeriPeriCrunch",
        image: "https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=800&q=80",
        likes: 2105
      },
      {
        flavorIndex: 4,
        caption: "Cheesy little obsession 🧀 #NaturallyCrispy #YamoraSnacks",
        image: "https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=800&q=80",
        likes: 1890
      },
      {
        flavorIndex: 1,
        caption: "Nostalgia in every pack ✨ #YamoraWafers #HeritageFlavours",
        image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=800&q=80",
        likes: 1650
      },
      {
        flavorIndex: 5,
        caption: "Green chilli > everything 🌶️ #PureRatalu #CrispyGoodness",
        image: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=80",
        likes: 1340
      },
      {
        flavorIndex: 3,
        caption: "Cracked pepper perfection 🥔 #TastySnacking #Yamora",
        image: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=800&q=80",
        likes: 1980
      }
    ]
  };

  const updated = await PageSection.updateMany(
    { page: 'home', sectionKey: { $in: ['instagram', 'instagram-gallery', 'instagram_gallery'] } },
    {
      $set: {
        enabled: true,
        draft: content,
        published: content
      }
    },
    { upsert: true }
  );

  console.log('Updated PageSections:', updated);

  await mongoose.disconnect();
  console.log('Disconnected');
}

run().catch(console.error);

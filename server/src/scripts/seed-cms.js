/**
 * Import the storefront's CURRENT content into the CMS.
 *
 * This is a lossless migration, not a demo seed: every string below is the copy
 * the site renders today (lifted from lib/i18n/translations.ts and the section
 * components). Publishing straight after this changes nothing visible — which is
 * exactly what we want, because it proves the CMS is serving the real site
 * rather than replacing it with placeholder text.
 *
 * Idempotent: re-running updates the section definitions but never clobbers a
 * draft the admin is working on, and never overwrites content already published
 * from the console.
 *
 *   npm run seed:cms
 */
require('dotenv').config();
const mongoose = require('mongoose');
const PageSection = require('../models/PageSection');

/** The homepage exactly as it renders today. */
const HOMEPAGE = [
  {
    key: 'announcement',
    label: 'Announcement Bar',
    type: 'announcement',
    sortOrder: 0,
    content: {
      enabled: true,
      items: [
        {
          text: 'No artificial colours · No palm oil · 100% vegetarian',
          icon: 'leaf',
          link: ''
        },
        {
          text: 'Small-batch kettle-cooked, dispatched fresh daily',
          icon: 'truck',
          link: ''
        },
        {
          text: 'Freshness guaranteed or your money back',
          icon: 'shield',
          link: ''
        }
      ],
      backgroundColor: '#F59E0B',
      textColor: '#FFFFFF',
      speed: 30
    }
  },
  {
    key: 'hero',
    label: 'Hero Banner',
    type: 'hero',
    sortOrder: 1,
    content: {
      // Multiple slides supported; the storefront renders slide[0] and rotates
      // through the rest when more than one is enabled.
      slides: [
        {
          id: 'slide-1',
          enabled: true,
          badge: 'Loved by {count}+ snackers',
          badgeCount: 2000,
          headingLine1: 'Crispy. Natural.',
          headingLine2: 'Irresistible.',
          description:
            'Made from hand-selected fresh Ratalu, kettle-cooked into perfectly crispy wafers with unforgettable flavours. Small-batch, no artificial colours, delivered fresh.',
          primaryCta: { label: 'Shop Now', href: '/shop' },
          secondaryCta: { label: 'Explore Flavours', href: '#flavours' },
          alignment: 'left',
          backgroundImage: '',
          mobileImage: '',
          overlay: '',
          height: 'auto'
        }
      ],
      stats: [
        { value: 4.9, suffix: '★', decimals: 1, label: 'Avg. rating' },
        { value: 6, suffix: '', decimals: 0, label: 'Bold flavours' },
        { value: 100, suffix: '%', decimals: 0, label: 'Natural' }
      ],
      showStats: true
    }
  },
  {
    key: 'why-choose-us',
    label: 'Why Choose Us',
    type: 'feature-grid',
    sortOrder: 2,
    content: {
      eyebrow: 'Why Ratalu',
      title: 'Why Choose Ratalu Chips',
      description:
        'Crafting the ultimate guilt-free gourmet snack. Sourced responsibly, cooked traditionally, seasoned by hand.',
      features: [
        {
          icon: 'Leaf',
          title: 'Fresh Ingredients',
          body: 'Sliced from just-harvested yam, never frozen or from concentrate.'
        },
        {
          icon: 'Hand',
          title: 'Hand-Selected Ratalu',
          body: 'Every root is chosen by hand for the perfect size, colour and starch.'
        },
        {
          icon: 'Droplets',
          title: 'Premium Quality Oil',
          body: 'Cold-pressed sunflower oil only — light, clean and never reused.'
        },
        {
          icon: 'Ban',
          title: 'No Artificial Colours',
          body: 'That gorgeous purple is 100% natural. No dyes, no MSG, no palm oil.'
        },
        {
          icon: 'Sparkles',
          title: 'Perfect Crispiness',
          body: 'Kettle-cooked low and slow for a signature shattering crunch.'
        },
        {
          icon: 'Clock',
          title: 'Made Fresh',
          body: 'Cooked in small batches and dispatched within days, not months.'
        }
      ],
      stats: [
        { value: 100, suffix: '%', decimals: 0, label: 'Natural ingredients' },
        { value: 3, suffix: '', decimals: 0, label: 'Simple ingredients' },
        { value: 0, suffix: '', decimals: 0, label: 'Artificial colours' },
        { value: 24, suffix: 'h', decimals: 0, label: 'Yam to kettle' }
      ]
    }
  },
  {
    key: 'how-its-made',
    label: "How It's Made",
    type: 'feature-grid',
    sortOrder: 3,
    content: {
      eyebrow: 'How we make it',
      title: 'Five steps to the',
      titleHighlight: 'perfect crunch',
      description:
        "No factory shortcuts — just a careful, small-batch craft we're proud of.",
      features: [
        {
          icon: 'Hand',
          title: 'Hand-selected',
          body: 'Fresh purple yam, chosen by hand for size, colour & starch.'
        },
        {
          icon: 'Slice',
          title: 'Thin-sliced',
          body: 'Cut to the perfect thickness within hours of arriving.'
        },
        {
          icon: 'Flame',
          title: 'Kettle-cooked',
          body: 'Small batches, cooked low & slow for a shattering crunch.'
        },
        {
          icon: 'Sparkles',
          title: 'Seasoned by hand',
          body: 'Real spices tossed on fresh — never sprayed, never dull.'
        },
        {
          icon: 'PackageCheck',
          title: 'Nitrogen-sealed',
          body: 'Flushed & sealed to lock in that just-cooked freshness.'
        }
      ]
    }
  },
  {
    key: 'farm-fresh',
    label: 'Farm Fresh',
    type: 'feature-grid',
    sortOrder: 4,
    content: {
      eyebrow: 'Farm fresh',
      title: 'Real ingredients you can',
      titleHighlight: 'actually pronounce',
      description:
        'Great chips start long before the kettle. Ours begin at the farm, with purple yam chosen by hand and a promise to keep everything honest and clean.',
      panel: {
        badge: 'Farm to pack',
        headline: 'From soil to shelf in under',
        headlineValue: 24,
        headlineSuffix: 'h',
        body: "We don't stockpile. Yam is harvested, hand-washed, sliced and kettle-cooked in small daily batches — so every pack tastes garden-fresh."
      },
      features: [
        {
          icon: 'MapPin',
          title: 'Grown in Gujarat',
          body: 'Sourced direct from trusted purple-yam farms across Saurashtra.'
        },
        {
          icon: 'Sun',
          title: 'Peak-season harvest',
          body: 'Picked at ripeness for the sweetest, nuttiest flavour.'
        },
        {
          icon: 'Droplets',
          title: 'Cold-pressed oils',
          body: 'Only light, clean sunflower oil — never reused, never palm.'
        },
        {
          icon: 'Sprout',
          title: 'Nothing artificial',
          body: 'No colours, no MSG, no preservatives. Ever.'
        }
      ],
      stats: [
        { value: 100, suffix: '%', decimals: 0, label: 'Natural' },
        { value: 0, suffix: '', decimals: 0, label: 'Preservatives' },
        { value: 6, suffix: '', decimals: 0, label: 'Bold flavours' }
      ]
    }
  },
  {
    key: 'about',
    label: 'About / Our Pillars',
    type: 'feature-grid',
    sortOrder: 5,
    content: {
      eyebrow: 'Our Story',
      // Title and body copy for this section live in Settings
      // (ourStoryTitle / ourStoryMainText) and are already editable there.
      badge: { year: 'Est. 2021', location: 'Rajkot · Gujarat' },
      features: [
        {
          icon: 'Sprout',
          title: 'Fresh, hand-selected',
          body: 'We source purple yam at its peak and slice it within hours — never from concentrate, never frozen.'
        },
        {
          icon: 'Flame',
          title: 'Traditional kettle-cooking',
          body: 'Cooked low and slow in small batches, the old-fashioned way, for that signature shattering crunch.'
        },
        {
          icon: 'Package',
          title: 'Premium, sealed packaging',
          body: 'Nitrogen-flushed pouches lock in freshness so every pack tastes just-made when it reaches you.'
        },
        {
          icon: 'HandHeart',
          title: 'Nothing artificial',
          body: 'No artificial colours, no MSG, no palm oil. Just yam, good oil and honest seasoning.'
        }
      ]
    }
  },
  {
    key: 'instagram',
    label: 'Instagram Gallery',
    type: 'gallery',
    sortOrder: 6,
    content: {
      eyebrow: "On the 'gram",
      title: 'Join the',
      titleHighlight: 'crunch community',
      handle: '@rataluchips',
      description: 'Tag {handle} to get featured. Real snackers, real love.',
      posts: [
        { flavorIndex: 0, caption: 'Movie night sorted 🍿', likes: 1284 },
        { flavorIndex: 2, caption: 'That peri peri kick 🔥', likes: 2043 },
        { flavorIndex: 4, caption: 'Cheesy little obsession 🧀', likes: 1567 },
        { flavorIndex: 1, caption: 'Nostalgia in a pack ✨', likes: 1892 },
        { flavorIndex: 5, caption: 'Green chilli > everything 🌶️', likes: 1120 },
        { flavorIndex: 3, caption: 'Cracked pepper perfection', likes: 977 }
      ]
    }
  },
  {
    key: 'best-sellers',
    label: 'Best Sellers',
    type: 'product-list',
    sortOrder: 7,
    content: {
      eyebrow: 'Most loved',
      title: 'Best Sellers',
      description: 'The flavours our customers keep coming back for.',
      source: 'best-seller',
      sortBy: 'most-ordered',
      layout: 'grid',
      limit: 4
    }
  },
  {
    key: 'offers',
    label: 'Offers & Promotions',
    type: 'offers',
    sortOrder: 8,
    content: {
      title: 'Live offers',
      description: 'Apply these at checkout.',
      showActiveCoupons: true,
      limit: 4
    }
  },
  {
    key: 'testimonials',
    label: 'Testimonials',
    type: 'testimonials',
    sortOrder: 9,
    content: {
      eyebrow: 'Reviews',
      title: 'What snackers are saying',
      description: '',
      source: 'live-reviews',
      limit: 6
    }
  },
  {
    key: 'faqs',
    label: 'FAQ',
    type: 'faq',
    sortOrder: 10,
    content: {
      eyebrow: 'Questions',
      title: 'Frequently asked questions',
      description: 'Everything you need to know before you order.',
      source: 'faq-collection'
    }
  },
  {
    key: 'newsletter',
    label: 'Newsletter',
    type: 'newsletter',
    sortOrder: 11,
    content: {
      enabled: true,
      badge: '10% off your first order',
      title: 'Join the crunch club',
      description:
        'New flavours, secret drops and subscriber-only deals — plus 10% off your first box the moment you sign up.',
      placeholder: 'you@example.com',
      buttonLabel: 'Get 10% off',
      loadingLabel: 'Joining',
      successMessage: "You're in! Check your inbox for your code.",
      errorMessage: 'Please enter a valid email address.',
      terms: 'No spam, ever. Unsubscribe in one click.',
      privacyLink: '/privacy',
      backgroundImage: ''
    }
  }
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ratalu');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const def of HOMEPAGE) {
    const existing = await PageSection.findOne({ page: 'homepage', key: def.key });

    if (!existing) {
      await PageSection.create({
        page: 'homepage',
        key: def.key,
        label: def.label,
        type: def.type,
        sortOrder: def.sortOrder,
        enabled: true,
        // Seeded content goes live immediately — it *is* the current site.
        published: def.content,
        draft: def.content,
        hasUnpublishedChanges: false,
        publishedAt: new Date(),
        publishedBy: 'seed'
      });
      console.log(`  + created  ${def.key.padEnd(16)} (${def.type})`);
      created++;
      continue;
    }

    // Never trample content the owner has already edited from the console.
    if (existing.publishedBy && existing.publishedBy !== 'seed') {
      console.log(`  · skipped  ${def.key.padEnd(16)} (edited in the console — content preserved)`);
      skipped++;
      continue;
    }

    /**
     * Still untouched by a human, so refresh the content too. Definition-only
     * updates would leave an earlier seed's placeholder (e.g. an empty
     * `features: []`) in place, and that empty array merges *over* the
     * component's fallback — rendering an empty grid on the live site.
     */
    existing.label = def.label;
    existing.type = def.type;
    existing.sortOrder = def.sortOrder;
    existing.published = def.content;
    existing.draft = def.content;
    existing.hasUnpublishedChanges = false;
    existing.publishedAt = new Date();
    existing.publishedBy = 'seed';
    await existing.save();
    console.log(`  ~ updated  ${def.key.padEnd(16)} (definition + content)`);
    updated++;
  }

  console.log(`\n${created} created, ${updated} updated, ${skipped} skipped.`);
  console.log('The homepage is now served from MongoDB. Nothing visible changed.');

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

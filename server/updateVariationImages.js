'use strict';
require('dotenv').config();
const mongoose = require('mongoose');

const URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fenchel-shades';

// Flow: 1 - Dimension, 2 - Attachment, 3 - Covering
const ATTACHMENT_IMAGES = {
  'Washer|BURLAP - NATURAL':   '/uploads/1791793917448-washer-natural.webp',
  'Washer|BURLAP - OFF WHITE': '/uploads/1791793407088-n5epbwj7uq.webp',
  'Washer|BURLAP- BLACK':      '/uploads/1791793421753-ijtqtoq7gv.webp',
  'Bulb|BURLAP - NATURAL':     '/uploads/1791793482904-pixk6t4wa7.webp',
  'Bulb|BURLAP - OFF WHITE':   '/uploads/1791793495947-oopui3rs99g.webp',
  'Bulb|BURLAP- BLACK':        '/uploads/1791793506310-p6wwh9ijr2e.webp',
};

const COVERING_IMAGES = {
  'Washer|BURLAP - NATURAL':   '/uploads/1791793917506-natural-covering.webp',
  'Washer|BURLAP - OFF WHITE': '/uploads/1791793407266-4dsgnw4fbol.webp',
  'Washer|BURLAP- BLACK':      '/uploads/1791793421966-i2s5znhlsrd.webp',
  'Bulb|BURLAP - NATURAL':     '/uploads/1791793483121-63mdg852mko.webp',
  'Bulb|BURLAP - OFF WHITE':   '/uploads/1791793496151-1ew3i1owh0f.webp',
  'Bulb|BURLAP- BLACK':        '/uploads/1791793506516-wsejoxpieo.webp',
};

function getDimensionImage(top, bottom, slant) {
  return `/images/lampshades/dimensions/top-${top}-bottom-${bottom}-slant-${slant}.png`;
}

async function updateAllVariations() {
  await mongoose.connect(URI, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB');

  const col = mongoose.connection.db.collection('products');
  const p = await col.findOne({ sku: 'CUSTOM-ROUND' });
  if (!p) {
    console.error('Product CUSTOM-ROUND not found');
    await mongoose.disconnect();
    process.exit(1);
  }

  const exConfigs = p.configurations || [];
  console.log('Existing configurations count:', exConfigs.length);

  const updatedConfigs = exConfigs.map((cfg) => {
    const s = cfg.selections || {};
    const top = s['Top Diameter'];
    const bot = s['Bottom Diameter'];
    const slant = s['Lampshade Slant Height'];
    const att = s['Attachment Style'];
    const cov = s['Lampshade Covering'];

    const dimImg = getDimensionImage(top, bot, slant);
    const pairKey = `${att}|${cov}`;
    const attImg = ATTACHMENT_IMAGES[pairKey];
    const covImg = COVERING_IMAGES[pairKey];

    const images = [dimImg, attImg, covImg].filter(Boolean);

    return {
      ...cfg,
      images,
    };
  });

  // Also set default product.images to match the initial variation:
  // Top 2.5, Bottom 3, Slant 4, Washer, BURLAP - NATURAL
  const defaultImages = [
    getDimensionImage('2.5', '3', '4'),
    ATTACHMENT_IMAGES['Washer|BURLAP - NATURAL'],
    COVERING_IMAGES['Washer|BURLAP - NATURAL'],
  ];

  await col.updateOne(
    { sku: 'CUSTOM-ROUND' },
    {
      $set: {
        configurations: updatedConfigs,
        images: defaultImages,
      },
    }
  );

  console.log('Updated configurations count:', updatedConfigs.length);

  // Verification
  const verify = await col.findOne({ sku: 'CUSTOM-ROUND' });
  console.log('Verified product images:', verify.images);
  console.log('Sample variation 0 images:', verify.configurations[0]?.images);
  console.log('Sample variation 0 selections:', verify.configurations[0]?.selections);
  console.log('Sample variation 1 images:', verify.configurations[1]?.images);
  console.log('Sample variation 1 selections:', verify.configurations[1]?.selections);

  const allHave3 = verify.configurations.every((c) => c.images?.length === 3);
  console.log('All 162 variations have 3 images:', allHave3);

  const allHaveDim = verify.configurations.every(
    (c) => c.images?.[0]?.startsWith('/images/lampshades/dimensions/')
  );
  console.log('All variations have dimension image as index 0:', allHaveDim);

  await mongoose.disconnect();
  console.log('Done!');
}

updateAllVariations().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

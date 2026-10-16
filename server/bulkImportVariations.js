'use strict';
require('dotenv').config();
const { MongoClient } = require('mongodb');

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

const TOPS   = ['2.5', '3', '3.5'];
const BOTS   = ['3', '3.5', '4'];
const SLANTS = ['4', '4.5', '5'];
const ATTS   = ['Washer', 'Bulb'];
const COVS   = ['BURLAP - NATURAL', 'BURLAP - OFF WHITE', 'BURLAP- BLACK'];

function gen162() {
  const all = [];
  for (const t of TOPS) for (const b of BOTS) for (const s of SLANTS) for (const a of ATTS) for (const c of COVS) {
    const k = [t, b, s, a, c].map(v => String(v).trim().toLowerCase()).join('|');
    const dimImg = getDimensionImage(t, b, s);
    const attImg = ATTACHMENT_IMAGES[a + '|' + c];
    const covImg = COVERING_IMAGES[a + '|' + c];
    all.push({
      id: 'config-bulk-' + k.replace(/\|/g, '-'),
      selections: { 'Top Diameter': t, 'Bottom Diameter': b, 'Lampshade Slant Height': s, 'Attachment Style': a, 'Lampshade Covering': c },
      sku: '', priceAdjustment: 0, status: 'active',
      images: [dimImg, attImg, covImg].filter(Boolean),
      configurationKey: k,
    });
  }
  return all;
}

const all162 = gen162();
console.log('Generated:', all162.length, 'configs');
if (all162.length !== 162) { console.error('FATAL wrong count'); process.exit(1); }

async function run() {
  const cl = new MongoClient(URI, { serverSelectionTimeoutMS: 15000 });
  await cl.connect();
  console.log('Connected to MongoDB');
  const col = cl.db('fenchel-shades').collection('products');
  const p = await col.findOne({ sku: 'CUSTOM-ROUND' });
  if (!p) { console.error('Product not found'); await cl.close(); process.exit(1); }
  
  await col.updateOne({ sku: 'CUSTOM-ROUND' }, { $set: { configurations: all162 } });
  const saved = await col.findOne({ sku: 'CUSTOM-ROUND' });
  console.log('Final configuration count in DB:', saved.configurations.length);
  if (saved.configurations.length === 162) {
    console.log('SUCCESS: All 162 variations updated with dimension images!');
  }
  await cl.close();
  console.log('Done.');
}

run().catch(e => { console.error('Fatal:', e.message, e.stack); process.exit(1); });

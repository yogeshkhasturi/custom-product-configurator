'use strict';
require('dotenv').config();
const { MongoClient } = require('mongodb');
const URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fenchel-shades';

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

// Fix configs that have no images or incomplete images
async function fix() {
  const cl = new MongoClient(URI, { serverSelectionTimeoutMS: 15000 });
  await cl.connect();
  const col = cl.db('fenchel-shades').collection('products');
  const p = await col.findOne({ sku: 'CUSTOM-ROUND' });
  const cfgs = p.configurations || [];

  const fixed = cfgs.map(function(c) {
    const s = c.selections || {};
    const t = s['Top Diameter'];
    const b = s['Bottom Diameter'];
    const sl = s['Lampshade Slant Height'];
    const a = s['Attachment Style'];
    const cv = s['Lampshade Covering'];
    const key = a + '|' + cv;

    const dimImg = getDimensionImage(t, b, sl);
    const attImg = ATTACHMENT_IMAGES[key];
    const covImg = COVERING_IMAGES[key];
    const imgs = [dimImg, attImg, covImg].filter(Boolean);

    return Object.assign({}, c, { images: imgs });
  });

  const setOp = { configurations: fixed };
  await col.updateOne({ sku: 'CUSTOM-ROUND' }, { $set: setOp });
  console.log('Done fixing all variations with 3 gallery images.');
  await cl.close();
}

fix().catch(function(e) { console.error('Fatal:', e.message); process.exit(1); });

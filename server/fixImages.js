/**
 * fixImages.js
 * Converts every absolute image URL in MongoDB to a relative /uploads/... path.
 *
 * Usage:
 *   node fixImages.js                          — uses MONGO_URI from .env
 *   node fixImages.js mongodb+srv://...        — uses the URI passed as argument
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.argv[2] || process.env.MONGO_URI;
if (!MONGO_URI) { console.error('No MONGO_URI. Pass it as argument or set in .env'); process.exit(1); }

function toRelative(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('/uploads/')) return url;
  const match = url.match(/\/uploads\/(.+)$/);
  return match ? `/uploads/${match[1]}` : url;
}

function fixArray(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(toRelative);
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB\n');

  const col = mongoose.connection.db.collection('products');
  const products = await col.find({}).toArray();
  console.log(`Found ${products.length} product(s)\n`);

  for (const doc of products) {
    const $set = {};

    // 1. top-level images[]
    const fixedImages = fixArray(doc.images || []);
    if (JSON.stringify(fixedImages) !== JSON.stringify(doc.images))
      $set['images'] = fixedImages;

    // 2. configurations[].images[]
    (doc.configurations || []).forEach((cfg, ci) => {
      const fixed = fixArray(cfg.images || []);
      if (JSON.stringify(fixed) !== JSON.stringify(cfg.images))
        $set[`configurations.${ci}.images`] = fixed;
    });

    // 3. customizationFields[].options[].images[]
    (doc.customizationFields || []).forEach((field, fi) => {
      (field.options || []).forEach((opt, oi) => {
        const fixed = fixArray(opt.images || []);
        if (JSON.stringify(fixed) !== JSON.stringify(opt.images))
          $set[`customizationFields.${fi}.options.${oi}.images`] = fixed;
      });
    });

    // 4. stepsConfig[].fields[].options[].images[]
    (doc.stepsConfig || []).forEach((step, si) => {
      (step.fields || []).forEach((field, fi) => {
        (field.options || []).forEach((opt, oi) => {
          const fixed = fixArray(opt.images || []);
          if (JSON.stringify(fixed) !== JSON.stringify(opt.images))
            $set[`stepsConfig.${si}.fields.${fi}.options.${oi}.images`] = fixed;
        });
      });
    });

    // 5. steps[].fields[].options[].images[] (legacy)
    (doc.steps || []).forEach((step, si) => {
      (step.fields || []).forEach((field, fi) => {
        (field.options || []).forEach((opt, oi) => {
          const fixed = fixArray(opt.images || []);
          if (JSON.stringify(fixed) !== JSON.stringify(opt.images))
            $set[`steps.${si}.fields.${fi}.options.${oi}.images`] = fixed;
        });
      });
    });

    if (Object.keys($set).length === 0) {
      console.log(`– No changes needed: ${doc.name}`);
      continue;
    }

    console.log(`Updating "${doc.name}":`);
    Object.entries($set).forEach(([k, v]) => console.log(`  ${k}:`, v));

    const result = await col.updateOne({ _id: doc._id }, { $set });
    console.log(`  → matched: ${result.matchedCount}, modified: ${result.modifiedCount}\n`);
  }

  // Verify
  console.log('\n--- VERIFICATION ---');
  const updated = await col.find({}).toArray();
  let total = 0, bad = [];
  const chk = (arr) => (arr || []).forEach(u => { if (!u) return; total++; if (!u.startsWith('/uploads/')) bad.push(u); });
  updated.forEach(doc => {
    chk(doc.images);
    (doc.configurations || []).forEach(c => chk(c.images));
    (doc.customizationFields || []).forEach(f => (f.options || []).forEach(o => chk(o.images)));
    (doc.stepsConfig || []).forEach(s => (s.fields || []).forEach(f => (f.options || []).forEach(o => chk(o.images))));
    (doc.steps || []).forEach(s => (s.fields || []).forEach(f => (f.options || []).forEach(o => chk(o.images))));
  });

  console.log(`Total image URLs: ${total}`);
  if (bad.length === 0) {
    console.log('✓ ALL CLEAN — every image is a relative /uploads/... path');
  } else {
    console.log(`✗ ${bad.length} still absolute:`);
    bad.forEach(u => console.log(' ', u));
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });

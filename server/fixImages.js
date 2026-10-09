/**
 * fixImages.js
 * Directly rewrites all absolute image URLs to relative /uploads/... paths in MongoDB.
 * Uses direct field updates (not replaceOne) to avoid any schema conflicts.
 *
 * Run: node fixImages.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

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

  const db = mongoose.connection.db;
  const col = db.collection('products');
  const products = await col.find({}).toArray();
  console.log(`Found ${products.length} product(s)\n`);

  for (const doc of products) {
    const $set = {};

    // 1. top-level images[]
    const fixedImages = fixArray(doc.images || []);
    if (JSON.stringify(fixedImages) !== JSON.stringify(doc.images)) {
      $set['images'] = fixedImages;
    }

    // 2. configurations[].images[]
    if (Array.isArray(doc.configurations)) {
      doc.configurations.forEach((cfg, ci) => {
        const fixed = fixArray(cfg.images || []);
        if (JSON.stringify(fixed) !== JSON.stringify(cfg.images)) {
          $set[`configurations.${ci}.images`] = fixed;
        }
      });
    }

    // 3. customizationFields[].options[].images[]
    if (Array.isArray(doc.customizationFields)) {
      doc.customizationFields.forEach((field, fi) => {
        if (!Array.isArray(field.options)) return;
        field.options.forEach((opt, oi) => {
          const fixed = fixArray(opt.images || []);
          if (JSON.stringify(fixed) !== JSON.stringify(opt.images)) {
            $set[`customizationFields.${fi}.options.${oi}.images`] = fixed;
          }
        });
      });
    }

    // 4. stepsConfig[].fields[].options[].images[]
    if (Array.isArray(doc.stepsConfig)) {
      doc.stepsConfig.forEach((step, si) => {
        if (!Array.isArray(step.fields)) return;
        step.fields.forEach((field, fi) => {
          if (!Array.isArray(field.options)) return;
          field.options.forEach((opt, oi) => {
            const fixed = fixArray(opt.images || []);
            if (JSON.stringify(fixed) !== JSON.stringify(opt.images)) {
              $set[`stepsConfig.${si}.fields.${fi}.options.${oi}.images`] = fixed;
            }
          });
        });
      });
    }

    // 5. steps[].fields[].options[].images[] (legacy)
    if (Array.isArray(doc.steps)) {
      doc.steps.forEach((step, si) => {
        if (!Array.isArray(step.fields)) return;
        step.fields.forEach((field, fi) => {
          if (!Array.isArray(field.options)) return;
          field.options.forEach((opt, oi) => {
            const fixed = fixArray(opt.images || []);
            if (JSON.stringify(fixed) !== JSON.stringify(opt.images)) {
              $set[`steps.${si}.fields.${fi}.options.${oi}.images`] = fixed;
            }
          });
        });
      });
    }

    if (Object.keys($set).length === 0) {
      console.log(`– No changes: ${doc.name}`);
      continue;
    }

    console.log(`Updating "${doc.name}" — fields changed:`);
    Object.keys($set).forEach(k => console.log(`   ${k}:`, $set[k]));

    const result = await col.updateOne({ _id: doc._id }, { $set });
    console.log(`  → matchedCount: ${result.matchedCount}, modifiedCount: ${result.modifiedCount}\n`);
  }

  // Verify
  console.log('\n--- VERIFICATION ---');
  const updated = await col.find({}).toArray();
  let totalUrls = 0, badUrls = 0;
  for (const doc of updated) {
    const check = (arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach(u => {
        if (!u) return;
        totalUrls++;
        if (!u.startsWith('/uploads/')) { badUrls++; console.log('  STILL BAD:', u); }
      });
    };
    check(doc.images);
    (doc.configurations || []).forEach(c => check(c.images));
    (doc.customizationFields || []).forEach(f => (f.options || []).forEach(o => check(o.images)));
    (doc.stepsConfig || []).forEach(s => (s.fields || []).forEach(f => (f.options || []).forEach(o => check(o.images))));
    (doc.steps || []).forEach(s => (s.fields || []).forEach(f => (f.options || []).forEach(o => check(o.images))));
  }
  console.log(`Total image URLs: ${totalUrls}`);
  console.log(`Bad (still absolute): ${badUrls}`);
  console.log(badUrls === 0 ? '\n✓ All URLs are now relative /uploads/... paths' : '\n✗ Some URLs still need fixing');

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });

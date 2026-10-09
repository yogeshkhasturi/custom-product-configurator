/**
 * migrateImages.js
 * Converts every absolute image URL stored in MongoDB to a relative /uploads/... path.
 * Handles: http://localhost:5000/..., https://cloudways-host/..., any other absolute URL
 * that contains /uploads/.
 *
 * Run once:  node migrateImages.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

// Convert any absolute URL that contains /uploads/ to a relative path
function toRelative(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('/uploads/')) return url; // already relative
  const match = url.match(/\/uploads\/(.+)$/);
  if (match) return `/uploads/${match[1]}`;
  return url; // not an uploads URL — leave untouched
}

function migrateArray(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(toRelative);
}

// Walk a product document and rewrite all image fields in-place.
// Returns true if anything changed.
function migrateProduct(doc) {
  let changed = false;

  // 1. Top-level images[]
  if (Array.isArray(doc.images)) {
    const updated = migrateArray(doc.images);
    if (JSON.stringify(updated) !== JSON.stringify(doc.images)) {
      doc.images = updated;
      changed = true;
    }
  }

  // 2. configurations[].images[]
  if (Array.isArray(doc.configurations)) {
    doc.configurations = doc.configurations.map((cfg) => {
      if (!Array.isArray(cfg.images)) return cfg;
      const updated = migrateArray(cfg.images);
      if (JSON.stringify(updated) !== JSON.stringify(cfg.images)) {
        changed = true;
        return { ...cfg, images: updated };
      }
      return cfg;
    });
  }

  // 3. customizationFields[].options[].images[]
  if (Array.isArray(doc.customizationFields)) {
    doc.customizationFields = doc.customizationFields.map((field) => {
      if (!Array.isArray(field.options)) return field;
      const updatedOptions = field.options.map((opt) => {
        if (!Array.isArray(opt.images)) return opt;
        const updated = migrateArray(opt.images);
        if (JSON.stringify(updated) !== JSON.stringify(opt.images)) {
          changed = true;
          return { ...opt, images: updated };
        }
        return opt;
      });
      return { ...field, options: updatedOptions };
    });
  }

  // 4. stepsConfig[].fields[].options[].images[]
  if (Array.isArray(doc.stepsConfig)) {
    doc.stepsConfig = doc.stepsConfig.map((step) => {
      if (!Array.isArray(step.fields)) return step;
      const updatedFields = step.fields.map((field) => {
        if (!Array.isArray(field.options)) return field;
        const updatedOptions = field.options.map((opt) => {
          if (!Array.isArray(opt.images)) return opt;
          const updated = migrateArray(opt.images);
          if (JSON.stringify(updated) !== JSON.stringify(opt.images)) {
            changed = true;
            return { ...opt, images: updated };
          }
          return opt;
        });
        return { ...field, options: updatedOptions };
      });
      return { ...step, fields: updatedFields };
    });
  }

  // 5. steps[].fields[].options[].images[] (legacy steps array)
  if (Array.isArray(doc.steps)) {
    doc.steps = doc.steps.map((step) => {
      if (!Array.isArray(step.fields)) return step;
      const updatedFields = step.fields.map((field) => {
        if (!Array.isArray(field.options)) return field;
        const updatedOptions = field.options.map((opt) => {
          if (!Array.isArray(opt.images)) return opt;
          const updated = migrateArray(opt.images);
          if (JSON.stringify(updated) !== JSON.stringify(opt.images)) {
            changed = true;
            return { ...opt, images: updated };
          }
          return opt;
        });
        return { ...field, options: updatedOptions };
      });
      return { ...step, fields: updatedFields };
    });
  }

  return changed;
}

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;
  const collection = db.collection('products');

  const products = await collection.find({}).toArray();
  console.log(`Found ${products.length} product(s).\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const doc of products) {
    const changed = migrateProduct(doc);

    if (changed) {
      await collection.replaceOne({ _id: doc._id }, doc);
      console.log(`✓ Updated: ${doc.name || doc._id}`);
      updatedCount++;
    } else {
      console.log(`– Skipped (no changes): ${doc.name || doc._id}`);
      skippedCount++;
    }
  }

  console.log(`\nDone. Updated: ${updatedCount}, Skipped: ${skippedCount}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

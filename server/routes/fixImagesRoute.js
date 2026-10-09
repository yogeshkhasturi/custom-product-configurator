/**
 * One-time migration route: GET /api/fix-images?secret=fenchel2024
 * Converts all absolute image URLs in MongoDB to relative /uploads/... paths.
 * DELETE THIS FILE after running once on production.
 */

const express = require('express');
const router = express.Router();

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

router.get('/', async (req, res) => {
  if (req.query.secret !== 'fenchel2024') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  try {
    const mongoose = require('mongoose');
    const col = mongoose.connection.db.collection('products');
    const products = await col.find({}).toArray();

    let updatedCount = 0;
    const log = [];

    for (const doc of products) {
      const $set = {};

      const fixedImages = fixArray(doc.images || []);
      if (JSON.stringify(fixedImages) !== JSON.stringify(doc.images))
        $set['images'] = fixedImages;

      (doc.configurations || []).forEach((cfg, ci) => {
        const fixed = fixArray(cfg.images || []);
        if (JSON.stringify(fixed) !== JSON.stringify(cfg.images))
          $set[`configurations.${ci}.images`] = fixed;
      });

      (doc.customizationFields || []).forEach((field, fi) => {
        (field.options || []).forEach((opt, oi) => {
          const fixed = fixArray(opt.images || []);
          if (JSON.stringify(fixed) !== JSON.stringify(opt.images))
            $set[`customizationFields.${fi}.options.${oi}.images`] = fixed;
        });
      });

      (doc.stepsConfig || []).forEach((step, si) => {
        (step.fields || []).forEach((field, fi) => {
          (field.options || []).forEach((opt, oi) => {
            const fixed = fixArray(opt.images || []);
            if (JSON.stringify(fixed) !== JSON.stringify(opt.images))
              $set[`stepsConfig.${si}.fields.${fi}.options.${oi}.images`] = fixed;
          });
        });
      });

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
        log.push(`SKIP: ${doc.name}`);
        continue;
      }

      await col.updateOne({ _id: doc._id }, { $set });
      updatedCount++;
      log.push(`UPDATED: ${doc.name} — fields: ${Object.keys($set).join(', ')}`);
    }

    // Verify
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

    res.json({
      success: true,
      updated: updatedCount,
      totalUrls: total,
      badUrls: bad.length,
      allClean: bad.length === 0,
      log,
      remaining: bad,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

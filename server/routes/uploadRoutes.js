const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Multer — store in memory so sharp can process before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB raw limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  },
});

// POST /api/upload  — single or multiple files (field name: "images")
router.post('/', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    const baseUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
    const urls = [];

    for (const file of req.files) {
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const dest = path.join(UPLOAD_DIR, filename);

      // Optimise: resize to max 1200px wide, convert to WebP at quality 82
      await sharp(file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(dest);

      urls.push(`${baseUrl}/uploads/${filename}`);
    }

    res.json({ success: true, urls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/upload  — body: { url }
router.delete('/', (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'url is required.' });

    const filename = path.basename(url);
    const filepath = path.join(UPLOAD_DIR, filename);

    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

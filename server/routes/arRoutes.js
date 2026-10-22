const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const AR_DIR = path.join(__dirname, '..', 'uploads', 'ar-models');

if (!fs.existsSync(AR_DIR)) {
  fs.mkdirSync(AR_DIR, { recursive: true });
}

// Memory storage for fast buffer handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
});

// Clean up models older than 6 hours to prevent disk accumulation
function cleanOldFiles() {
  try {
    const now = Date.now();
    const files = fs.readdirSync(AR_DIR);
    for (const f of files) {
      const p = path.join(AR_DIR, f);
      const stat = fs.statSync(p);
      if (now - stat.mtimeMs > 6 * 60 * 60 * 1000) {
        fs.unlinkSync(p);
      }
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}

// POST /api/ar/export - Upload generated GLB or USDZ model for AR viewing
router.post('/export', upload.single('model'), (req, res) => {
  try {
    cleanOldFiles();

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No 3D model file provided.' });
    }

    const format = req.body.format === 'usdz' ? 'usdz' : 'glb';
    const filename = `shade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${format}`;
    const dest = path.join(AR_DIR, filename);

    fs.writeFileSync(dest, req.file.buffer);

    // Build absolute URL for Google Scene Viewer / Apple Quick Look
    // Respect forwarded host and proto from Next.js rewrites and ngrok tunnel
    const host = req.get('x-forwarded-host') || req.get('host') || '127.0.0.1:5000';
    const protocol =
      req.get('x-forwarded-proto') ||
      (req.protocol === 'https' || host.includes('ngrok') ? 'https' : 'http');
    const relativeUrl = `/uploads/ar-models/${filename}`;
    const fullUrl = `${protocol}://${host}${relativeUrl}`;

    res.json({
      success: true,
      filename,
      relativeUrl,
      fullUrl,
    });
  } catch (err) {
    console.error('AR model export error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

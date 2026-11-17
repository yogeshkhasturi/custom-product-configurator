const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const AR_DIR = path.join(__dirname, '..', 'uploads', 'ar-models');

if (!fs.existsSync(AR_DIR)) {
  fs.mkdirSync(AR_DIR, { recursive: true });
}

// Multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }
});

// Lazy-load PhotoTo3DService from @universal/image-to-3d-ar
let PhotoTo3DService = null;
async function getPhotoTo3DService() {
  if (!PhotoTo3DService) {
    try {
      const module = await import('@universal/image-to-3d-ar/ai');
      PhotoTo3DService = module.PhotoTo3DService;
    } catch (err) {
      console.warn('[Generate3D] Could not load @universal/image-to-3d-ar/ai:', err.message);
    }
  }
  return PhotoTo3DService ? new PhotoTo3DService() : null;
}

// Helper to build absolute public URL
function getPublicUrl(req, filename) {
  const host = req.get('x-forwarded-host') || req.get('host') || '127.0.0.1:5000';
  const protocol =
    req.get('x-forwarded-proto') ||
    (req.protocol === 'https' || host.includes('ngrok') ? 'https' : 'http');
  const relativeUrl = `/uploads/ar-models/${filename}`;
  return `${protocol}://${host}${relativeUrl}`;
}

/**
 * GET /api/generate-3d/status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    provider: process.env.AI_3D_PROVIDER || 'tripo3d',
    hasTripoKey: Boolean(process.env.TRIPO_API_KEY),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasMeshyKey: Boolean(process.env.MESHY_API_KEY)
  });
});

/**
 * POST /api/generate-3d
 * Primary 3D generation endpoint from photo
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    let imageSource = null;
    let format = 'jpg';

    if (req.file) {
      imageSource = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      format = req.file.mimetype.includes('png') ? 'png' : 'jpg';
    } else if (req.body?.image) {
      imageSource = req.body.image;
      format = req.body.format || 'jpg';
    } else if (req.body?.imageUrl) {
      imageSource = req.body.imageUrl;
    }

    if (!imageSource) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an image file or imageUrl/image base64.'
      });
    }

    const service = await getPhotoTo3DService();
    if (!service) {
      return res.status(500).json({
        success: false,
        error: 'PhotoTo3DService could not be loaded.'
      });
    }

    const result = await service.generate(imageSource, format, (statusMsg) => {
      console.log(`[PhotoTo3D Progress]: ${statusMsg}`);
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[PhotoTo3D Route Error]:', error);
    res.status(500).json({
      success: false,
      error: error.message || '3D Model generation failed'
    });
  }
});

/**
 * POST /api/generate-3d/save-model
 * Allows client-side 3D generators (Procedural, Prompt, or Three.js ModelExporter)
 * to save binary GLB directly into the server AR library and return a permanent URL.
 */
router.post('/save-model', upload.single('model'), (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'No 3D model buffer provided.' });
    }

    const format = req.body.format === 'usdz' ? 'usdz' : 'glb';
    const filename = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${format}`;
    const dest = path.join(AR_DIR, filename);

    fs.writeFileSync(dest, req.file.buffer);

    const fullUrl = getPublicUrl(req, filename);
    const relativeUrl = `/uploads/ar-models/${filename}`;

    res.json({
      success: true,
      filename,
      relativeUrl,
      fullUrl
    });
  } catch (err) {
    console.error('[Save Model Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/generate-prompt-3d or /prompt
 * Proxies Gemini Flash 3D CAD modeling prompt to generate structured Three.js spec.
 */
async function handleGeneratePrompt3D(req, res) {
  try {
    const prompt = (req.body?.prompt || '').trim();
    const dimensions = req.body?.dimensions || { width: 1.0, height: 0.75, depth: 0.6 };
    const apiKey = req.body?.apiKey || process.env.GEMINI_API_KEY;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required.' });
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'GEMINI_API_KEY is not configured on server.'
      });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;

    let imageBase64 = null;
    let mimeType = 'image/jpeg';
    if (req.body?.image) {
      const img = req.body.image;
      if (img.startsWith('data:')) {
        const mimeMatch = img.match(/^data:(image\/\w+);base64,/);
        if (mimeMatch) mimeType = mimeMatch[1];
        imageBase64 = img.replace(/^data:image\/\w+;base64,/, '');
      } else if (img.startsWith('http')) {
        try {
          const imgRes = await fetch(img);
          const buf = Buffer.from(await imgRes.arrayBuffer());
          imageBase64 = buf.toString('base64');
          mimeType = img.endsWith('.png') ? 'image/png' : 'image/jpeg';
        } catch (e) {
          console.warn('[handleGeneratePrompt3D] Could not fetch image URL:', e.message);
        }
      } else if (img.startsWith('/uploads')) {
        try {
          const localPath = path.join(__dirname, '..', img);
          if (fs.existsSync(localPath)) {
            const buf = fs.readFileSync(localPath);
            imageBase64 = buf.toString('base64');
            mimeType = img.endsWith('.png') ? 'image/png' : 'image/jpeg';
          }
        } catch (e) {
          console.warn('[handleGeneratePrompt3D] Could not read local image file:', e.message);
        }
      }
    }

    const hasImage = Boolean(imageBase64);

    const systemPrompt = `You are an expert 3D CAD engineer and computer vision specialist.
Your task is to analyze this reference photo and produce a 100% physically accurate 3D CAD model in Three.js JSON format that exactly mirrors the product in the image.

Target dimensions in meters: width ${dimensions.width}, height ${dimensions.height}, depth ${dimensions.depth}.

STRICT VISUAL FIDELITY RULES:
1. THE IMAGE IS 100% GROUND TRUTH:
   - Identify the EXACT product in the photo.
   - For lampshades: identify whether it is an empire (tapered cone with radiusTop significantly smaller than radiusBottom), drum (straight vertical cylinder with radiusTop equal to radiusBottom), coolie, or bell.
   - For tapered empire/coolie lampshades:
     * Top aperture opening is narrower: radiusTop = (width / 2) * 0.55 to 0.65 (e.g. ~0.11m for 0.35m width).
     * Bottom opening is wider: radiusBottom = (width / 2) (e.g. ~0.175m for 0.35m width).
     * Height: ${dimensions.height}m.
2. COLOR & MATERIAL EXTRACTION (MANDATORY):
   - Extract the EXACT hex colors directly from the image pixels:
     * Outer woven rattan / burlap / linen weave (e.g. #c89d66, #d2a679, #bfa17c for tan/woven rattan, #18191c for black, #ffffff for white). NEVER default to plain generic gray!
   - Outer shade body: shape "cylinder", size: [radiusTop, radiusBottom, height], pos: [0, 0, 0], openEnded: true, material: "rattan" (or "fabric" / "burlap"), color: "#extracted_hex".
   - Inner reflective liner: shape "cylinder", size: [radiusTop * 0.985, radiusBottom * 0.985, height * 0.99], pos: [0, 0, 0], openEnded: true, material: "liner", color: "#fcfbf7".
   - Top rolled edge rim: shape "torus", size: [radiusTop, 0.006], pos: [0, height / 2, 0], rot: [1.5708, 0, 0], material: "rattan", color: "#extracted_hex".
   - Bottom rolled edge rim: shape "torus", size: [radiusBottom, 0.007], pos: [0, -height / 2, 0], rot: [1.5708, 0, 0], material: "rattan", color: "#extracted_hex".
3. FITTERS & INTERNAL HARDWARE (OBSERVE ACTUAL PHOTO):
   - If the image shows a SPIDER / WASHER FITTER (3 radial metal arms meeting at a central washer ring):
     * Center brass washer: shape "cylinder", size: [0.016, 0.016, 0.005], pos: [0, height/2 - 0.04, 0], material: "gold", color: "#d4af37".
     * Center hole: shape "cylinder", size: [0.007, 0.007, 0.006], pos: [0, height/2 - 0.04, 0], material: "metal", color: "#1a1a1a".
     * 3 radial brass spokes radiating outwards at 120-degree intervals (0°, 120°, 240°):
       Spoke 1 (0°): shape "cylinder", size: [0.0025, 0.0025, radiusTop * 0.85], pos: [radiusTop * 0.45, height/2 - 0.04, 0], rot: [0, 0, -1.5708], material: "gold", color: "#d4af37".
       Spoke 2 (120°): shape "cylinder", size: [0.0025, 0.0025, radiusTop * 0.85], pos: [-radiusTop * 0.225, height/2 - 0.04, radiusTop * 0.39], rot: [0, -2.0944, -1.5708], material: "gold", color: "#d4af37".
       Spoke 3 (240°): shape "cylinder", size: [0.0025, 0.0025, radiusTop * 0.85], pos: [-radiusTop * 0.225, height/2 - 0.04, -radiusTop * 0.39], rot: [0, -4.1888, -1.5708], material: "gold", color: "#d4af37".
   - If the image shows a BULB CLIP-ON FITTER (wire loops to clip onto a bulb):
      * Model the symmetrical golden brass support struts, central wire saddle ring, dual vertical spring wire clip loops, and centered incandescent light bulb:
        - Left strut: shape "cylinder", size: [0.0022, 0.0022, radiusTop * 0.9], pos: [-radiusTop * 0.45, height/2 - 0.03, 0], rot: [0, 0, 1.25], material: "gold", color: "#d4af37".
        - Right strut: shape "cylinder", size: [0.0022, 0.0022, radiusTop * 0.9], pos: [radiusTop * 0.45, height/2 - 0.03, 0], rot: [0, 0, -1.25], material: "gold", color: "#d4af37".
        - Saddle ring: shape "torus", size: [0.026, 0.0022], pos: [0, height/2 - 0.045, 0], rot: [1.5708, 0, 0], material: "gold", color: "#d4af37".
        - Front clip loop: shape "torus", size: [0.032, 0.002], pos: [0, height/2 - 0.08, 0.035], rot: [0, 1.5708, 0], material: "gold", color: "#d4af37".
        - Back clip loop: shape "torus", size: [0.032, 0.002], pos: [0, height/2 - 0.08, -0.035], rot: [0, 1.5708, 0], material: "gold", color: "#d4af37".
        - Centered light bulb glass: shape "sphere", size: [0.035, 0.045, 0.035], pos: [0, height/2 - 0.085, 0], material: "glass", color: "#fffdfa".
        - Bulb screw base: shape "cylinder", size: [0.014, 0.013, 0.022], pos: [0, height/2 - 0.13, 0], material: "gold", color: "#d4af37".

JSON Schema:
{
  "name": "Exact Product Name",
  "parts": [
    {
      "name": "part_name",
      "shape": "sphere" | "cylinder" | "box" | "torus" | "cone",
      "size": [x, y, z] for sphere/box, or [radiusTop, radiusBottom, height] for cylinder, or [radius, tube] for torus,
      "pos": [x, y, z],
      "rot": [rx, ry, rz in radians],
      "openEnded": true | false,
      "material": "fabric" | "metal" | "wood" | "plastic" | "gold" | "liner" | "glass" | "rattan" | "burlap",
      "color": "#hex"
    }
  ]
}
Respond ONLY with valid JSON. No markdown backticks, no prose.`;

    const userParts = [];
    if (imageBase64) {
      userParts.push({ inlineData: { mimeType, data: imageBase64 } });
    }
    userParts.push({ text: `${systemPrompt}\n\nUser request: "${prompt || 'Recreate this product as a physically accurate 3D CAD model matching its exact shape, components, and colors.'}"` });

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: userParts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      return res.status(geminiRes.status).json({
        success: false,
        error: errData.error?.message || `Gemini API returned HTTP ${geminiRes.status}`
      });
    }

    const data = await geminiRes.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    let spec = {};
    try {
      spec = JSON.parse(clean);
    } catch (e) {
      const lastBrace = clean.lastIndexOf('}');
      if (lastBrace > 0) {
        spec = JSON.parse(clean.slice(0, lastBrace + 1) + ']}');
      }
    }

    res.json({
      success: true,
      spec,
      finishReason: data.candidates?.[0]?.finishReason || 'STOP'
    });
  } catch (err) {
    console.error('[GeneratePrompt3D Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

router.post('/prompt', handleGeneratePrompt3D);

module.exports = router;
module.exports.handleGeneratePrompt3D = handleGeneratePrompt3D;

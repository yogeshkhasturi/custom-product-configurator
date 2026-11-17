import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { PhotoTo3DService } from './photoTo3dService.js';

// Load environment variables from .env or fallback to .env.example
import fs from 'fs';
if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
} else if (fs.existsSync('.env.example')) {
  dotenv.config({ path: '.env.example' });
} else {
  dotenv.config();
}

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for all domains so Shopify, WordPress, and external React apps can call this API
app.use(cors());

// Body parser with 50MB payload limit for high-res photo uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer memory storage for direct multipart/form-data file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB max file size
});

// Helper to reload environment variables on the fly
function reloadEnv() {
  if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env', override: true });
  } else if (fs.existsSync('.env.example')) {
    dotenv.config({ path: '.env.example', override: true });
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  reloadEnv();
  res.json({
    status: 'ok',
    provider: process.env.AI_3D_PROVIDER || 'tripo3d',
    hasKey: Boolean(process.env.TRIPO_API_KEY || process.env.MESHY_API_KEY || process.env.HUGGINGFACE_TOKEN)
  });
});

/**
 * Primary 3D Generation Endpoint: POST /api/generate-3d
 * Accepts:
 *  - Multipart Form with 'image' file
 *  - JSON body with 'image' (base64) or 'imageUrl'
 */
app.post('/api/generate-3d', upload.single('image'), async (req, res) => {
  try {
    reloadEnv();
    const service = new PhotoTo3DService();

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
        error: 'Please provide an image via file upload or JSON payload (image / imageUrl).'
      });
    }

    console.log(`[PhotoTo3D] Received generation request via provider: ${process.env.AI_3D_PROVIDER || 'tripo3d'}`);

    const result = await service.generate(imageSource, format, (statusMsg) => {
      console.log(`[PhotoTo3D Progress]: ${statusMsg}`);
    });

    console.log(`[PhotoTo3D Success] Generated model: ${result.glbUrl}`);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[PhotoTo3D Error]:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate 3D model'
    });
  }
});

/**
 * Image to 3D CAD Prompt Endpoint: POST /api/image-to-prompt
 * Takes an image and uses Gemini Multimodal Vision to generate:
 * 1. An optimal 3D CAD modeling prompt description (materials, shapes, components, colors)
 * 2. Estimated real-world physical metric dimensions { width, height, depth }
 * 3. Object category
 */
app.post('/api/image-to-prompt', upload.single('image'), async (req, res) => {
  const t0 = performance.now();
  reloadEnv();

  let imgStr = null;
  if (req.file) {
    imgStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  } else if (req.body?.image) {
    imgStr = req.body.image;
  }

  const apiKey = req.body?.apiKey || process.env.GEMINI_API_KEY;

  if (!imgStr) {
    return res.status(400).json({ success: false, error: 'Image is required.' });
  }

  if (!apiKey) {
    return res.status(400).json({ success: false, error: 'GEMINI_API_KEY is not configured on server or request.' });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;

  const mimeMatch = imgStr.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = imgStr.replace(/^data:image\/\w+;base64,/, '');

  const systemPrompt = `You are an expert 3D CAD designer and computer vision analyst.
Look at the primary physical product or object in this image.
Extract a clean JSON description tailored for 3D procedural modeling in Three.js.

Return ONLY this JSON schema:
{
  "prompt": "Detailed description of the physical object, its 3D shape (e.g. conical lampshade, spherical body, rectangular table), components, materials (fabric, wood, metal, plastic), and colors",
  "dimensions": {
    "width": 0.35,
    "height": 0.30,
    "depth": 0.35
  },
  "category": "lampshade"
}
Rules:
1. "prompt" must describe the physical object in concise, vivid detail including its exact attachment or hardware if visible (e.g. for lampshades, explicitly state whether it has a bulb clip-on fitter with wire spring loops or a 3-arm spider fitter, its white interior liner, and its woven rattan outer weave).
2. "dimensions" must be realistic metric sizes in meters (e.g. table ~1.4x0.75x0.8, chair ~0.55x0.85x0.55, lampshade ~0.35x0.30x0.35, duck ~0.30x0.30x0.35, mug ~0.10x0.12x0.09).
3. Respond ONLY with valid JSON. No markdown backticks, no prose.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: systemPrompt }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const latencyMs = Math.round(performance.now() - t0);

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      const msg = errData.error?.message || `HTTP ${geminiRes.status}`;
      return res.status(geminiRes.status).json({ success: false, error: msg });
    }

    const data = await geminiRes.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const result = JSON.parse(clean);

    res.json({
      success: true,
      prompt: result.prompt || 'Custom 3D Object',
      dimensions: result.dimensions || { width: 0.35, height: 0.35, depth: 0.35 },
      category: result.category || 'general',
      timing: { latencyMs }
    });
  } catch (err) {
    console.error('[ImageToPrompt Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Prompt & Dimensions 3D Model Spec Endpoint: POST /api/generate-prompt-3d
 * Keeps Gemini API keys securely on backend, applies thinkingBudget=0, and returns structured 3D spec.
 */
app.post('/api/generate-prompt-3d', async (req, res) => {
  const t0 = performance.now();
  reloadEnv();

  const prompt = (req.body?.prompt || '').trim();
  const dimensions = req.body?.dimensions || { width: 1.0, height: 0.75, depth: 0.6 };
  const apiKey = req.body?.apiKey || process.env.GEMINI_API_KEY;

  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Prompt is required.' });
  }

  if (!apiKey) {
    return res.status(400).json({
      success: false,
      error: 'GEMINI_API_KEY is not configured on server or provided in request.'
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;

  const hasImage = Boolean(req.body?.image);

  let systemPrompt;
  if (hasImage) {
    systemPrompt = `You are an expert 3D CAD engineer and computer vision specialist.
Your task is to analyze this reference photo and produce a 100% physically accurate 3D CAD model in Three.js JSON format that exactly mirrors the product in the image.

Target dimensions in meters: width ${dimensions.width}, height ${dimensions.height}, depth ${dimensions.depth}.

STRICT VISUAL FIDELITY RULES:
1. THE IMAGE IS 100% GROUND TRUTH:
   - Identify the EXACT product in the photo.
   - Do NOT invent or hallucinate parts that are not present.
   - Do NOT omit visible key elements (e.g. clothing, bows, accessories, eyes, whiskers, hardware, fitters, handles, legs, cushions).
2. COLOR EXTRACTION (MANDATORY):
   - Extract the EXACT hex colors directly from the image pixels for every part (e.g. #2563eb for royal blue clothing, #f87171 for coral bows, #d4af37 for brass hardware, #18191c for black woven fabric, #f8fafc for white fabric/fur, #d1a877 for natural rattan). Never default to generic brown or gray!
3. PHYSICAL HIERARCHY & CONNECTIVITY:
   - Every secondary part (hardware, handles, legs, attachments, facial features, accessories) MUST physically attach to its parent structure without floating in mid-air or clipping awkwardly.
   - Facial features (eyes, nose, whiskers) on character toys MUST be placed on the FRONT outer surface of the head (z >= head_z + head_rz).
   - Hollow objects (lampshades, bowls) MUST have openEnded: true.
   - Horizontal rings, washers, or fitters in XZ plane MUST be rotated with rot: [1.5708, 0, 0] or [1.35, 0, 0].
   - Radial horizontal cylinder spokes at angle theta in XZ plane MUST use rot: [0, -theta, -1.5708].

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
      "material": "fabric" | "metal" | "wood" | "plastic" | "gold" | "liner" | "glass" | "rattan",
      "color": "#hex"
    }
  ]
}

CRITICAL RULES FOR PLUSH TOYS / CHARACTERS / DOLLS (e.g. Hello Kitty, Plush Animals, Dolls):
1. HEAD & EARS:
   - Head: wide sphere/ellipsoid, size [rx, ry, rz], pos [0, y, 0].
   - Distinctive ears (e.g. Hello Kitty: two pointed cones/spheres on top left and right: size [0.035, 0.045, 0.035], pos [-0.075, head_y + head_ry, 0] and [0.075, head_y + head_ry, 0]). NEVER bury ears inside the head!
2. SIGNATURE HEAD ACCESSORIES (e.g. Bows, Hats, Ribbons):
   - Model the signature accessory (e.g. Hello Kitty's coral/red bow on her right ear: knot sphere + two flaring loop spheres at the base of the ear on the exterior).
3. FACIAL FEATURES - MANDATORY OUTER SURFACE PLACEMENT:
   - All facial elements (eyes, pupils, nose, whiskers) MUST be placed on the FRONT OUTER SURFACE of the head (z >= head_z + head_rz):
     - Eyes: two dark ovals spaced symmetrically left & right.
     - Nose: centered between and slightly below the eyes (yellow for Hello Kitty).
     - Whiskers: thin horizontal bars/cylinders (3 on left cheek, 3 on right cheek).
4. CLOTHING & ATTIRE:
   - Match the exact outfit from the reference image (e.g. Hello Kitty's royal blue overalls #2563eb).
5. ACCESSORIES & PAWS:
   - If holding an object (e.g. pink boba cup with whipped cream lid, flower, heart), model both the accessory and the two hands/paws holding it in front of the body.
CRITICAL RULES FOR TABLES, DESKS & PEDESTAL FURNITURE (e.g. Round Dining Tables, Ornate Tables):
1. TABLETOP & APRON:
   - For round tables: cylinder tabletop radiusTop = width/2, radiusBottom = width/2, height = 0.035.
   - Edge molding: outer torus around the edge (radius = width/2, tube = 0.012, rot: [1.5708, 0, 0]).
   - Under-table apron: stepped cylinder collar below top (radius = (width/2) * 0.92, height = 0.05).
2. CENTRAL TURNED PEDESTAL BALUSTER COLUMN (For pedestal tables):
   - Capital collar at the top: shape "cylinder", size: [0.08, 0.09, 0.04], pos: [0, top_y - 0.08, 0].
   - Upper scotia neck: shape "cylinder", size: [0.055, 0.065, 0.10], pos: [0, top_y - 0.16, 0].
   - Center carved urn / bulb: shape "sphere", size: [0.095, 0.105, 0.095], pos: [0, top_y - 0.28, 0].
   - Lower waist: shape "cylinder", size: [0.07, 0.085, 0.09], pos: [0, top_y - 0.38, 0].
   - Base plinth hub: shape "cylinder", size: [0.13, 0.14, 0.07], pos: [0, 0.28, 0].
3. ARCHED CABRIOLE SCROLLED LEGS:
   - CRITICAL: NEVER use a single straight 45-degree box that sticks out like a rocket fin!
   - Model each of the 4 legs (spaced at 90-degree intervals: 0, 90, 180, 270 deg) with:
     - Upper Arched Knee: cylinder angled downward and outward (size: [0.035, 0.030, 0.20]).
     - Lower Scrolled Drop: cylinder dropping toward the floor (size: [0.030, 0.025, 0.14]).
     - Scrolled Pad Foot: resting flat on floor at y = 0.015 (size: [0.035, 0.022, 0.035]).
     - Gold filigree / scroll accents on the knees and rim if observed in photo.

Reference decomposition for an Ornate Pedestal Dining Table:
{
  "name": "Ornate Round Pedestal Dining Table",
  "parts": [
    { "name": "tabletop_surface", "shape": "cylinder", "size": [0.58, 0.58, 0.035], "pos": [0, 0.76, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "tabletop_edge_bead", "shape": "torus", "size": [0.58, 0.014], "pos": [0, 0.76, 0], "rot": [1.5708, 0, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "tabletop_gold_trim", "shape": "torus", "size": [0.582, 0.005], "pos": [0, 0.755, 0], "rot": [1.5708, 0, 0], "material": "gold", "color": "#d4af37" },
    { "name": "carved_apron_ring", "shape": "cylinder", "size": [0.54, 0.52, 0.055], "pos": [0, 0.718, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "apron_gold_bead", "shape": "torus", "size": [0.53, 0.006], "pos": [0, 0.69, 0], "rot": [1.5708, 0, 0], "material": "gold", "color": "#d4af37" },
    { "name": "pedestal_capital", "shape": "cylinder", "size": [0.08, 0.09, 0.04], "pos": [0, 0.67, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "pedestal_upper_neck", "shape": "cylinder", "size": [0.055, 0.065, 0.10], "pos": [0, 0.60, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "pedestal_upper_gold_ring", "shape": "torus", "size": [0.068, 0.008], "pos": [0, 0.55, 0], "rot": [1.5708, 0, 0], "material": "gold", "color": "#d4af37" },
    { "name": "pedestal_carved_urn_bulb", "shape": "sphere", "size": [0.095, 0.105, 0.095], "pos": [0, 0.46, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "pedestal_urn_gold_collar", "shape": "torus", "size": [0.096, 0.007], "pos": [0, 0.46, 0], "rot": [1.5708, 0, 0], "material": "gold", "color": "#d4af37" },
    { "name": "pedestal_lower_waist", "shape": "cylinder", "size": [0.07, 0.085, 0.09], "pos": [0, 0.36, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "pedestal_base_plinth", "shape": "cylinder", "size": [0.13, 0.14, 0.07], "pos": [0, 0.28, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "plinth_gold_trim", "shape": "torus", "size": [0.135, 0.007], "pos": [0, 0.26, 0], "rot": [1.5708, 0, 0], "material": "gold", "color": "#d4af37" },
    { "name": "leg_1_arch_knee", "shape": "cylinder", "size": [0.035, 0.030, 0.20], "pos": [0.18, 0.20, 0], "rot": [0, 0, -0.65], "material": "wood", "color": "#f8f9fa" },
    { "name": "leg_1_scrolled_drop", "shape": "cylinder", "size": [0.030, 0.025, 0.14], "pos": [0.28, 0.08, 0], "rot": [0, 0, 0.30], "material": "wood", "color": "#f8f9fa" },
    { "name": "leg_1_scrolled_pad_foot", "shape": "sphere", "size": [0.040, 0.022, 0.032], "pos": [0.33, 0.015, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "leg_1_gold_scroll_accent", "shape": "torus", "size": [0.024, 0.005], "pos": [0.22, 0.23, 0], "rot": [0, 1.5708, 0], "material": "gold", "color": "#d4af37" },
    { "name": "leg_2_arch_knee", "shape": "cylinder", "size": [0.035, 0.030, 0.20], "pos": [-0.18, 0.20, 0], "rot": [0, 0, 0.65], "material": "wood", "color": "#f8f9fa" },
    { "name": "leg_2_scrolled_drop", "shape": "cylinder", "size": [0.030, 0.025, 0.14], "pos": [-0.28, 0.08, 0], "rot": [0, 0, -0.30], "material": "wood", "color": "#f8f9fa" },
    { "name": "leg_2_scrolled_pad_foot", "shape": "sphere", "size": [0.040, 0.022, 0.032], "pos": [-0.33, 0.015, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "leg_2_gold_scroll_accent", "shape": "torus", "size": [0.024, 0.005], "pos": [-0.22, 0.23, 0], "rot": [0, 1.5708, 0], "material": "gold", "color": "#d4af37" },
    { "name": "leg_3_arch_knee", "shape": "cylinder", "size": [0.035, 0.030, 0.20], "pos": [0, 0.20, 0.18], "rot": [0.65, 0, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "leg_3_scrolled_drop", "shape": "cylinder", "size": [0.030, 0.025, 0.14], "pos": [0, 0.08, 0.28], "rot": [-0.30, 0, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "leg_3_scrolled_pad_foot", "shape": "sphere", "size": [0.032, 0.022, 0.040], "pos": [0, 0.015, 0.33], "material": "wood", "color": "#f8f9fa" },
    { "name": "leg_3_gold_scroll_accent", "shape": "torus", "size": [0.024, 0.005], "pos": [0, 0.23, 0.22], "rot": [1.5708, 0, 0], "material": "gold", "color": "#d4af37" },
    { "name": "leg_4_arch_knee", "shape": "cylinder", "size": [0.035, 0.030, 0.20], "pos": [0, 0.20, -0.18], "rot": [-0.65, 0, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "leg_4_scrolled_drop", "shape": "cylinder", "size": [0.030, 0.025, 0.14], "pos": [0, 0.08, -0.28], "rot": [0.30, 0, 0], "material": "wood", "color": "#f8f9fa" },
    { "name": "leg_4_scrolled_pad_foot", "shape": "sphere", "size": [0.032, 0.022, 0.040], "pos": [0, 0.015, -0.33], "material": "wood", "color": "#f8f9fa" },
    { "name": "leg_4_gold_scroll_accent", "shape": "torus", "size": [0.024, 0.005], "pos": [0, 0.23, -0.22], "rot": [1.5708, 0, 0], "material": "gold", "color": "#d4af37" }
  ]
}

Respond ONLY with valid JSON. No markdown backticks, no prose.`;
  } else {
    systemPrompt = `You are an expert 3D CAD designer creating structured 3D models for Three.js.
Return a clean JSON object describing the components of the object.
Target dimensions in meters: width ${dimensions.width}, height ${dimensions.height}, depth ${dimensions.depth}.

JSON Schema:
{
  "name": "Object Name",
  "parts": [
    {
      "shape": "sphere" | "box" | "cylinder" | "cone" | "beak" | "torus" | "shade",
      "size": [radiusX, radiusY, radiusZ] for sphere/beak, or [radiusTop, radiusBottom, height] for cylinder/shade, or [w, h, d] for box, or [radius, tube] for torus,
      "pos": [x, y, z],
      "rot": [rotX, rotY, rotZ in radians],
      "openEnded": true | false (MANDATORY true for lampshades, hollow cones, cups, vases, rings),
      "material": "wood" | "metal" | "fabric" | "burlap" | "rattan" | "marble" | "glass" | "gold" | "plastic" | "leather",
      "color": "#hex"
    }
  ]
}

CRITICAL PHYSICAL CAD RULES (NO PREDEFINED COMPOSITES):
1. PHYSICAL ANCHORAGE - NO FLOATING PARTS:
   Every bracket, hinge, clip, leg, or hardware MUST physically touch and anchor into the structure it mounts on.
   - For lampshades: The mounting clamp/bracket MUST be anchored at the inner top rim (e.g. at pos [0, height/2 - 0.02, radiusTop - 0.015]), NOT floating detached in empty air! The wire loops extend from that bracket into the center of the aperture to grip the light bulb.
2. HOLLOW OBJECTS & INTERIOR LININGS:
   For objects with an open interior (lampshades, bowls, containers):
   - Outer shell: "cylinder" (or "cone"), "openEnded": true, with observed outer material and color.
   - Inner lining: "cylinder" (or "cone"), "openEnded": true, with radius 1-2% smaller, using "material": "liner", "color": "#fcfbf7".
3. HARDWARE & FITTERS (OBSERVE ACTUAL PHOTO):
   Look at the hardware in the image and model each piece using standard primitives:
   A) BULB CLIP-ON FITTER (For clip-on shades, e.g. natural bulb, black bulb):
      - The outer fabric rim is clean, smooth, and rolled; NEVER clamp a heavy block over the fabric rim!
      - Anchor the hardware to the INTERIOR top framework at the back seam (x = 0, y = height/2 - 0.02, z = -radiusTop + 0.028):
        - Top Finial Nut / Cap: "shape": "cylinder", "size": [0.007, 0.007, 0.014], "pos": [0, height/2 - 0.015, -radiusTop + 0.028], "material": "metal", "color": "#e2e6ea".
        - Flat Washer Collar: "shape": "cylinder", "size": [0.010, 0.010, 0.002], "pos": [0, height/2 - 0.023, -radiusTop + 0.028], "material": "metal", "color": "#d0d4dc".
        - U-Bracket Hinge Body: "shape": "box", "size": [0.015, 0.014, 0.010], "pos": [0, height/2 - 0.032, -radiusTop + 0.028], "material": "metal", "color": "#d0d4dc".
        - Horizontal Pivot Hinge Pin: "shape": "cylinder", "size": [0.0016, 0.0016, 0.018], "pos": [0, height/2 - 0.038, -radiusTop + 0.028], "rot": [0, 0, 1.5708], "material": "metal", "color": "#a0a6b2".
        - Dual Wire Neck Struts: sweeping forward-downward from hinge into center:
          Left Strut: "shape": "cylinder", "size": [0.0018, 0.0018, 0.035], "pos": [-0.007, height/2 - 0.052, -radiusTop + 0.045], "rot": [0.72, 0, 0], "material": "metal", "color": "#e2e6ea".
          Right Strut: "shape": "cylinder", "size": [0.0018, 0.0018, 0.035], "pos": [0.007, height/2 - 0.052, -radiusTop + 0.045], "rot": [0.72, 0, 0], "material": "metal", "color": "#e2e6ea".
        - Dual Bulb-Clamping Spring Wire Loops:
          MUST be toruses lying horizontally/tilted forward in the XZ plane ("rot": [1.35, 0, 0] or [1.5708, 0, 0]) forming the open circular cradle through which the light bulb fits!
          CRITICAL: NEVER use rot [0, 1.5708, 0] (which makes vertical bicycle wheels standing on edge)!
          Front Loop: "shape": "torus", "size": [0.032, 0.002], "pos": [0, height/2 - 0.078, -radiusTop + 0.072], "rot": [1.35, 0, 0], "material": "metal", "color": "#e2e6ea".
          Back Loop: "shape": "torus", "size": [0.032, 0.002], "pos": [0, height/2 - 0.068, -radiusTop + 0.056], "rot": [1.35, 0, 0], "material": "metal", "color": "#e2e6ea".
   B) SPIDER / WASHER FITTER (Used when image shows 3 radial metal spokes meeting at a central washer, e.g. classic lampshades like images.jpg):
      - Recess depth: Drop ~2.5cm to 4cm below top rim: recessY = height/2 - 0.04.
      - Center Brass Washer/Hub: "shape": "cylinder", "size": [0.016, 0.016, 0.005], "pos": [0, recessY, 0], "material": "gold", "color": "#d4af37".
      - Center Washer Socket Hole: "shape": "cylinder", "size": [0.007, 0.007, 0.006], "pos": [0, recessY, 0], "material": "metal", "color": "#1a1a1a".
      - Exactly 3 symmetrical radial brass spokes radiating outwards at 120-degree intervals (0°, 120°, 240°):
        CRITICAL THREE.JS EULER ROTATION FOR CYLINDER SPOKES: To point a horizontal cylinder at angle theta in the XZ plane, MUST use "rot": [0, -theta, -1.5708]!
        midDist = hubRadius + (radiusTop - hubRadius) / 2 = ~0.068.
        Spoke 1 (0°): "shape": "cylinder", "size": [0.0025, 0.0025, 0.105], "pos": [0.068, recessY, 0], "rot": [0, 0, -1.5708], "material": "gold", "color": "#d4af37".
        Spoke 2 (120°): "shape": "cylinder", "size": [0.0025, 0.0025, 0.105], "pos": [-0.034, recessY, 0.059], "rot": [0, -2.0944, -1.5708], "material": "gold", "color": "#d4af37".
        Spoke 3 (240°): "shape": "cylinder", "size": [0.0025, 0.0025, 0.105], "pos": [-0.034, recessY, -0.059], "rot": [0, -4.1888, -1.5708], "material": "gold", "color": "#d4af37".
      - 3 Vertical Riser Tabs connecting each spoke up to the top rim (height = 0.04m):
        Tab 1: "shape": "cylinder", "size": [0.0025, 0.0025, 0.04], "pos": [0.117, recessY + 0.02, 0], "material": "gold", "color": "#d4af37".
        Tab 2: "shape": "cylinder", "size": [0.0025, 0.0025, 0.04], "pos": [-0.058, recessY + 0.02, 0.101], "material": "gold", "color": "#d4af37".
        Tab 3: "shape": "cylinder", "size": [0.0025, 0.0025, 0.04], "pos": [-0.059, recessY + 0.02, -0.101], "material": "gold", "color": "#d4af37".
4. RIMS & PIPING:
   Add rolled rim toruses at the top and bottom openings, matching the outer shade color.
5. COLOR ACCURACY (CRITICAL):
   Match the EXACT color seen in the photo!
   If the lampshade or product is BLACK in the image (like black woven fabric / wicker), use "color": "#18191c" for the outer cone and the rims! NEVER make a black object brown, tan, or beige!

Reference decomposition for a Bulb Clip-On Lampshade:
{
  "name": "Conical Clip-On Lampshade",
  "parts": [
    { "name": "outer_woven_shade", "shape": "cylinder", "size": [0.12, 0.23, 0.24], "pos": [0, 0, 0], "openEnded": true, "material": "rattan", "color": "#18191c" },
    { "name": "inner_white_liner", "shape": "cylinder", "size": [0.118, 0.228, 0.238], "pos": [0, 0, 0], "openEnded": true, "material": "liner", "color": "#fcfbf7" },
    { "name": "top_rim", "shape": "torus", "size": [0.12, 0.006], "pos": [0, 0.12, 0], "rot": [1.5708, 0, 0], "material": "rattan", "color": "#18191c" },
    { "name": "bottom_rim", "shape": "torus", "size": [0.23, 0.007], "pos": [0, -0.12, 0], "rot": [1.5708, 0, 0], "material": "rattan", "color": "#18191c" },
    { "name": "top_finial_cap", "shape": "cylinder", "size": [0.007, 0.007, 0.014], "pos": [0, 0.105, -0.092], "material": "metal", "color": "#e2e6ea" },
    { "name": "washer_collar", "shape": "cylinder", "size": [0.010, 0.010, 0.002], "pos": [0, 0.097, -0.092], "material": "metal", "color": "#d0d4dc" },
    { "name": "hinge_u_bracket", "shape": "box", "size": [0.015, 0.014, 0.010], "pos": [0, 0.088, -0.092], "material": "metal", "color": "#d0d4dc" },
    { "name": "hinge_pin", "shape": "cylinder", "size": [0.0016, 0.0016, 0.018], "pos": [0, 0.082, -0.092], "rot": [0, 0, 1.5708], "material": "metal", "color": "#a0a6b2" },
    { "name": "wire_strut_left", "shape": "cylinder", "size": [0.0018, 0.0018, 0.035], "pos": [-0.007, 0.068, -0.076], "rot": [0.72, 0, 0], "material": "metal", "color": "#e2e6ea" },
    { "name": "wire_strut_right", "shape": "cylinder", "size": [0.0018, 0.0018, 0.035], "pos": [0.007, 0.068, -0.076], "rot": [0.72, 0, 0], "material": "metal", "color": "#e2e6ea" },
    { "name": "bulb_clip_loop_back", "shape": "torus", "size": [0.032, 0.002], "pos": [0, 0.052, -0.062], "rot": [1.35, 0, 0], "material": "metal", "color": "#e2e6ea" },
    { "name": "bulb_clip_loop_front", "shape": "torus", "size": [0.032, 0.002], "pos": [0, 0.042, -0.046], "rot": [1.35, 0, 0], "material": "metal", "color": "#e2e6ea" }
  ]
}

Reference decomposition for a 3-Arm Spider Washer Fitter Lampshade:
{
  "name": "Conical Spider Fitter Lampshade",
  "parts": [
    { "name": "outer_shade", "shape": "cylinder", "size": [0.12, 0.23, 0.24], "pos": [0, 0, 0], "openEnded": true, "material": "fabric", "color": "#f8fafc" },
    { "name": "inner_liner", "shape": "cylinder", "size": [0.118, 0.228, 0.238], "pos": [0, 0, 0], "openEnded": true, "material": "liner", "color": "#fcfbf7" },
    { "name": "top_rim", "shape": "torus", "size": [0.12, 0.006], "pos": [0, 0.12, 0], "rot": [1.5708, 0, 0], "material": "fabric", "color": "#f8fafc" },
    { "name": "bottom_rim", "shape": "torus", "size": [0.23, 0.007], "pos": [0, -0.12, 0], "rot": [1.5708, 0, 0], "material": "fabric", "color": "#f8fafc" },
    { "name": "center_washer", "shape": "cylinder", "size": [0.016, 0.016, 0.005], "pos": [0, 0.08, 0], "material": "gold", "color": "#d4af37" },
    { "name": "washer_hole", "shape": "cylinder", "size": [0.007, 0.007, 0.006], "pos": [0, 0.08, 0], "material": "metal", "color": "#1a1a1a" },
    { "name": "spider_spoke_1", "shape": "cylinder", "size": [0.0025, 0.0025, 0.105], "pos": [0.068, 0.08, 0], "rot": [0, 0, -1.5708], "material": "gold", "color": "#d4af37" },
    { "name": "spider_spoke_2", "shape": "cylinder", "size": [0.0025, 0.0025, 0.105], "pos": [-0.034, 0.08, 0.059], "rot": [0, -2.0944, -1.5708], "material": "gold", "color": "#d4af37" },
    { "name": "spider_spoke_3", "shape": "cylinder", "size": [0.0025, 0.0025, 0.105], "pos": [-0.034, 0.08, -0.059], "rot": [0, -4.1888, -1.5708], "material": "gold", "color": "#d4af37" },
    { "name": "riser_tab_1", "shape": "cylinder", "size": [0.0025, 0.0025, 0.04], "pos": [0.117, 0.10, 0], "material": "gold", "color": "#d4af37" },
    { "name": "riser_tab_2", "shape": "cylinder", "size": [0.0025, 0.0025, 0.04], "pos": [-0.058, 0.10, 0.101], "material": "gold", "color": "#d4af37" },
    { "name": "riser_tab_3", "shape": "cylinder", "size": [0.0025, 0.0025, 0.04], "pos": [-0.059, 0.10, -0.101], "material": "gold", "color": "#d4af37" }
  ]
}

CRITICAL RULES FOR PLUSH TOYS / DOLLS / CHARACTERS (e.g. Hello Kitty, Teddy Bears, Plush Animals):
1. HEAD & EARS:
   - Head: wide sphere/ellipsoid, size [rx, ry, rz], pos [0, y, 0].
   - Distinctive ears (e.g. for cat/Hello Kitty: two pointed cones/spheres on top left and right: size [0.035, 0.045], pos [-0.075, head_y + 0.08, 0] and [0.075, head_y + 0.08, 0]).
2. SIGNATURE HEAD ACCESSORIES (e.g. Bows, Hats, Ribbons):
   - Model the signature accessory (e.g. Hello Kitty's coral/red bow on her right ear: knot sphere + two flaring loop spheres).
3. FACIAL FEATURES - MANDATORY OUTER SURFACE PLACEMENT:
   - All facial elements (eyes, pupils, noses, beaks, whiskers, cheeks) MUST be placed on the FRONT OUTER SURFACE of the head (z >= head_z + head_rz):
     - Eyes: two black ovals spaced symmetrically left & right (e.g. pos [-0.042, head_y + 0.005, head_z + head_rz - 0.002] and [0.042, ...]).
     - Nose: centered between and slightly below the eyes (yellow for Hello Kitty, pos [0, head_y - 0.01, head_z + head_rz]).
     - Whiskers: thin horizontal cylinders (3 on left cheek, 3 on right cheek).
   - CRITICAL: NEVER bury eyes, noses, or whiskers inside the head volume!
4. CLOTHING & ATTIRE (OBSERVE ACTUAL PHOTO):
   - Match the exact outfit from the reference image (e.g. Hello Kitty's royal blue dungarees/overalls color "#2563eb", dresses, shirts, etc.). Do NOT make the torso plain white if the toy is wearing clothes!
5. ACCESSORIES & PAWS:
   - If holding an object (e.g. pink boba cup with whipped cream lid, flower, heart), model both the accessory and the two hands/paws holding it.
6. FEET:
   - Two proportional oval feet grounded at the base.

Reference decomposition for a Plush Character Toy (e.g. Hello Kitty with Boba):
{
  "name": "Hello Kitty Plush Toy",
  "parts": [
    { "name": "head", "shape": "sphere", "size": [0.12, 0.095, 0.09], "pos": [0, 0.16, 0], "color": "#ffffff" },
    { "name": "left_ear", "shape": "sphere", "size": [0.035, 0.045, 0.035], "pos": [-0.075, 0.24, 0], "rot": [0, 0, -0.35], "color": "#ffffff" },
    { "name": "right_ear", "shape": "sphere", "size": [0.035, 0.045, 0.035], "pos": [0.075, 0.24, 0], "rot": [0, 0, 0.35], "color": "#ffffff" },
    { "name": "bow_knot", "shape": "sphere", "size": [0.014, 0.014, 0.012], "pos": [0.07, 0.22, 0.075], "color": "#f87171" },
    { "name": "bow_left_loop", "shape": "sphere", "size": [0.022, 0.016, 0.012], "pos": [0.05, 0.23, 0.072], "rot": [0, 0, 0.4], "color": "#f87171" },
    { "name": "bow_right_loop", "shape": "sphere", "size": [0.024, 0.018, 0.012], "pos": [0.095, 0.23, 0.072], "rot": [0, 0, -0.4], "color": "#f87171" },
    { "name": "left_eye", "shape": "sphere", "size": [0.007, 0.011, 0.004], "pos": [-0.042, 0.165, 0.088], "color": "#1e1e1e" },
    { "name": "right_eye", "shape": "sphere", "size": [0.007, 0.011, 0.004], "pos": [0.042, 0.165, 0.088], "color": "#1e1e1e" },
    { "name": "yellow_nose", "shape": "sphere", "size": [0.008, 0.006, 0.004], "pos": [0, 0.150, 0.091], "color": "#facc15" },
    { "name": "whisker_l1", "shape": "cylinder", "size": [0.0012, 0.0012, 0.022], "pos": [-0.082, 0.170, 0.080], "rot": [0, 0.2, 1.5708], "color": "#1e1e1e" },
    { "name": "whisker_l2", "shape": "cylinder", "size": [0.0012, 0.0012, 0.022], "pos": [-0.085, 0.155, 0.080], "rot": [0, 0.2, 1.5708], "color": "#1e1e1e" },
    { "name": "whisker_l3", "shape": "cylinder", "size": [0.0012, 0.0012, 0.022], "pos": [-0.080, 0.140, 0.080], "rot": [0, 0.2, 1.5708], "color": "#1e1e1e" },
    { "name": "whisker_r1", "shape": "cylinder", "size": [0.0012, 0.0012, 0.022], "pos": [0.082, 0.170, 0.080], "rot": [0, -0.2, 1.5708], "color": "#1e1e1e" },
    { "name": "whisker_r2", "shape": "cylinder", "size": [0.0012, 0.0012, 0.022], "pos": [0.085, 0.155, 0.080], "rot": [0, -0.2, 1.5708], "color": "#1e1e1e" },
    { "name": "whisker_r3", "shape": "cylinder", "size": [0.0012, 0.0012, 0.022], "pos": [0.080, 0.140, 0.080], "rot": [0, -0.2, 1.5708], "color": "#1e1e1e" },
    { "name": "blue_overalls", "shape": "sphere", "size": [0.095, 0.09, 0.08], "pos": [0, 0.065, 0], "color": "#2563eb" },
    { "name": "boba_cup", "shape": "cylinder", "size": [0.025, 0.020, 0.055], "pos": [0, 0.065, 0.075], "color": "#f472b6" },
    { "name": "boba_cream_lid", "shape": "sphere", "size": [0.024, 0.015, 0.024], "pos": [0, 0.095, 0.075], "color": "#ffffff" },
    { "name": "left_paw", "shape": "sphere", "size": [0.028, 0.025, 0.035], "pos": [-0.052, 0.065, 0.06], "color": "#ffffff" },
    { "name": "right_paw", "shape": "sphere", "size": [0.028, 0.025, 0.035], "pos": [0.052, 0.065, 0.06], "color": "#ffffff" },
    { "name": "left_foot", "shape": "sphere", "size": [0.038, 0.030, 0.045], "pos": [-0.050, 0.015, 0.045], "color": "#ffffff" },
    { "name": "right_foot", "shape": "sphere", "size": [0.038, 0.030, 0.045], "pos": [0.050, 0.015, 0.045], "color": "#ffffff" }
  ]
}

CRITICAL RULES FOR PENGUINS:
1. PENGUINS MUST HAVE VISIBLE EYES:
   - MUST generate TWO black eyes with white reflection pupils on the face:
     Left Eye: "shape": "sphere", "size": [0.012, 0.012, 0.012], "pos": [-0.032, 0.245, 0.09], "color": "#111111"
     Right Eye: "shape": "sphere", "size": [0.012, 0.012, 0.012], "pos": [0.032, 0.245, 0.09], "color": "#111111"
     Left Pupil: "shape": "sphere", "size": [0.004, 0.004, 0.004], "pos": [-0.030, 0.248, 0.098], "color": "#ffffff"
     Right Pupil: "shape": "sphere", "size": [0.004, 0.004, 0.004], "pos": [0.034, 0.248, 0.098], "color": "#ffffff"
2. PENGUIN BEAK:
   - MUST be a sharp orange cone pointing FORWARD between and below the eyes:
     "shape": "cone", "size": [0.022, 0.045], "pos": [0, 0.22, 0.095], "rot": [1.5708, 0, 0], "color": "#ff7700"
3. WHITE BELLY & WHITE FACE PATCH:
   - White belly: "shape": "sphere", "size": [0.09, 0.12, 0.055], "pos": [0, 0.12, 0.055], "color": "#f8fafc"
   - White face mask: "shape": "sphere", "size": [0.065, 0.055, 0.035], "pos": [0, 0.23, 0.07], "color": "#f8fafc"
4. FLIPPERS & FEET:
   - Left flipper: "shape": "sphere", "size": [0.025, 0.10, 0.055], "pos": [-0.11, 0.13, 0], "rot": [0.2, 0, -0.35], "color": "#1e232a"
   - Right flipper: "shape": "sphere", "size": [0.025, 0.10, 0.055], "pos": [0.11, 0.13, 0], "rot": [0.2, 0, 0.35], "color": "#1e232a"
   - Left foot: "shape": "cylinder", "size": [0.035, 0.035, 0.015], "pos": [-0.045, 0.008, 0.04], "rot": [0, -0.2, 0], "scale": [1, 1, 1.6], "color": "#ff7700"
   - Right foot: "shape": "cylinder", "size": [0.035, 0.035, 0.015], "pos": [0.045, 0.008, 0.04], "rot": [0, 0.2, 0], "scale": [1, 1, 1.6], "color": "#ff7700"

Reference decomposition for a Penguin:
{
  "name": "Plush Penguin",
  "parts": [
    { "shape": "sphere", "size": [0.11, 0.14, 0.10], "pos": [0, 0.13, 0], "color": "#1e232a" },
    { "shape": "sphere", "size": [0.09, 0.12, 0.055], "pos": [0, 0.12, 0.055], "color": "#f8fafc" },
    { "shape": "sphere", "size": [0.08, 0.08, 0.08], "pos": [0, 0.24, 0.02], "color": "#1e232a" },
    { "shape": "sphere", "size": [0.065, 0.055, 0.035], "pos": [0, 0.23, 0.07], "color": "#f8fafc" },
    { "shape": "sphere", "size": [0.012, 0.012, 0.012], "pos": [-0.032, 0.245, 0.09], "color": "#111111" },
    { "shape": "sphere", "size": [0.012, 0.012, 0.012], "pos": [0.032, 0.245, 0.09], "color": "#111111" },
    { "shape": "sphere", "size": [0.004, 0.004, 0.004], "pos": [-0.030, 0.248, 0.098], "color": "#ffffff" },
    { "shape": "sphere", "size": [0.004, 0.004, 0.004], "pos": [0.034, 0.248, 0.098], "color": "#ffffff" },
    { "shape": "cone", "size": [0.022, 0.045], "pos": [0, 0.22, 0.095], "rot": [1.5708, 0, 0], "color": "#ff7700" },
    { "shape": "sphere", "size": [0.025, 0.10, 0.055], "pos": [-0.11, 0.13, 0], "rot": [0.2, 0, -0.35], "color": "#1e232a" },
    { "shape": "sphere", "size": [0.025, 0.10, 0.055], "pos": [0.11, 0.13, 0], "rot": [0.2, 0, 0.35], "color": "#1e232a" },
    { "shape": "cylinder", "size": [0.035, 0.035, 0.015], "pos": [-0.045, 0.008, 0.04], "rot": [0, -0.2, 0], "scale": [1, 1, 1.6], "color": "#ff7700" },
    { "shape": "cylinder", "size": [0.035, 0.035, 0.015], "pos": [0.045, 0.008, 0.04], "rot": [0, 0.2, 0], "scale": [1, 1, 1.6], "color": "#ff7700" }
  ]
}

CRITICAL RULES FOR DUCKS / BIRDS / ANIMALS:
1. NEVER make a round cylinder snout or cork for a bird beak! Always use "shape": "beak" (flat horizontal duck bill) with vibrant orange "#ff5500".
2. Head & Body: MUST be smooth "sphere" (use ellipsoids [rx, ry, rz]).
3. Eyes: MUST be placed on the outer surface of the head (x = ±0.075, y ~ 0.31, z ~ 0.13) so they are clearly visible from front and 3/4 angles, in black "#111111".
4. Wings: MUST be flattened ellipsoids on the left (x ~ -0.15) and right (x ~ +0.15) sides.
5. Color: If the user says "yellow", ALWAYS use vibrant yellow (e.g. "#ffd000" or "#f59e0b"), NOT dull brown.

Reference decomposition for a duck:
{
  "name": "Duck",
  "parts": [
    { "shape": "sphere", "size": [0.16, 0.14, 0.20], "pos": [0, 0.14, 0], "material": "plastic", "color": "#FFD000" },
    { "shape": "cone", "size": [0.05, 0.12], "pos": [0, 0.18, -0.16], "rot": [-1.0, 0, 0], "material": "plastic", "color": "#FFD000" },
    { "shape": "sphere", "size": [0.10, 0.10, 0.10], "pos": [0, 0.28, 0.08], "material": "plastic", "color": "#FFD000" },
    { "shape": "beak", "size": [0.065, 0.024, 0.08], "pos": [0, 0.26, 0.18], "rot": [0.08, 0, 0], "material": "plastic", "color": "#FF5500" },
    { "shape": "sphere", "size": [0.015, 0.015, 0.015], "pos": [-0.075, 0.31, 0.13], "material": "plastic", "color": "#111111" },
    { "shape": "sphere", "size": [0.015, 0.015, 0.015], "pos": [0.075, 0.31, 0.13], "material": "plastic", "color": "#111111" },
    { "shape": "sphere", "size": [0.04, 0.08, 0.12], "pos": [-0.15, 0.15, 0.02], "rot": [0, 0, -0.15], "material": "plastic", "color": "#FFD000" },
    { "shape": "sphere", "size": [0.04, 0.08, 0.12], "pos": [0.15, 0.15, 0.02], "rot": [0, 0, 0.15], "material": "plastic", "color": "#FFD000" }
  ]
}

Respond ONLY with valid JSON. No markdown backticks, no prose.`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const userParts = [];
    if (req.body?.image) {
      const imgStr = req.body.image;
      const mimeMatch = imgStr.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = imgStr.replace(/^data:image\/\w+;base64,/, '');
      userParts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }

    userParts.push({
      text: `${systemPrompt}\n\nUser request: "${prompt || 'Analyze this reference image and recreate its physical object as an exact structured 3D model with matching colors and components.'}"`
    });

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
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const headerMs = Math.round(performance.now() - t0);

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      const msg = errData.error?.message || `HTTP ${geminiRes.status}`;
      return res.status(geminiRes.status).json({
        success: false,
        error: `Gemini API error (${geminiRes.status}): ${msg}`
      });
    }

    const data = await geminiRes.json();
    const apiLatencyMs = Math.round(performance.now() - t0);
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const finishReason = data.candidates?.[0]?.finishReason || 'STOP';

    let spec;
    const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    try {
      spec = JSON.parse(clean);
    } catch (e) {
      // Auto-repair truncated JSON: find last complete object in parts array
      try {
        const lastObjEnd = clean.lastIndexOf('}');
        if (lastObjEnd !== -1) {
          const candidate = clean.slice(0, lastObjEnd + 1);
          const openBrackets = (candidate.match(/\[/g) || []).length;
          const closeBrackets = (candidate.match(/\]/g) || []).length;
          const openBraces = (candidate.match(/\{/g) || []).length;
          const closeBraces = (candidate.match(/\}/g) || []).length;

          let repaired = candidate;
          for (let i = 0; i < (openBrackets - closeBrackets); i++) repaired += ']';
          for (let i = 0; i < (openBraces - closeBraces); i++) repaired += '}';

          spec = JSON.parse(repaired);
        } else {
          throw e;
        }
      } catch (repairErr) {
        throw new Error(`Invalid JSON returned by Gemini: ${e.message}`);
      }
    }

    if (Array.isArray(spec)) {
      spec = { name: 'AI_Model', parts: spec };
    }

    res.json({
      success: true,
      spec,
      finishReason,
      timing: {
        apiLatencyMs,
        headerMs
      }
    });
  } catch (err) {
    console.error('[GeneratePrompt3D Error]:', err);
    res.status(500).json({
      success: false,
      error: err.name === 'AbortError' ? 'Gemini request timed out after 20s' : err.message
    });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Image-to-3D AI Generation Service running at http://localhost:${port}`);
  console.log(`   Health check: http://localhost:${port}/health`);
  console.log(`   Endpoints:`);
  console.log(`     - POST http://localhost:${port}/api/generate-3d (2D Photo to 3D)`);
  console.log(`     - POST http://localhost:${port}/api/generate-prompt-3d (Prompt & Dimensions to 3D)`);
});

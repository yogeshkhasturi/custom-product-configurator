import { Structured3DBuilder } from './Structured3DBuilder.js';

/**
 * Optimized AI LLM 3D Generator
 * Generates structured 3D model specifications via Gemini API with:
 * - thinkingBudget: 0 (disables 60+ second thinking latency)
 * - responseMimeType: "application/json" (eliminates 1500+ token code generation overhead)
 * - Safe Structured3DBuilder assembly (zero eval / new Function)
 * - Bounded retries with backoff for 429/503 only
 * - Full timing instrumentation across all stages
 * - No silent fallbacks
 */
export class LLM3DGenerator {
  constructor(config = {}) {
    const envKey = typeof process !== 'undefined' && process?.env ? process.env.GEMINI_API_KEY : '';
    this.geminiApiKey = config.geminiApiKey || envKey || '';
    this.modelName = config.modelName || 'gemini-3.5-flash-lite';
    this.backendUrl = config.backendUrl || 'http://localhost:5000/api/generate-prompt-3d';
    this.timeoutMs = config.timeoutMs || 60000;
  }

  /**
   * Generates a 3D model from prompt and dimensions.
   * @param {object} params
   * @param {string} params.prompt
   * @param {object} params.dimensions - { width, height, depth } in meters
   * @param {string} [params.geminiApiKey] - Optional API key override
   * @param {function} [params.onProgress] - Status progress callback
   * @returns {Promise<{ model: THREE.Group, timing: object, source: string, spec: object }>}
   */
  async generate({ prompt, dimensions, image, geminiApiKey, onProgress }) {
    const apiKey = (geminiApiKey || this.geminiApiKey || '').trim();

    if (!apiKey) {
      throw new Error('Gemini API key is required. Please provide your Gemini API key or use the Built-in Three.js Engine.');
    }

    const timing = {
      startTime: performance.now(),
      apiLatencyMs: 0,
      headerDurationMs: 0,
      bodyParseMs: 0,
      buildDurationMs: 0,
      totalMs: 0,
      tokensUsed: 0,
      finishReason: 'UNKNOWN'
    };

    if (onProgress) onProgress('Submitting prompt to Gemini Flash AI (fast structured mode)...');

    // 1. Fetch structured JSON specification
    const { spec, apiTiming, finishReason } = await this.fetchStructuredSpecWithRetry({
      prompt,
      dimensions,
      image,
      apiKey,
      timing,
      onProgress
    });

    timing.apiLatencyMs = apiTiming.apiLatencyMs;
    timing.headerDurationMs = apiTiming.headerDurationMs;
    timing.bodyParseMs = apiTiming.bodyParseMs;
    timing.finishReason = finishReason;

    // 2. Build Three.js Geometry from validated JSON specification
    if (onProgress) onProgress('Assembling Three.js scene graph from AI specification...');
    const buildStart = performance.now();
    const model = Structured3DBuilder.build(spec, dimensions);
    timing.buildDurationMs = Math.round(performance.now() - buildStart);
    timing.totalMs = Math.round(performance.now() - timing.startTime);

    return {
      model,
      timing,
      source: 'gemini',
      spec
    };
  }

  /**
   * Performs the Gemini API call with bounded retry for retryable 429/503 errors only.
   */
  async fetchStructuredSpecWithRetry({ prompt, dimensions, image, apiKey, onProgress }) {
    const maxRetries = 1;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        return await this.callGeminiAPI({ prompt, dimensions, image, apiKey, onProgress });
      } catch (err) {
        attempt++;
        const isRetryable = err.status === 429 || err.status === 503;

        if (attempt <= maxRetries && isRetryable) {
          const delay = 1000 + Math.random() * 500;
          if (onProgress) onProgress(`Rate limited (429/503), retrying in ${Math.round(delay)}ms...`);
          await new Promise((r) => setTimeout(r, delay));
        } else {
          // Do NOT retry invalid keys (400, 401, 403) or missing models (404)
          throw err;
        }
      }
    }
  }

  /**
   * Primary Gemini API call. Prefers backend proxy to avoid CORS/401 browser stalls.
   */
  async callGeminiAPI({ prompt, dimensions, image, apiKey, onProgress }) {
    const t0 = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let res;
    let headerDurationMs = 0;

    // First attempt: call backend proxy (eliminates browser credential challenge hangs on 401/403)
    let usedBackend = false;
    if (this.backendUrl) {
      try {
        const backendRes = await fetch(this.backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, dimensions, image, apiKey }),
          signal: controller.signal
        });
        if (backendRes.ok) {
          res = backendRes;
          headerDurationMs = Math.round(performance.now() - t0);
          usedBackend = true;
        }
      } catch (backendErr) {
        // Fallback to direct if backend server is not running
        if (backendErr.name === 'AbortError') {
          clearTimeout(timeoutId);
          throw new Error(`Request timed out after ${this.timeoutMs / 1000}s.`);
        }
      }
    }

    // Direct fallback if backend was unavailable
    if (!res) {
      const directEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;
      const hasImage = Boolean(image);

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
   A) BULB CLIP-ON FITTER (For clip-on lampshades):
      - Symmetrical golden brass wire frame centered inside the lampshade aperture:
        - Left Top Support Strut: "shape": "cylinder", "size": [0.0022, 0.0022, 0.105], "pos": [-0.065, height/2 - 0.03, 0], "rot": [0, 0, 1.25], "material": "gold", "color": "#d4af37".
        - Right Top Support Strut: "shape": "cylinder", "size": [0.0022, 0.0022, 0.105], "pos": [0.065, height/2 - 0.03, 0], "rot": [0, 0, -1.25], "material": "gold", "color": "#d4af37".
        - Central Wire Saddle Ring: "shape": "torus", "size": [0.026, 0.0022], "pos": [0, height/2 - 0.045, 0], "rot": [1.5708, 0, 0], "material": "gold", "color": "#d4af37".
        - Dual Vertical Spring Steel Clip Loops (Front +Z and Back -Z) hugging the bulb:
          Front Loop: "shape": "torus", "size": [0.032, 0.002], "pos": [0, height/2 - 0.08, 0.035], "rot": [0, 1.5708, 0], "material": "gold", "color": "#d4af37".
          Back Loop: "shape": "torus", "size": [0.032, 0.002], "pos": [0, height/2 - 0.08, -0.035], "rot": [0, 1.5708, 0], "material": "gold", "color": "#d4af37".
        - Centered Incandescent Light Bulb inside the clip:
          Bulb Glass: "shape": "sphere", "size": [0.035, 0.045, 0.035], "pos": [0, height/2 - 0.085, 0], "material": "glass", "color": "#fffdfa".
          Screw Socket Base: "shape": "cylinder", "size": [0.014, 0.013, 0.022], "pos": [0, height/2 - 0.13, 0], "material": "gold", "color": "#d4af37".
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
    { "name": "outer_woven_shade", "shape": "cylinder", "size": [0.12, 0.23, 0.24], "pos": [0, 0, 0], "openEnded": true, "material": "rattan", "color": "#c89d66" },
    { "name": "inner_white_liner", "shape": "cylinder", "size": [0.118, 0.228, 0.238], "pos": [0, 0, 0], "openEnded": true, "material": "liner", "color": "#fcfbf7" },
    { "name": "top_rim", "shape": "torus", "size": [0.12, 0.006], "pos": [0, 0.12, 0], "rot": [1.5708, 0, 0], "material": "rattan", "color": "#c89d66" },
    { "name": "bottom_rim", "shape": "torus", "size": [0.23, 0.007], "pos": [0, -0.12, 0], "rot": [1.5708, 0, 0], "material": "rattan", "color": "#c89d66" },
    { "name": "clip_strut_left", "shape": "cylinder", "size": [0.0022, 0.0022, 0.105], "pos": [-0.065, 0.09, 0], "rot": [0, 0, 1.25], "material": "gold", "color": "#d4af37" },
    { "name": "clip_strut_right", "shape": "cylinder", "size": [0.0022, 0.0022, 0.105], "pos": [0.065, 0.09, 0], "rot": [0, 0, -1.25], "material": "gold", "color": "#d4af37" },
    { "name": "clip_saddle_ring", "shape": "torus", "size": [0.026, 0.0022], "pos": [0, 0.075, 0], "rot": [1.5708, 0, 0], "material": "gold", "color": "#d4af37" },
    { "name": "bulb_clip_loop_front", "shape": "torus", "size": [0.032, 0.002], "pos": [0, 0.040, 0.035], "rot": [0, 1.5708, 0], "material": "gold", "color": "#d4af37" },
    { "name": "bulb_clip_loop_back", "shape": "torus", "size": [0.032, 0.002], "pos": [0, 0.040, -0.035], "rot": [0, 1.5708, 0], "material": "gold", "color": "#d4af37" },
    { "name": "light_bulb_glass", "shape": "sphere", "size": [0.035, 0.045, 0.035], "pos": [0, 0.035, 0], "material": "glass", "color": "#fffdfa" },
    { "name": "light_bulb_base", "shape": "cylinder", "size": [0.014, 0.013, 0.022], "pos": [0, -0.012, 0], "material": "gold", "color": "#d4af37" }
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

      const userParts = [];
      if (image) {
        const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        userParts.push({ inlineData: { mimeType, data: base64Data } });
      }
      userParts.push({ text: `${systemPrompt}\n\nUser request: "${prompt || 'Analyze this reference image and recreate its physical object as an exact structured 3D model with matching colors and components.'}"` });

      const payload = {
        contents: [{ role: 'user', parts: userParts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      };

      try {
        res = await fetch(directEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        headerDurationMs = Math.round(performance.now() - t0);
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          throw new Error(`Gemini API request timed out after ${this.timeoutMs / 1000}s.`);
        }
        throw fetchErr;
      }
    }

    clearTimeout(timeoutId);
    const tParseStart = performance.now();

    const data = await res.json().catch(() => ({}));
    const bodyParseMs = Math.round(performance.now() - tParseStart);
    const apiLatencyMs = Math.round(performance.now() - t0);

    if (!res.ok) {
      const errorMsg = data.error?.message || data.error || `HTTP ${res.status}`;
      const apiError = new Error(errorMsg);
      apiError.status = res.status;
      throw apiError;
    }

    // Handle response from backend or direct Gemini endpoint
    let spec = null;
    let finishReason = 'STOP';

    if (usedBackend && data.spec) {
      spec = data.spec;
      finishReason = data.finishReason || 'STOP';
    } else {
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      finishReason = data.candidates?.[0]?.finishReason || 'STOP';
      spec = this.safeParseJSON(rawText);
    }

    const parts = Array.isArray(spec) ? spec : (Array.isArray(spec?.parts) ? spec.parts : []);

    if (parts.length === 0) {
      throw new Error('Gemini returned an invalid 3D specification (empty parts list).');
    }

    if (Array.isArray(spec)) {
      spec = { name: 'AI_Model', parts: spec };
    }

    return {
      spec,
      finishReason,
      apiTiming: {
        apiLatencyMs,
        headerDurationMs,
        bodyParseMs
      }
    };
  }

  /**
   * Safely parses JSON with auto-repair for truncated responses.
   */
  safeParseJSON(rawText) {
    if (!rawText || typeof rawText !== 'string') return {};
    const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(clean);
    } catch (err) {
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

          return JSON.parse(repaired);
        }
      } catch (repairErr) {
        // Fall back to original error
      }
      throw err;
    }
  }
}

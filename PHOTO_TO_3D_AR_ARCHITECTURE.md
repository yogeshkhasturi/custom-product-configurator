# Photo-to-3D AI Pipeline & Reusable AR Viewer Library
### Complete Architecture, Implementation Guide & Integration Manual

---

## 1. Executive Overview

This document outlines the blueprint for creating a standalone, commercial-grade **Photo-to-3D Model & AR Ecosystem** that can be integrated into any web application (Next.js, React, Shopify, WordPress, or custom HTML/JS).

The solution consists of two independent, modular systems:
1. **Photo-to-3D AI Generation Service (Backend / Cloud API):** Converts a single 2D product picture into a clean, textured `.glb` 3D model file and calibrates real-world dimensions.
2. **Universal 3D & AR Viewer Library (Frontend / Embeddable SDK):** A framework-agnostic client library packaged as both an **NPM package** and a **Web Component / CDN script** (`<universal-ar-viewer>`) that renders the model, handles realistic lighting, and launches 1:1 real-world AR on iOS and Android.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           HOST APPLICATION                               │
│            (Shopify / WordPress / Next.js / Custom Web App)              │
│                                                                          │
│  1. Upload Photo                  4. Embed Viewer                        │
│       │                                │                                 │
└───────┼────────────────────────────────┼─────────────────────────────────┘
        ▼                                ▼
┌───────────────────────────────┐ ┌────────────────────────────────────────┐
│   Photo-to-3D AI Service      │ │   Universal 3D & AR Viewer SDK         │
│   (Node.js / Cloudflare / AWS)│ │   (Web Component / NPM Package)        │
│                               │ │                                        │
│ • Background removal          │ │ • Three.js WebGL Engine                │
│ • Tripo3D / Meshy AI API      │ │ • Realistic Studio PBR Lighting        │
│ • Metric Scale Calibration    │ │ • Android Scene Viewer (WebXR / .glb)  │
│ • GLB + USDZ CDN Storage      │ │ • iOS QuickLook AR (.usdz)             │
└───────────────┬───────────────┘ └────────────────────────────────────────┘
                │                                ▲
                └─────────── .glb / .usdz ───────┘
```

---

## 2. Photo-to-3D AI Generation Pipeline

### 2.1 Recommended AI Engine: Tripo3D vs. Meshy vs. Stable Fast 3D

| Feature | **Tripo3D API** (Recommended) | **Meshy.ai API** | **Stable Fast 3D** |
| :--- | :--- | :--- | :--- |
| **Generation Time** | **8 – 15 seconds** | 30 – 60 seconds | 1 – 3 seconds |
| **Output Formats** | `.glb`, `.usdz`, `.obj` | `.glb`, `.usdz`, `.fbx` | `.glb` |
| **PBR Texturing** | Base color, roughness, normal | High-detail PBR | Basic texture map |
| **API Readiness** | Production REST API with webhooks | Production REST API | Self-hosted or Replicate |

---

### 2.2 Backend Implementation: Image-to-3D Service

Create an API endpoint (e.g., in Next.js, Express, or AWS Lambda) that handles the photo conversion.

```javascript
// server/api/photo-to-3d.js
import axios from 'axios';

const TRIPO_API_KEY = process.env.TRIPO_API_KEY;
const TRIPO_BASE_URL = 'https://api.tripo3d.ai/v2/openapi';

/**
 * 1. Submit an image to generate a 3D model
 */
export async function generate3DFromImage(imageBase64, imageFormat = 'jpg') {
  // Step A: Trigger Generation Task
  const startResponse = await axios.post(
    `${TRIPO_BASE_URL}/task`,
    {
      type: 'image_to_model',
      file: {
        type: imageFormat,
        data: imageBase64
      }
    },
    {
      headers: {
        Authorization: `Bearer ${TRIPO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const taskId = startResponse.data.data.task_id;

  // Step B: Poll until completion (takes ~10 to 15 seconds)
  let status = 'queued';
  let modelOutput = null;

  while (status === 'queued' || status === 'running') {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2s between polls

    const checkResponse = await axios.get(`${TRIPO_BASE_URL}/task/${taskId}`, {
      headers: { Authorization: `Bearer ${TRIPO_API_KEY}` }
    });

    status = checkResponse.data.data.status;

    if (status === 'success') {
      modelOutput = checkResponse.data.data.output;
      break;
    } else if (status === 'failed') {
      throw new Error('AI Model generation failed: ' + checkResponse.data.data.message);
    }
  }

  // Returns direct CDN URLs for GLB and USDZ
  return {
    taskId,
    glbUrl: modelOutput.model,        // For WebGL & Android AR
    renderedPreview: modelOutput.rendered_image
  };
}
```

---

### 2.3 Real-World Scale Calibration (Crucial for AR)

AI models do not automatically know real-world physical scale (e.g., whether a generated chair is 30 cm or 90 cm tall). In AR, if the scale is wrong, the product will look tiny or gigantic in the customer's room.

#### The Scaling Algorithm:
1. Allow the user or admin to enter **one real-world dimension** (e.g., `realHeightMeters: 0.85`).
2. When loading the model, compute its 3D bounding box and scale it:

```javascript
import * as THREE from 'three';

export function calibrateModelScale(gltfScene, targetHeightMeters = 0.5) {
  const box = new THREE.Box3().setFromObject(gltfScene);
  const size = new THREE.Vector3();
  box.getSize(size);

  const currentHeight = size.y;
  if (currentHeight > 0) {
    const scaleFactor = targetHeightMeters / currentHeight;
    gltfScene.scale.set(scaleFactor, scaleFactor, scaleFactor);
  }

  // Center model origin at bottom-center for realistic AR floor placement
  const updatedBox = new THREE.Box3().setFromObject(gltfScene);
  const center = new THREE.Vector3();
  updatedBox.getCenter(center);
  gltfScene.position.x -= center.x;
  gltfScene.position.z -= center.z;
  gltfScene.position.y -= updatedBox.min.y; // Sit directly on floor y=0
}
```

---

## 3. Creating the Reusable 3D/AR Library

To allow **any website or app** to use your viewer, package it as a **Custom Web Component** (bundled via Vite into a single `.js` file).

### 3.1 Project Structure for the Library

```
universal-ar-library/
├── package.json
├── vite.config.js
├── src/
│   ├── index.js                  # Entry point & Custom Element definition
│   ├── core/
│   │   ├── SceneManager.js       # Three.js scene, camera, lighting, shadow
│   │   └── ModelLoader.js        # GLTFLoader, bounding box, scale
│   └── ui/
│       └── ControlsOverlay.js    # AR button, fullscreen, reset view, loading bar
└── dist/
    ├── universal-ar-viewer.js    # Single bundle for CDN / <script> tags
    └── index.d.ts                # TypeScript definitions for NPM
```

---

## 4. Integration Guide Across Multiple Platforms

Once published to a CDN (e.g. `https://cdn.yourdomain.com/viewer.js`) or NPM, integrating it requires just 2 lines of code.

### 4.1 Plain HTML / Vanilla JS
```html
<!-- 1. Load the script -->
<script src="https://cdn.yourdomain.com/universal-ar-viewer.js" defer></script>

<!-- 2. Use the custom element -->
<universal-ar-viewer 
  src="https://cdn.yourdomain.com/models/chair-generated.glb"
  usdz-src="https://cdn.yourdomain.com/models/chair-generated.usdz"
  alt="Luxury Modern Chair">
</universal-ar-viewer>
```

---

### 4.2 Shopify (Liquid Theme)
In any Shopify theme (e.g. `sections/main-product.liquid`):

```liquid
<script src="https://cdn.yourdomain.com/universal-ar-viewer.js" defer></script>

<div class="product-3d-wrapper" style="width: 100%; height: 500px;">
  {% if product.metafields.custom.ai_model_glb %}
    <universal-ar-viewer 
      src="{{ product.metafields.custom.ai_model_glb }}"
      alt="{{ product.title | escape }}">
    </universal-ar-viewer>
  {% else %}
    <!-- Fallback standard product image -->
    <img src="{{ product.featured_image | img_url: 'master' }}" />
  {% endif %}
</div>
```

---

### 4.3 React / Next.js
Install via npm (`npm install @your-org/universal-ar-viewer`):

```jsx
'use client';
import { useEffect } from 'react';

export default function ProductARPage({ glbUrl, title }) {
  useEffect(() => {
    import('@your-org/universal-ar-viewer');
  }, []);

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden shadow-lg">
      <universal-ar-viewer
        src={glbUrl}
        alt={title}
      />
    </div>
  );
}
```

---

## 5. Security, Hosting & CORS Requirements

1. **CORS Headers on Model Storage (S3 / Cloudflare R2 / GCS):**
   ```http
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, HEAD, OPTIONS
   ```
2. **MIME Types:**
   - `.glb` files must be served with: `model/gltf-binary`
   - `.usdz` files must be served with: `model/vnd.usdz+zip`
3. **HTTPS Mandatory:**
   - WebXR and mobile AR (QuickLook and Scene Viewer) refuse to load over plain `http://`. All model URLs must use `https://`.

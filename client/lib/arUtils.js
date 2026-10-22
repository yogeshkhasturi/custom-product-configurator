import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';

/**
 * Detect mobile platform
 */
export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return { isMobile: false, isIOS: false, isAndroid: false };
  }

  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS
  const isAndroid = /android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi|Tablet/i.test(ua);

  return { isMobile, isIOS, isAndroid };
}

/**
 * Prepares a clean 3D clone for AR placement:
 * 1. Strips out artificial scene studio lights and ground shadow/pool planes
 *    (AR engines generate their own real-world floor/table shadows and lighting).
 * 2. Grounds the bottom rim at y = 0 so the shade rests naturally on the table.
 * 3. Scales from Three.js units (inches) to AR standard units (meters):
 *    1 inch = 0.0254 meters (1:1 true physical scale).
 */
export function prepareARScene(sourceGroup, heightInInches = 10) {
  const arRoot = new THREE.Group();
  arRoot.name = 'AR_Lampshade_Root';

  if (!sourceGroup) return arRoot;

  const h = Math.max(1, parseFloat(heightInInches) || 10);
  const yOffset = h / 2; // Elevate so bottom rim sits at y = 0

  sourceGroup.traverse((child) => {
    // Only copy direct children of the top group or relevant meshes
    if (child === sourceGroup) return;

    // Skip point lights, ambient lights, etc. (AR uses camera/real environment light)
    if (child.isLight) return;

    // Skip artificial contact shadow planes & light spill disks
    if (child.isMesh && child.geometry instanceof THREE.PlaneGeometry) return;

    if (child.isMesh) {
      const clonedMesh = child.clone(false);
      clonedMesh.geometry = child.geometry.clone();

      // Ensure material is clean and standard for GLTF/USDZ export
      if (child.material) {
        if (Array.isArray(child.material)) {
          clonedMesh.material = child.material.map((m) => m.clone());
        } else {
          clonedMesh.material = child.material.clone();
        }
      }

      // Elevate child so bottom rests at y = 0
      clonedMesh.position.y += yOffset;
      arRoot.add(clonedMesh);
    }
  });

  // Scale: 1 inch = 0.0254 meters
  const INCHES_TO_METERS = 0.0254;
  arRoot.scale.set(INCHES_TO_METERS, INCHES_TO_METERS, INCHES_TO_METERS);
  arRoot.updateMatrixWorld(true);

  return arRoot;
}

/**
 * Export 3D group to GLB (Binary glTF) format
 */
export async function exportToGLB(arGroup) {
  const exporter = new GLTFExporter();
  const options = {
    binary: true,
    onlyVisible: true,
    embedImages: true,
  };

  return new Promise((resolve, reject) => {
    exporter.parse(
      arGroup,
      (result) => {
        const blob = new Blob([result], { type: 'model/gltf-binary' });
        resolve(blob);
      },
      (error) => {
        reject(error);
      },
      options
    );
  });
}

/**
 * Export 3D group to Apple USDZ format for iOS AR Quick Look
 */
export async function exportToUSDZ(arGroup) {
  const exporter = new USDZExporter();
  const options = {
    quickLookCompatible: true,
    onlyVisible: true,
    maxTextureSize: 1024,
    ar: {
      anchoring: { type: 'plane' },
      planeAnchoring: { alignment: 'horizontal' },
    },
  };

  const usdzData = await exporter.parseAsync(arGroup, options);
  return new Blob([usdzData], { type: 'model/vnd.usdz+zip' });
}

/**
 * Upload the generated 3D model to backend to get an accessible public URL
 * (Required by Android Google Scene Viewer, and useful for reliable iOS viewing)
 */
export async function uploadARModelToServer(blob, format = 'glb') {
  const formData = new FormData();
  formData.append('model', blob, `model.${format}`);
  formData.append('format', format);

  const res = await fetch('/api/ar/export', {
    method: 'POST',
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Failed to upload AR model (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || 'Error processing AR model on server');
  }

  return data;
}

/**
 * Trigger Apple AR Quick Look on iOS
 */
export function launchIOSQuickLook(url) {
  const anchor = document.createElement('a');
  anchor.setAttribute('rel', 'ar');
  anchor.setAttribute('href', url);

  // iOS Quick Look requires an <img> child element inside <a rel="ar">
  const img = document.createElement('img');
  img.setAttribute('alt', 'View in AR');
  anchor.appendChild(img);

  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    try {
      document.body.removeChild(anchor);
    } catch (e) {
      // ignore
    }
  }, 1000);
}

/**
 * Trigger Google Scene Viewer on Android
 */
export function launchAndroidSceneViewer(fullGlbUrl, title = 'Custom Lampshade') {
  // Intent format for Google Scene Viewer:
  // resizable=false locks 1:1 true real-world physical scale
  // mode=ar_only forces opening the camera immediately
  const intentUrl =
    `intent://arvr.google.com/scene-viewer/1.0?` +
    `file=${encodeURIComponent(fullGlbUrl)}` +
    `&mode=ar_only` +
    `&resizable=false` +
    `&title=${encodeURIComponent(title)}` +
    `#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;` +
    `S.browser_fallback_url=${encodeURIComponent(fullGlbUrl)};end;`;

  window.location.href = intentUrl;
}

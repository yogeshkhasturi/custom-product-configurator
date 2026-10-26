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
 * Creates an elegant, contemporary brushed bronze / metal table lamp base & stem
 * for context-rich preview in real rooms.
 */
function createTableLampStandMesh(baseHeightInches, shadeBottomRadiusInches) {
  const standGroup = new THREE.Group();
  standGroup.name = 'AR_Table_Lamp_Base';

  const baseRadius = Math.max(3.0, shadeBottomRadiusInches * 0.52);

  // High-end brushed metal material
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x2e3033, // Contemporary brushed gunmetal / deep bronze
    metalness: 0.88,
    roughness: 0.28,
  });

  // 1. Weighted circular base plate resting flat on table (y = 0 to 0.45")
  const basePlateGeo = new THREE.CylinderGeometry(baseRadius * 0.96, baseRadius, 0.45, 36);
  const basePlate = new THREE.Mesh(basePlateGeo, metalMat);
  basePlate.position.y = 0.225;
  standGroup.add(basePlate);

  // 2. Decorative stepped base collar
  const collarGeo = new THREE.CylinderGeometry(baseRadius * 0.38, baseRadius * 0.65, 0.35, 32);
  const collar = new THREE.Mesh(collarGeo, metalMat);
  collar.position.y = 0.45 + 0.175;
  standGroup.add(collar);

  // 3. Slender central rod/stem
  const stemHeight = Math.max(4.0, baseHeightInches - 0.8);
  const stemGeo = new THREE.CylinderGeometry(0.32, 0.32, stemHeight, 24);
  const stem = new THREE.Mesh(stemGeo, metalMat);
  stem.position.y = 0.8 + stemHeight / 2;
  standGroup.add(stem);

  // 4. Socket and neck cup right under the fitter
  const socketGeo = new THREE.CylinderGeometry(0.75, 0.55, 1.2, 24);
  const socketMat = new THREE.MeshStandardMaterial({
    color: 0xc49b4d, // Polished brass accent socket
    metalness: 0.82,
    roughness: 0.25,
  });
  const socket = new THREE.Mesh(socketGeo, socketMat);
  socket.position.y = baseHeightInches - 0.6;
  standGroup.add(socket);

  return standGroup;
}

/**
 * Prepares a clean 3D clone for AR placement:
 * 1. Strips out artificial scene studio lights and ground shadow/pool planes
 *    (AR engines generate their own real-world floor/table shadows and lighting).
 * 2. Grounds the bottom rim at y = 0 so the shade rests naturally on the table
 *    (or mounts atop a table lamp stand if arPlacement === 'table_lamp').
 * 3. Adds warm internal emissive glow & bulb mesh when isLampOn is true.
 * 4. Ensures double-sided rendering so looking up inside the shade is realistic.
 * 5. Scales from Three.js units (inches) to AR standard units (meters):
 *    1 inch = 0.0254 meters (1:1 true physical scale).
 */
export function prepareARScene(sourceGroup, heightOrOptions = 10) {
  const arRoot = new THREE.Group();
  arRoot.name = 'AR_Lampshade_Root';

  if (!sourceGroup) return arRoot;

  let heightInInches = 10;
  let isLampOn = false;
  let arPlacement = 'shade'; // 'shade' | 'table_lamp'

  if (typeof heightOrOptions === 'object' && heightOrOptions !== null) {
    heightInInches = parseFloat(heightOrOptions.heightInInches || heightOrOptions.height) || 10;
    isLampOn = Boolean(heightOrOptions.isLampOn);
    arPlacement = heightOrOptions.arPlacement || 'shade';
  } else {
    heightInInches = parseFloat(heightOrOptions) || 10;
  }

  const h = Math.max(1, heightInInches);

  // Determine bottom elevation:
  // - 'shade': bottom rim sits at y = 0
  // - 'table_lamp': sits atop the lamp base neck
  const standHeight = Math.max(12, h * 1.15);
  const yOffset = arPlacement === 'table_lamp' ? standHeight + h / 2 : h / 2;

  // Approximate bottom radius from child meshes to size stand properly
  let estimatedBottomRadius = 7.0;

  sourceGroup.traverse((child) => {
    // Skip studio lights & artificial floor disks
    if (child.isLight) return;
    if (child.isMesh && child.geometry instanceof THREE.PlaneGeometry) return;

    if (child.isMesh) {
      if (child.geometry?.parameters?.radiusBottom) {
        estimatedBottomRadius = child.geometry.parameters.radiusBottom;
      }

      const clonedMesh = child.clone(false);
      clonedMesh.geometry = child.geometry.clone();

      // Ensure material is clean, double-sided, and exportable for GLTF/USDZ
      if (child.material) {
        const prepareMaterial = (mat) => {
          const m = mat.clone();
          m.side = THREE.DoubleSide; // Realistic viewing from all camera angles in AR
          if (isLampOn) {
            // Apply subtle warm internal radiance for illuminated AR view
            if (!m.emissive || m.emissive.getHex() === 0x000000) {
              m.emissive = new THREE.Color(0x3a220a);
              m.emissiveIntensity = 0.45;
            }
          }
          return m;
        };

        if (Array.isArray(child.material)) {
          clonedMesh.material = child.material.map(prepareMaterial);
        } else {
          clonedMesh.material = prepareMaterial(child.material);
        }
      }

      // Elevate child so bottom rests at target elevation
      clonedMesh.position.y += yOffset;
      arRoot.add(clonedMesh);
    }
  });

  // If table lamp mode requested, attach a table lamp stand resting at y = 0
  if (arPlacement === 'table_lamp') {
    const lampStand = createTableLampStandMesh(standHeight, estimatedBottomRadius);
    arRoot.add(lampStand);
  }

  // If lamp is turned ON, place a glowing warm incandescent bulb mesh inside
  if (isLampOn) {
    const bulbGeo = new THREE.SphereGeometry(Math.min(1.3, h * 0.16), 24, 24);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfffdf5,
      emissive: 0xffb84d,
      emissiveIntensity: 2.2,
      roughness: 0.18,
    });
    const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
    // Center bulb at fitter level
    bulbMesh.position.set(0, yOffset + h * 0.12, 0);
    arRoot.add(bulbMesh);
  }

  // Scale: 1 inch = 0.0254 meters (AR real-world 1:1 scale)
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
 * Trigger Apple AR Quick Look on iOS with 1:1 physical scale lock & action banner
 */
export function launchIOSQuickLook(url, options = {}) {
  let finalUrl = url;
  const hashParams = [];

  // Lock 1:1 true scale (prevents accidental pinch-resizing)
  if (options.lockScale !== false) {
    hashParams.push('allowsContentScaling=0');
  }

  // Interactive Quick Look banner actions
  if (options.callToAction) {
    hashParams.push(`callToAction=${encodeURIComponent(options.callToAction)}`);
  }
  if (options.checkoutTitle) {
    hashParams.push(`checkoutTitle=${encodeURIComponent(options.checkoutTitle)}`);
  }
  if (options.canonicalWebPageURL) {
    hashParams.push(`canonicalWebPageURL=${encodeURIComponent(options.canonicalWebPageURL)}`);
  }

  if (hashParams.length > 0) {
    const sep = finalUrl.includes('#') ? '&' : '#';
    finalUrl = `${finalUrl}${sep}${hashParams.join('&')}`;
  }

  const anchor = document.createElement('a');
  anchor.setAttribute('rel', 'ar');
  anchor.setAttribute('href', finalUrl);

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
 * Trigger Google Scene Viewer on Android with true 1:1 scale and back-to-store link
 */
export function launchAndroidSceneViewer(fullGlbUrl, title = 'Custom Lampshade', linkUrl = '') {
  let intentUrl =
    `intent://arvr.google.com/scene-viewer/1.0?` +
    `file=${encodeURIComponent(fullGlbUrl)}` +
    `&mode=ar_only` +
    `&resizable=false` +
    `&title=${encodeURIComponent(title)}`;

  if (linkUrl) {
    intentUrl += `&link=${encodeURIComponent(linkUrl)}`;
  }

  intentUrl +=
    `#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;` +
    `S.browser_fallback_url=${encodeURIComponent(linkUrl || fullGlbUrl)};end;`;

  window.location.href = intentUrl;
}

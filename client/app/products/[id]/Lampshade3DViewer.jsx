'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Alert from '@mui/material/Alert';

// MUI Icons
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CloseIcon from '@mui/icons-material/Close';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DownloadIcon from '@mui/icons-material/Download';
import NavigationIcon from '@mui/icons-material/Navigation';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import TableBarIcon from '@mui/icons-material/TableBar';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { resolveImageUrl } from '../../../lib/pricingUtils';
import {
  getDeviceInfo,
  prepareARScene,
  exportToGLB,
  exportToUSDZ,
  uploadARModelToServer,
  launchIOSQuickLook,
  launchAndroidSceneViewer,
} from '../../../lib/arUtils';
// Soft ambient occlusion contact shadow directly beneath the lampshade base
function createContactShadowTexture() {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  // Multi-tier Gaussian radial falloff: dense contact under the rim, feathering out
  const grad = ctx.createRadialGradient(cx, cy, size * 0.16, cx, cy, size * 0.49);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
  grad.addColorStop(0.35, 'rgba(30, 41, 59, 0.25)');
  grad.addColorStop(0.7, 'rgba(71, 85, 105, 0.08)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Warm downward incandescent light pool on tabletop when lamp is illuminated
function createLightPoolTexture() {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  // Radiant warm pool of light spilling out from bottom opening
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.49);
  grad.addColorStop(0, 'rgba(255, 235, 185, 0.6)');
  grad.addColorStop(0.3, 'rgba(255, 215, 150, 0.38)');
  grad.addColorStop(0.68, 'rgba(255, 195, 120, 0.12)');
  grad.addColorStop(1, 'rgba(255, 180, 100, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Helper to create a procedural seamless woven fabric texture with matching tactile bump map
function createFabricTexture(baseHex = '#d8c29d', pattern = 'burlap', maxAnisotropy = 8) {
  if (typeof document === 'undefined') return { diffuseTexture: null, bumpTexture: null };
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { diffuseTexture: null, bumpTexture: null };

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  // Base fabric wash
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#666666';
  bCtx.fillRect(0, 0, size, size);

  // Woven thread pitch
  const isBurlap = String(pattern).toLowerCase().includes('burlap');
  const threadPitch = isBurlap ? 16 : 10;
  const halfPitch = threadPitch / 2;

  // Render woven interlaced threads (warp and weft)
  for (let y = 0; y < size; y += threadPitch) {
    for (let x = 0; x < size; x += threadPitch) {
      const isWarpOver = ((x / threadPitch) + (y / threadPitch)) % 2 === 0;

      if (isWarpOver) {
        // Vertical warp thread on top
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x, y, halfPitch, threadPitch);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(x + halfPitch, y, halfPitch, threadPitch);

        bCtx.fillStyle = '#c0c0c0';
        bCtx.fillRect(x, y, threadPitch, threadPitch);
        bCtx.fillStyle = '#222222';
        bCtx.fillRect(x + threadPitch - 2, y, 2, threadPitch);
      } else {
        // Horizontal weft thread on top
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        ctx.fillRect(x, y, threadPitch, halfPitch);
        ctx.fillStyle = 'rgba(0,0,0,0.11)';
        ctx.fillRect(x, y + halfPitch, threadPitch, halfPitch);

        bCtx.fillStyle = '#d8d8d8';
        bCtx.fillRect(x, y, threadPitch, threadPitch);
        bCtx.fillStyle = '#222222';
        bCtx.fillRect(x, y + threadPitch - 2, threadPitch, 2);
      }
    }
  }

  // Micro organic slubs and natural fiber flecks
  const slubCount = isBurlap ? 600 : 300;
  for (let i = 0; i < slubCount; i++) {
    const rx = Math.random() * size;
    const ry = Math.random() * size;
    const len = Math.random() * 16 + 4;
    const isDark = Math.random() > 0.45;
    ctx.fillStyle = isDark ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.1)';
    ctx.fillRect(rx, ry, len, Math.random() * 2 + 1);
  }

  const diffuseTexture = new THREE.CanvasTexture(canvas);
  diffuseTexture.colorSpace = THREE.SRGBColorSpace;
  diffuseTexture.wrapS = THREE.RepeatWrapping;
  diffuseTexture.wrapT = THREE.RepeatWrapping;
  diffuseTexture.anisotropy = maxAnisotropy;

  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  bumpTexture.colorSpace = THREE.NoColorSpace;
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.RepeatWrapping;
  bumpTexture.anisotropy = maxAnisotropy;

  return { diffuseTexture, bumpTexture };
}

// Helper to process an uploaded swatch image into a high-res, seamless, tactile fabric texture with bump map
function loadCleanFabricTexture(url, coveringName, rTop, rBottom, h, maxAnisotropy = 8, onLoad, onError) {
  if (typeof window === 'undefined') return;

  // Curated seamless textures for guaranteed photo-realism on standard catalog coverings
  const n = String(coveringName || '').toLowerCase();
  let targetUrl = url;
  if (n.includes('black')) {
    targetUrl = '/images/lampshades/coverings/seamless-black.webp';
  } else if (n.includes('off white') || n.includes('off-white')) {
    targetUrl = '/images/lampshades/coverings/seamless-offwhite.webp';
  } else if (n.includes('natural') || (n.includes('burlap') && !n.includes('black') && !n.includes('white'))) {
    targetUrl = '/images/lampshades/coverings/seamless-natural.webp';
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = targetUrl;

  img.onload = () => {
    try {
      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;

      const testCanvas = document.createElement('canvas');
      testCanvas.width = srcW;
      testCanvas.height = srcH;
      const testCtx = testCanvas.getContext('2d');
      testCtx.drawImage(img, 0, 0);

      const imgData = testCtx.getImageData(0, 0, srcW, srcH);
      const data = imgData.data;

      // Scan for transparent border pixels or white swatch card margins
      let minX = srcW;
      let maxX = 0;
      let minY = srcH;
      let maxY = 0;
      let hasBorder = false;

      const tlA = data[3];
      const tlR = data[0], tlG = data[1], tlB = data[2];
      const isCornerLight = (tlA < 240) || (tlR > 235 && tlG > 235 && tlB > 235);

      for (let y = 0; y < srcH; y++) {
        for (let x = 0; x < srcW; x++) {
          const idx = (y * srcW + x) * 4;
          const a = data[idx + 3];
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const isEdgeBg = a < 240 || (isCornerLight && r > 238 && g > 238 && b > 238);
          if (isEdgeBg) {
            hasBorder = true;
          } else {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      let cropX = 0;
      let cropY = 0;
      let cropW = srcW;
      let cropH = srcH;

      if (hasBorder && minX < maxX && minY < maxY && (maxX - minX > 50) && (maxY - minY > 50)) {
        const spanW = maxX - minX;
        const spanH = maxY - minY;
        const insetX = Math.max(6, Math.round(spanW * 0.05));
        const insetY = Math.max(6, Math.round(spanH * 0.05));
        cropX = minX + insetX;
        cropY = minY + insetY;
        cropW = Math.max(10, spanW - insetX * 2);
        cropH = Math.max(10, spanH - insetY * 2);
      }

      // 1. High-resolution 1024x1024 canvas for crisp detail
      const targetSize = 1024;
      const diffuseCanvas = document.createElement('canvas');
      diffuseCanvas.width = targetSize;
      diffuseCanvas.height = targetSize;
      const diffCtx = diffuseCanvas.getContext('2d');
      diffCtx.imageSmoothingEnabled = true;
      diffCtx.imageSmoothingQuality = 'high';
      diffCtx.drawImage(testCanvas, cropX, cropY, cropW, cropH, 0, 0, targetSize, targetSize);

      // 2. High-contrast Bump Canvas for 3D woven tactile thread depth
      const bumpCanvas = document.createElement('canvas');
      bumpCanvas.width = targetSize;
      bumpCanvas.height = targetSize;
      const bCtx = bumpCanvas.getContext('2d');
      const bImgData = bCtx.createImageData(targetSize, targetSize);
      const bPixels = bImgData.data;

      const diffPixels = diffCtx.getImageData(0, 0, targetSize, targetSize).data;
      for (let i = 0; i < diffPixels.length; i += 4) {
        const r = diffPixels[i];
        const g = diffPixels[i + 1];
        const b = diffPixels[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const contrast = Math.max(0, Math.min(255, (lum - 128) * 1.9 + 128));
        bPixels[i] = contrast;
        bPixels[i + 1] = contrast;
        bPixels[i + 2] = contrast;
        bPixels[i + 3] = 255;
      }
      bCtx.putImageData(bImgData, 0, 0);

      // Create Three.js textures with anisotropic filtering and true sRGB color space
      const diffuseTexture = new THREE.CanvasTexture(diffuseCanvas);
      diffuseTexture.colorSpace = THREE.SRGBColorSpace;
      diffuseTexture.wrapS = THREE.RepeatWrapping;
      diffuseTexture.wrapT = THREE.RepeatWrapping;
      diffuseTexture.anisotropy = maxAnisotropy;

      const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
      bumpTexture.colorSpace = THREE.NoColorSpace;
      bumpTexture.wrapS = THREE.RepeatWrapping;
      bumpTexture.wrapT = THREE.RepeatWrapping;
      bumpTexture.anisotropy = maxAnisotropy;

      // Realistic physical thread scaling (1:1 square weave)
      const circumference = Math.PI * (rTop + rBottom);
      const repeatU = Math.max(2, Math.round(circumference / 3.0));
      const repeatV = Math.max(1, Math.round(h / 3.0));

      diffuseTexture.repeat.set(repeatU, repeatV);
      bumpTexture.repeat.set(repeatU, repeatV);

      onLoad({ diffuseTexture, bumpTexture });
    } catch (e) {
      console.warn('Canvas texture processing fallback:', e);
      const loader = new THREE.TextureLoader();
      loader.load(targetUrl, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = maxAnisotropy;
        const circumference = Math.PI * (rTop + rBottom);
        const repeatU = Math.max(2, Math.round(circumference / 3.0));
        const repeatV = Math.max(1, Math.round(h / 3.0));
        tex.repeat.set(repeatU, repeatV);
        onLoad({ diffuseTexture: tex, bumpTexture: null });
      }, undefined, onError);
    }
  };

  img.onerror = (err) => {
    console.warn('Texture image load fallback, using procedural:', err);
    onError?.(err);
  };
}

// Map covering name to realistic hex color
function getCoveringColor(name = '') {
  const n = String(name || '').toLowerCase();
  if (n.includes('black') || n.includes('ebony') || n.includes('dark charcoal')) return '#18191b';
  if (n.includes('off white') || n.includes('off-white') || n.includes('ivory') || n.includes('cream')) return '#ede4d6';
  if (n.includes('natural') || n.includes('burlap') || n.includes('tan') || n.includes('kraft')) return '#ba9b72';
  if (n.includes('white')) return '#fcfaf7';
  if (n.includes('linen')) return '#ded4c5';
  if (n.includes('navy') || n.includes('blue')) return '#1b2a47';
  if (n.includes('charcoal') || n.includes('grey') || n.includes('gray')) return '#383a3e';
  if (n.includes('red') || n.includes('burgundy')) return '#6d1b24';
  if (n.includes('green') || n.includes('sage')) return '#4a5d4e';
  if (n.includes('gold') || n.includes('yellow')) return '#c59b27';
  if (n.includes('brown')) return '#5a3d28';
  return '#ba9b72'; // warm natural burlap default
}

// Helper to generate a realistic incandescent light bulb model with screw socket base (A19 or Candelabra B10)
function createLightBulbMesh(bulbRadius, bulbHeight, isLampOn, isCandelabra = false) {
  const points = [];

  if (isCandelabra) {
    // Elegant candelabra flame/torpedo profile (B10 / CA10)
    points.push(new THREE.Vector2(0, bulbHeight * 0.52));
    points.push(new THREE.Vector2(bulbRadius * 0.18, bulbHeight * 0.46));
    points.push(new THREE.Vector2(bulbRadius * 0.58, bulbHeight * 0.35));
    points.push(new THREE.Vector2(bulbRadius * 0.92, bulbHeight * 0.18));
    points.push(new THREE.Vector2(bulbRadius * 1.0, bulbHeight * 0.02));
    points.push(new THREE.Vector2(bulbRadius * 0.92, -bulbHeight * 0.12));
    points.push(new THREE.Vector2(bulbRadius * 0.68, -bulbHeight * 0.25));
    points.push(new THREE.Vector2(bulbRadius * 0.44, -bulbHeight * 0.36));
    points.push(new THREE.Vector2(bulbRadius * 0.40, -bulbHeight * 0.44));
    points.push(new THREE.Vector2(0, -bulbHeight * 0.44));
  } else {
    // Classic A19 / A15 spherical dome + conical waist
    const domeSegments = 14;
    for (let i = 0; i <= domeSegments; i++) {
      const theta = (i / domeSegments) * (Math.PI / 2);
      const x = Math.sin(theta) * bulbRadius;
      const y = bulbHeight * 0.38 + Math.cos(theta) * bulbRadius;
      points.push(new THREE.Vector2(x, y));
    }
    const taperSegments = 10;
    for (let i = 1; i <= taperSegments; i++) {
      const t = i / taperSegments;
      const y = bulbHeight * 0.38 - t * (bulbHeight * 0.62);
      const factor = 1 - 0.58 * (0.5 - 0.5 * Math.cos(t * Math.PI));
      const x = bulbRadius * factor;
      points.push(new THREE.Vector2(x, y));
    }
    points.push(new THREE.Vector2(bulbRadius * 0.42, -bulbHeight * 0.28));
    points.push(new THREE.Vector2(bulbRadius * 0.40, -bulbHeight * 0.42));
    points.push(new THREE.Vector2(0, -bulbHeight * 0.42));
  }

  const bulbGeo = new THREE.LatheGeometry(points, 32);

  const bulbMat = new THREE.MeshPhysicalMaterial({
    color: isLampOn ? new THREE.Color(0xfffdf6) : new THREE.Color(0xf6f9fc),
    emissive: isLampOn ? new THREE.Color(0xffebd2) : new THREE.Color(0x000000),
    emissiveIntensity: isLampOn ? 0.92 : 0,
    roughness: isLampOn ? 0.16 : 0.22,
    transmission: 0.14,
    transparent: true,
    opacity: 0.93,
    metalness: 0.02,
  });

  const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);

  // Screw socket base (warm brass socket)
  const baseRadius = isCandelabra ? bulbRadius * 0.42 : bulbRadius * 0.38;
  const baseHeight = bulbHeight * (isCandelabra ? 0.22 : 0.24);
  const baseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius * 0.96, baseHeight, 24);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // Polished brass screw thread
    metalness: 0.82,
    roughness: 0.24,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  const bulbBaseY = isCandelabra ? -bulbHeight * 0.44 : -bulbHeight * 0.42;
  baseMesh.position.y = bulbBaseY - baseHeight / 2;
  bulbMesh.add(baseMesh);

  // Ceramic black contact foot
  const footGeo = new THREE.CylinderGeometry(baseRadius * 0.68, baseRadius * 0.35, 0.06, 16);
  const footMat = new THREE.MeshStandardMaterial({
    color: 0x1e2022,
    roughness: 0.88,
    metalness: 0.1,
  });
  const footMesh = new THREE.Mesh(footGeo, footMat);
  footMesh.position.y = baseMesh.position.y - baseHeight / 2 - 0.03;
  bulbMesh.add(footMesh);

  // Glowing Incandescent Tungsten Filament Loop inside bulb
  let filamentMesh = null;
  const filamentRadius = bulbRadius * (isCandelabra ? 0.22 : 0.28);
  const filamentTopY = bulbHeight * (isCandelabra ? 0.26 : 0.22);
  const filamentCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-filamentRadius, -bulbHeight * 0.04, 0),
    new THREE.Vector3(-filamentRadius * 0.5, filamentTopY * 0.75, 0),
    new THREE.Vector3(0, filamentTopY, 0),
    new THREE.Vector3(filamentRadius * 0.5, filamentTopY * 0.75, 0),
    new THREE.Vector3(filamentRadius, -bulbHeight * 0.04, 0),
  ]);
  const filamentGeo = new THREE.TubeGeometry(filamentCurve, 20, 0.014, 8, false);
  const filamentMat = new THREE.MeshBasicMaterial({
    color: 0xfff5a5,
    transparent: true,
    opacity: isLampOn ? 1.0 : 0.0,
  });
  filamentMesh = new THREE.Mesh(filamentGeo, filamentMat);
  bulbMesh.add(filamentMesh);

  // Fine nickel support wires leading from glass mount
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
  const wireGeo = new THREE.CylinderGeometry(0.01, 0.01, bulbHeight * 0.26, 8);
  const wire1 = new THREE.Mesh(wireGeo, wireMat);
  wire1.position.set(-filamentRadius, -bulbHeight * 0.15, 0);
  bulbMesh.add(wire1);

  const wire2 = new THREE.Mesh(wireGeo, wireMat);
  wire2.position.set(filamentRadius, -bulbHeight * 0.15, 0);
  bulbMesh.add(wire2);

  return { bulbMesh, bulbMat, filamentMesh };
}

export default function Lampshade3DViewer({
  topDiameter = 8,
  bottomDiameter = 14,
  height = 10,
  coveringName = 'Natural Linen',
  coveringImageUrl = '',
  attachmentStyle = 'Washer',
  onLightToggle,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const shadeGroupRef = useRef(null);
  const internalLightRef = useRef(null);
  const downwardLightRef = useRef(null);
  const lightPoolRef = useRef(null);
  const innerMatRef = useRef(null);
  const internalBulbRef = useRef(null);
  const filamentMeshRef = useRef(null);
  const outerMatRef = useRef(null);
  const seamMatRef = useRef(null);
  const trimMatRef = useRef(null);
  const animFrameRef = useRef(null);
  const needsRenderRef = useRef(true);

  // Camera & view preservation across variant changes
  const isCameraInitializedRef = useRef(false);
  const prevRadiusRef = useRef(null);

  const ambientLightRef = useRef(null);
  const keyLightRef = useRef(null);
  const fillLightRef = useRef(null);

  const [isLampOn, setIsLampOn] = useState(true);
  const isLampOnRef = useRef(true);
  const [isRotating, setIsRotating] = useState(true);
  const isRotatingRef = useRef(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textureLoading, setTextureLoading] = useState(false);

  // AR Try-On State
  const [arModalOpen, setArModalOpen] = useState(false);
  const [arLoading, setArLoading] = useState(false);
  const [arStatusText, setArStatusText] = useState('');
  const [arError, setArError] = useState(null);
  const [arPlacement, setArPlacement] = useState('shade'); // 'shade' | 'table_lamp'
  const [copiedLink, setCopiedLink] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({ isMobile: false, isIOS: false, isAndroid: false });

  useEffect(() => {
    setDeviceInfo(getDeviceInfo());
  }, []);

  // Keep isRotatingRef in sync with React state
  useEffect(() => {
    isRotatingRef.current = isRotating;
    if (isRotating) {
      needsRenderRef.current = true;
    }
  }, [isRotating]);

  // Safe numeric dimensions in real inches
  const numTop = Math.max(1, parseFloat(topDiameter) || 8);
  const numBottom = Math.max(1, parseFloat(bottomDiameter) || 14);
  const numHeight = Math.max(1, parseFloat(height) || 10);

  // ── OFF-SCREEN DIRECTIONAL PRODUCT INDICATOR ──
  const [isOffScreen, setIsOffScreen] = useState(false);
  const isOffScreenRef = useRef(false);
  const offScreenIndicatorRef = useRef(null);
  const offScreenPosRef = useRef({ x: 0, y: 0, angleDeg: 0 });

  const updateOffScreenIndicator = useCallback(() => {
    const camera = cameraRef.current;
    const group = shadeGroupRef.current;
    const container = mountRef.current;
    if (!camera || !group || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());

    // 1. Frustum intersection check
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(projScreenMatrix);

    const isInFrustum = frustum.intersectsSphere(sphere);

    // 2. Project center to NDC
    const centerWorld = sphere.center.clone();
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    const toCenter = centerWorld.clone().sub(camera.position);
    const isBehind = cameraDir.dot(toCenter) <= 0;

    const ndc = centerWorld.clone().project(camera);

    // Visible if inside frustum, in front of camera, and within 85% of screen
    const isVisible = isInFrustum && !isBehind && Math.abs(ndc.x) <= 0.85 && Math.abs(ndc.y) <= 0.85;

    if (isVisible) {
      if (isOffScreenRef.current) {
        isOffScreenRef.current = false;
        setIsOffScreen(false);
      }
      return;
    }

    if (!isOffScreenRef.current) {
      isOffScreenRef.current = true;
      setIsOffScreen(true);
    }

    // Direction vector from screen center to off-screen product
    let dx = ndc.x;
    let dy = -ndc.y; // CSS top is inverted from NDC Y

    if (isBehind) {
      dx = -dx;
      dy = -dy;
    }

    const len = Math.hypot(dx, dy);
    if (len < 0.0001) {
      dx = 0;
      dy = -1;
    } else {
      dx /= len;
      dy /= len;
    }

    // Angle in degrees where 0 deg = pointing right
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Clamp indicator to perimeter margin of the viewer
    const padX = 72;
    const padY = 56;
    const halfW = Math.max(20, width / 2 - padX);
    const halfH = Math.max(20, height / 2 - padY);

    let edgeX = 0;
    let edgeY = 0;

    if (Math.abs(dx) * halfH > Math.abs(dy) * halfW) {
      edgeX = Math.sign(dx) * halfW;
      edgeY = (dy / Math.abs(dx)) * halfW;
    } else {
      edgeY = Math.sign(dy) * halfH;
      edgeX = (dx / Math.abs(dy)) * halfH;
    }

    const screenX = width / 2 + edgeX;
    const screenY = height / 2 + edgeY;

    offScreenPosRef.current = { x: screenX, y: screenY, angleDeg };

    if (offScreenIndicatorRef.current) {
      offScreenIndicatorRef.current.style.left = `${screenX}px`;
      offScreenIndicatorRef.current.style.top = `${screenY}px`;
      const arrowEl = offScreenIndicatorRef.current.querySelector('.indicator-arrow');
      if (arrowEl) {
        arrowEl.style.transform = `rotate(${angleDeg + 90}deg)`;
      }
    }
  }, []);

  // Update DOM position immediately when indicator appears
  useEffect(() => {
    if (isOffScreen && offScreenIndicatorRef.current) {
      const { x, y, angleDeg } = offScreenPosRef.current;
      offScreenIndicatorRef.current.style.left = `${x}px`;
      offScreenIndicatorRef.current.style.top = `${y}px`;
      const arrowEl = offScreenIndicatorRef.current.querySelector('.indicator-arrow');
      if (arrowEl) {
        arrowEl.style.transform = `rotate(${angleDeg + 90}deg)`;
      }
    }
  }, [isOffScreen]);

  // Trigger render frame on demand
  const requestFrame = useCallback(() => {
    needsRenderRef.current = true;
  }, []);

  // 1. Initialize Scene & WebGL Renderer
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 440;

    // SCENE
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf8fafc); // Clean neutral studio background

    // CAMERA (40° portrait lens avoids fisheye distortion)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(16, 12, 20);
    cameraRef.current = camera;

    // RENDERER (Antialiased + color managed)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment map for authentic metal reflections and illumination
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    // ORBIT CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.88; // Don't flip underneath table
    controls.minDistance = 3;
    controls.maxDistance = 50;
    const handleControlsChange = () => {
      requestFrame();
      updateOffScreenIndicator();
    };
    controls.addEventListener('change', handleControlsChange);
    // Pause auto-rotation when user interacts with shade so it stays where placed
    controls.addEventListener('start', () => {
      isRotatingRef.current = false;
      setIsRotating(false);
    });
    controlsRef.current = controls;

    // ── STUDIO LIGHTING RIG ──
    // Ambient Light (soft fill)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // Key Light (warm directional, front-right)
    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.6);
    keyLight.position.set(12, 18, 14);
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    // Fill Light (cool directional, back-left for soft depth)
    const fillLight = new THREE.DirectionalLight(0xe8f0fe, 0.7);
    fillLight.position.set(-14, 8, -10);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    // Lampshade Group
    const shadeGroup = new THREE.Group();
    scene.add(shadeGroup);
    shadeGroupRef.current = shadeGroup;

    if (typeof window !== 'undefined') {
      window.__lampshadeViewer = {
        camera,
        controls,
        requestFrame,
        group: shadeGroup,
        getState: () => ({
          cameraPos: camera ? [camera.position.x, camera.position.y, camera.position.z] : null,
          controlsTarget: controls ? [controls.target.x, controls.target.y, controls.target.z] : null,
          groupRotY: shadeGroup ? shadeGroup.rotation.y : 0,
          isRotating: isRotatingRef.current,
        }),
        setIsRotating: (val) => {
          const next = !!val;
          isRotatingRef.current = next;
          setIsRotating(next);
          if (next) needsRenderRef.current = true;
          requestFrame();
        },
        setCamera: (x, y, z) => {
          camera.position.set(x, y, z);
          controls.update();
          requestFrame();
          updateOffScreenIndicator();
        }
      };
    }

    // ── RENDER LOOP (Demanded or Auto-Rotating) ──
    let isMounted = true;
    const animate = () => {
      if (!isMounted) return;
      animFrameRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (isRotatingRef.current && shadeGroupRef.current) {
        shadeGroupRef.current.rotation.y += 0.005;
        needsRenderRef.current = true;
      }

      updateOffScreenIndicator();

      if (needsRenderRef.current && rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        needsRenderRef.current = false;
      }
    };
    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
          requestFrame();
          updateOffScreenIndicator();
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      pmremGenerator.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.innerHTML = '';
      }
    };
  }, []); // Run once on mount

  // Apply visual lighting state (Daylight Studio vs. Warm Evening Room)
  const applyLightingState = useCallback((isLit) => {
    isLampOnRef.current = isLit;
    const scene = sceneRef.current;
    if (!scene) return;

    // 1. Atmosphere Transition: Crisp Daytime Studio vs. Rich Warm Evening Room
    if (isLit) {
      scene.background = new THREE.Color(0x131722); // Elegant deep twilight evening atmosphere
      if (ambientLightRef.current) ambientLightRef.current.intensity = 0.22;
      if (keyLightRef.current) keyLightRef.current.intensity = 0.35;
      if (fillLightRef.current) fillLightRef.current.intensity = 0.18;
    } else {
      scene.background = new THREE.Color(0xf8fafc); // Crisp daytime photography studio
      if (ambientLightRef.current) ambientLightRef.current.intensity = 0.75;
      if (keyLightRef.current) keyLightRef.current.intensity = 1.6;
      if (fillLightRef.current) fillLightRef.current.intensity = 0.70;
    }

    // 2. Point Lights inside and beneath the shade
    if (internalLightRef.current) {
      internalLightRef.current.intensity = isLit ? 5.5 : 0;
      internalLightRef.current.color.set(0xffaa44);
    }
    if (downwardLightRef.current) {
      downwardLightRef.current.intensity = isLit ? 3.6 : 0;
      downwardLightRef.current.color.set(0xffeedd);
    }

    // 3. Ground Light Pool Spill on Tabletop
    if (lightPoolRef.current?.material) {
      lightPoolRef.current.material.opacity = isLit ? 0.90 : 0.0;
      lightPoolRef.current.visible = isLit;
    }

    // 4. Light Bulb Envelope & Tungsten Filament
    if (internalBulbRef.current?.material) {
      internalBulbRef.current.material.color.set(isLit ? 0xfffdf6 : 0xf1f5f9);
      internalBulbRef.current.material.emissive.set(isLit ? 0xffe6b0 : 0x000000);
      internalBulbRef.current.material.emissiveIntensity = isLit ? 3.2 : 0;
    }
    if (filamentMeshRef.current?.material) {
      filamentMeshRef.current.material.color.set(isLit ? 0xffffff : 0x444444);
      filamentMeshRef.current.material.opacity = isLit ? 1.0 : 0.05;
    }

    // 5. Outer Fabric Backlit Glow from Within (Glowing Weave)
    const baseColor = getCoveringColor(coveringName);
    const isDark = /black|charcoal|dark|navy/i.test(coveringName);
    const isNatural = /natural|tan|burlap|kraft/i.test(coveringName) && !isDark && !/white/i.test(coveringName);

    const updateFabricMaterial = (mat) => {
      if (!mat) return;
      if (isLit) {
        if (isDark) {
          mat.emissive = new THREE.Color(0x3a2512); // Subtle warm amber rim bleed
          mat.emissiveIntensity = 0.25;
        } else if (isNatural) {
          mat.emissive = new THREE.Color(0xf59e0b); // Rich warm amber honey glow
          mat.emissiveIntensity = 1.25;
        } else {
          mat.emissive = new THREE.Color(0xffbe76); // Radiant warm incandescent white
          mat.emissiveIntensity = 1.35;
        }
        // Set emissiveMap to diffuse texture so physical fabric threads glow from within!
        if (mat.map) {
          mat.emissiveMap = mat.map;
        }
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
        mat.emissiveMap = null;
      }
      mat.needsUpdate = true;
    };

    updateFabricMaterial(outerMatRef.current);
    updateFabricMaterial(seamMatRef.current);

    // 6. Inner Liner (White styrene / paper lining inside shade)
    if (innerMatRef.current) {
      innerMatRef.current.color.set(isLit ? new THREE.Color(0xfffaec) : new THREE.Color(0xf8fafc));
      innerMatRef.current.emissive.set(isLit ? new THREE.Color(0xffeedd) : new THREE.Color(0x000000));
      innerMatRef.current.emissiveIntensity = isLit ? 1.0 : 0;
      innerMatRef.current.needsUpdate = true;
    }

    // 7. Trim Tape
    if (trimMatRef.current) {
      if (isLit) {
        trimMatRef.current.emissive = isDark
          ? new THREE.Color(0x22140a)
          : new THREE.Color(0xd4a373);
        trimMatRef.current.emissiveIntensity = isDark ? 0.12 : 0.45;
      } else {
        trimMatRef.current.emissive = new THREE.Color(0x000000);
        trimMatRef.current.emissiveIntensity = 0;
      }
      trimMatRef.current.needsUpdate = true;
    }

    needsRenderRef.current = true;
    requestFrame();
  }, [coveringName, requestFrame]);

  // 2. Build & Update Parametric Lampshade Geometry & Textures
  useEffect(() => {
    const scene = sceneRef.current;
    const group = shadeGroupRef.current;
    if (!scene || !group) return;

    // Clear old children from shade group
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
      group.remove(child);
    }

    const rTop = numTop / 2;
    const rBottom = numBottom / 2;
    const h = numHeight;
    const baseColor = getCoveringColor(coveringName);
    const isDark = /black|charcoal|dark|navy/i.test(coveringName);
    const isNatural = /natural|tan|burlap|kraft/i.test(coveringName) && !isDark && !/white/i.test(coveringName);

    // ── A. OUTER FABRIC SHELL ──
    const outerGeo = new THREE.CylinderGeometry(rTop, rBottom, h, 96, 1, true);

    const maxAnisotropy = rendererRef.current?.capabilities?.getMaxAnisotropy?.() || 8;
    const { diffuseTexture: procDiff, bumpTexture: procBump } = createFabricTexture(baseColor, coveringName, maxAnisotropy);

    const outerMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xffffff),
      map: procDiff,
      bumpMap: procBump,
      bumpScale: isDark ? 0.035 : 0.045,
      roughness: isDark ? 0.94 : 0.88,
      metalness: 0.0,
      sheen: 0.78,
      sheenRoughness: 0.45,
      sheenColor: isDark ? new THREE.Color(0x777777) : (isNatural ? new THREE.Color(0xf6e5cb) : new THREE.Color(0xfff6ea)),
      side: THREE.FrontSide,
    });
    if (isLampOn) {
      if (isDark) {
        outerMat.emissive = new THREE.Color(0x101010);
        outerMat.emissiveIntensity = 0.04;
      } else if (isNatural) {
        outerMat.emissive = new THREE.Color(0xd4a373);
        outerMat.emissiveIntensity = 0.35;
      } else {
        outerMat.emissive = new THREE.Color(0xffedd5);
        outerMat.emissiveIntensity = 0.38;
      }
    } else {
      outerMat.emissive = new THREE.Color(0x000000);
      outerMat.emissiveIntensity = 0;
    }
    outerMatRef.current = outerMat;

    // Authentic handcrafted overlapped glue seam at the back (PI angle)
    const seamMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xffffff),
      map: procDiff,
      bumpMap: procBump,
      bumpScale: isDark ? 0.035 : 0.045,
      roughness: isDark ? 0.94 : 0.88,
      metalness: 0.0,
      sheen: 0.78,
      sheenRoughness: 0.45,
      sheenColor: isDark ? new THREE.Color(0x777777) : (isNatural ? new THREE.Color(0xf6e5cb) : new THREE.Color(0xfff6ea)),
      side: THREE.FrontSide,
    });
    if (isLampOn) {
      if (isDark) {
        seamMat.emissive = new THREE.Color(0x101010);
        seamMat.emissiveIntensity = 0.04;
      } else if (isNatural) {
        seamMat.emissive = new THREE.Color(0xd4a373);
        seamMat.emissiveIntensity = 0.35;
      } else {
        seamMat.emissive = new THREE.Color(0xffedd5);
        seamMat.emissiveIntensity = 0.38;
      }
    } else {
      seamMat.emissive = new THREE.Color(0x000000);
      seamMat.emissiveIntensity = 0;
    }
    seamMatRef.current = seamMat;

    // ── C. TOP & BOTTOM ROLLED TRIM RIMS ──
    // Authentic fabric-wrapped bias binding tape matching the shade material
    const trimMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? new THREE.Color(0x1a1a1c) : new THREE.Color(baseColor).multiplyScalar(0.96),
      map: procDiff,
      bumpMap: procBump,
      bumpScale: 0.03,
      roughness: 0.92,
      metalness: 0.0,
      sheen: 0.72,
      sheenRoughness: 0.48,
      sheenColor: isDark ? new THREE.Color(0x666666) : new THREE.Color(baseColor),
    });
    if (isLampOn) {
      trimMat.emissive = isDark ? new THREE.Color(0x050505) : new THREE.Color(baseColor).lerp(new THREE.Color(0xffeedd), 0.2);
      trimMat.emissiveIntensity = isDark ? 0.03 : 0.22;
    } else {
      trimMat.emissive = new THREE.Color(0x000000);
      trimMat.emissiveIntensity = 0;
    }
    trimMatRef.current = trimMat;

    // If an uploaded fabric swatch image or catalog covering exists, load and wrap it smoothly with bump map
    if (coveringImageUrl || coveringName) {
      setTextureLoading(true);
      const resolvedUrl = resolveImageUrl(coveringImageUrl || '');
      loadCleanFabricTexture(
        resolvedUrl,
        coveringName,
        rTop,
        rBottom,
        h,
        maxAnisotropy,
        ({ diffuseTexture, bumpTexture }) => {
          outerMat.map = diffuseTexture;
          outerMat.color.set(isDark ? 0x222222 : 0xffffff);
          if (bumpTexture) {
            outerMat.bumpMap = bumpTexture;
            outerMat.bumpScale = isDark ? 0.035 : 0.045;
          }
          if (isLampOnRef.current) {
            outerMat.emissiveMap = diffuseTexture;
          }
          outerMat.needsUpdate = true;

          if (seamMatRef.current) {
            seamMatRef.current.map = diffuseTexture;
            seamMatRef.current.color.set(isDark ? 0x222222 : 0xffffff);
            if (bumpTexture) {
              seamMatRef.current.bumpMap = bumpTexture;
              seamMatRef.current.bumpScale = isDark ? 0.035 : 0.045;
            }
            if (isLampOnRef.current) {
              seamMatRef.current.emissiveMap = diffuseTexture;
            }
            seamMatRef.current.needsUpdate = true;
          }

          if (trimMatRef.current) {
            trimMatRef.current.map = diffuseTexture;
            trimMatRef.current.color.set(isDark ? 0x222222 : 0xffffff);
            if (bumpTexture) {
              trimMatRef.current.bumpMap = bumpTexture;
              trimMatRef.current.bumpScale = 0.03;
            }
            trimMatRef.current.needsUpdate = true;
          }

          setTextureLoading(false);
          requestFrame();
        },
        (err) => {
          console.warn('Fabric image texture load fallback:', err);
          setTextureLoading(false);
        }
      );
    }

    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    group.add(outerMesh);

    // Overlapped vertical seam strip on the back (at Math.PI)
    const seamWidth = 0.38; // 0.38" overlap width
    const seamTheta = Math.min(0.08, seamWidth / rBottom);
    const seamGeo = new THREE.CylinderGeometry(
      rTop + 0.006,
      rBottom + 0.006,
      h,
      8,
      1,
      true,
      Math.PI - seamTheta / 2,
      seamTheta
    );
    const seamMesh = new THREE.Mesh(seamGeo, seamMat);
    group.add(seamMesh);

    // ── B. INNER STYRENE / METALLIC LINING ──
    const innerGeo = new THREE.CylinderGeometry(rTop - 0.035, rBottom - 0.035, h - 0.02, 96, 1, true);
    const innerMat = new THREE.MeshStandardMaterial({
      color: isLampOn ? new THREE.Color(0xfff6e8) : new THREE.Color(0xf1f5f9),
      emissive: isLampOn ? new THREE.Color(0xffeedd) : new THREE.Color(0x000000),
      emissiveIntensity: isLampOn ? 0.45 : 0,
      roughness: 0.45,
      metalness: 0.05,
      side: THREE.BackSide,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerMesh);
    innerMatRef.current = innerMat;

    // ── GROUND TABLETOP CONTACT SHADOW & DOWNWARD LIGHT POOL ──
    const contactShadowTex = createContactShadowTexture();
    if (contactShadowTex) {
      const shadowSize = rBottom * 2.85;
      const shadowGeo = new THREE.PlaneGeometry(shadowSize, shadowSize);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -h / 2 - 0.006;
      group.add(shadowMesh);
    }

    const lightPoolTex = createLightPoolTexture();
    if (lightPoolTex) {
      const poolSize = rBottom * 3.4;
      const poolGeo = new THREE.PlaneGeometry(poolSize, poolSize);
      const poolMat = new THREE.MeshBasicMaterial({
        map: lightPoolTex,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: isLampOn ? 0.65 : 0.0,
        depthWrite: false,
      });
      const poolMesh = new THREE.Mesh(poolGeo, poolMat);
      poolMesh.rotation.x = -Math.PI / 2;
      poolMesh.position.y = -h / 2 - 0.004;
      group.add(poolMesh);
      lightPoolRef.current = poolMesh;
    }

    // Downward warm light shining through bottom opening onto tabletop
    const downwardLight = new THREE.PointLight(0xffeedd, isLampOn ? 1.6 : 0, 30, 1.4);
    downwardLight.position.set(0, -h / 2 + 0.25, 0);
    group.add(downwardLight);
    downwardLightRef.current = downwardLight;

    const topTrimGeo = new THREE.TorusGeometry(rTop, 0.042, 16, 96);
    const topTrim = new THREE.Mesh(topTrimGeo, trimMat);
    topTrim.rotation.x = Math.PI / 2;
    topTrim.position.y = h / 2;
    group.add(topTrim);

    const bottomTrimGeo = new THREE.TorusGeometry(rBottom, 0.048, 16, 96);
    const bottomTrim = new THREE.Mesh(bottomTrimGeo, trimMat);
    bottomTrim.rotation.x = Math.PI / 2;
    bottomTrim.position.y = -h / 2;
    group.add(bottomTrim);

    // ── D. HARDWARE FITTER (AUTHENTIC GOLDEN BRASS FRAME) ──
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Polished warm brass / golden frame
      metalness: 0.85,
      roughness: 0.22,
    });

    const isClipOn = String(attachmentStyle).toLowerCase().includes('bulb') || String(attachmentStyle).toLowerCase().includes('clip');

    if (isClipOn) {
      // ═════════════════════════════════════════════════════════════════════════
      // BULB CLIP-ON FITTER (AUTHENTIC GOLDEN BRASS SPRING WIRE CLIP)
      // ═════════════════════════════════════════════════════════════════════════
      const isSmallShade = rTop <= 2.2; // Top diameter <= 4.4" (chandelier / sconce shade)
      const bulbRadius = isSmallShade
        ? Math.min(0.44, Math.max(0.26, rTop * 0.36))
        : Math.min(0.82, Math.max(0.45, rTop * 0.35));
      const bulbHeight = isSmallShade ? bulbRadius * 3.1 : bulbRadius * 2.25;

      const armDrop = Math.min(0.65, Math.max(0.22, h * 0.14));
      const clipTopY = h / 2 - armDrop;
      const bulbCenterY = clipTopY - (isSmallShade ? bulbHeight * 0.34 : bulbHeight * 0.38);

      const wireR = 0.02; // Fine authentic lampshade wire gauge (10-gauge steel)

      // 1. Two straight top support struts welded to top wire ring in golden brass
      const armCurve1 = new THREE.LineCurve3(
        new THREE.Vector3(-rTop + 0.04, h / 2, 0),
        new THREE.Vector3(-0.065, clipTopY, 0)
      );
      const armTubeGeo1 = new THREE.TubeGeometry(armCurve1, 4, wireR, 8, false);
      group.add(new THREE.Mesh(armTubeGeo1, brassMat));

      const armCurve2 = new THREE.LineCurve3(
        new THREE.Vector3(rTop - 0.04, h / 2, 0),
        new THREE.Vector3(0.065, clipTopY, 0)
      );
      const armTubeGeo2 = new THREE.TubeGeometry(armCurve2, 4, wireR, 8, false);
      group.add(new THREE.Mesh(armTubeGeo2, brassMat));

      // 2. Central Wire Saddle Ring in golden brass
      const saddleGeo = new THREE.TorusGeometry(0.065, wireR, 8, 20);
      const saddleMesh = new THREE.Mesh(saddleGeo, brassMat);
      saddleMesh.rotation.x = Math.PI / 2;
      saddleMesh.position.set(0, clipTopY, 0);
      group.add(saddleMesh);

      // 3. Two Vertical Spring Steel Clip Loops (Front +Z and Back -Z) in golden brass
      const xHalf = bulbRadius * 0.36; // Narrow lateral width so loops hug bulb sides
      const zHug = bulbRadius * 1.05;  // Snug contact against bulb glass profile
      const loopBottomY = bulbCenterY - bulbHeight * 0.16;
      const loopMidY = bulbCenterY + bulbHeight * 0.06;

      const createClipLoop = (zSign) => {
        const z = zSign * zHug;
        const curvePts = [
          new THREE.Vector3(-0.05, clipTopY, zSign * 0.05),
          new THREE.Vector3(-xHalf, clipTopY - (clipTopY - loopMidY) * 0.5, z * 0.82),
          new THREE.Vector3(-xHalf, loopMidY, z),
          new THREE.Vector3(-xHalf * 0.72, loopBottomY, z * 0.94),
          new THREE.Vector3(0, loopBottomY - 0.04, z * 0.90),
          new THREE.Vector3(xHalf * 0.72, loopBottomY, z * 0.94),
          new THREE.Vector3(xHalf, loopMidY, z),
          new THREE.Vector3(xHalf, clipTopY - (clipTopY - loopMidY) * 0.5, z * 0.82),
          new THREE.Vector3(0.05, clipTopY, zSign * 0.05),
        ];
        const curve = new THREE.CatmullRomCurve3(curvePts, true);
        const tubeGeo = new THREE.TubeGeometry(curve, 36, wireR, 8, true);
        return new THREE.Mesh(tubeGeo, brassMat);
      };

      group.add(createClipLoop(1));
      group.add(createClipLoop(-1));

      // 4. Authentic Light Bulb (Candelabra flame for small shades, A19 for larger shades)
      const { bulbMesh, filamentMesh } = createLightBulbMesh(bulbRadius, bulbHeight, isLampOn, isSmallShade);
      bulbMesh.position.set(0, bulbCenterY, 0);
      group.add(bulbMesh);
      internalBulbRef.current = bulbMesh;
      filamentMeshRef.current = filamentMesh;

      // 5. Warm Point Light centered at bulb filament
      const internalLight = new THREE.PointLight(0xffedd5, isLampOn ? 2.4 : 0, 40, 1.2);
      internalLight.position.set(0, bulbCenterY + bulbHeight * 0.16, 0);
      group.add(internalLight);
      internalLightRef.current = internalLight;

    } else {
      // ═════════════════════════════════════════════════════════════════════════
      // WASHER / SPIDER FITTER (AUTHENTIC POLISHED BRASS THREADED COLLAR & 3 SPOKES)
      // ═════════════════════════════════════════════════════════════════════════

      // 1. Central Brass Threaded Collar
      const collarOuterR = 0.46;
      const collarInnerR = 0.22;
      const collarHeight = 0.2;
      const spiderDrop = 0.5; // Standard 0.5" recessed spider drop
      const collarY = h / 2 - spiderDrop;

      const washerShape = new THREE.Shape();
      washerShape.absarc(0, 0, collarOuterR, 0, Math.PI * 2, false);
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, collarInnerR, 0, Math.PI * 2, true);
      washerShape.holes.push(holePath);

      const extrudeSettings = { depth: collarHeight, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
      const collarGeo = new THREE.ExtrudeGeometry(washerShape, extrudeSettings);
      const collarMesh = new THREE.Mesh(collarGeo, brassMat);
      collarMesh.rotation.x = Math.PI / 2;
      collarMesh.position.set(0, collarY + collarHeight / 2, 0);
      group.add(collarMesh);

      // 2. 3 Radial Spokes with realistic upward bend to top rim wire
      const spokeCount = 3;
      for (let i = 0; i < spokeCount; i++) {
        const angle = (i * 2 * Math.PI) / spokeCount;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Path from collar edge -> bent up to top rim
        const p1 = new THREE.Vector3(cos * (collarOuterR + 0.02), collarY, sin * (collarOuterR + 0.02));
        const p2 = new THREE.Vector3(cos * (rTop - 0.35), collarY, sin * (rTop - 0.35));
        const p3 = new THREE.Vector3(cos * rTop, h / 2, sin * rTop);

        const spokeCurve = new THREE.CatmullRomCurve3([p1, p2, p3]);
        const spokeTubeGeo = new THREE.TubeGeometry(spokeCurve, 24, 0.038, 8, false);
        const spokeMesh = new THREE.Mesh(spokeTubeGeo, brassMat);
        group.add(spokeMesh);
      }

      // 3. Authentic A19 Light Bulb sitting beneath the spider collar
      const bulbRadius = Math.min(1.0, Math.max(0.52, rTop * 0.48));
      const bulbHeight = bulbRadius * 2.3;
      const bulbCenterY = collarY - 0.45 - bulbRadius;

      const isSmallShade = rTop <= 2.2;
      const { bulbMesh, filamentMesh } = createLightBulbMesh(bulbRadius, bulbHeight, isLampOn, isSmallShade);
      bulbMesh.position.set(0, bulbCenterY, 0);
      group.add(bulbMesh);
      internalBulbRef.current = bulbMesh;
      filamentMeshRef.current = filamentMesh;

      // 4. Brass Harp Wire Frame supporting the socket under the collar
      const harpCurve1 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, collarY - 0.04, 0),
        new THREE.Vector3(bulbRadius * 1.3, bulbCenterY, 0),
        new THREE.Vector3(0, bulbCenterY - bulbHeight * 0.65, 0),
      ]);
      const harpTubeGeo1 = new THREE.TubeGeometry(harpCurve1, 24, 0.032, 8, false);
      group.add(new THREE.Mesh(harpTubeGeo1, brassMat));

      const harpCurve2 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, collarY - 0.04, 0),
        new THREE.Vector3(-bulbRadius * 1.3, bulbCenterY, 0),
        new THREE.Vector3(0, bulbCenterY - bulbHeight * 0.65, 0),
      ]);
      const harpTubeGeo2 = new THREE.TubeGeometry(harpCurve2, 24, 0.032, 8, false);
      group.add(new THREE.Mesh(harpTubeGeo2, brassMat));

      // 5. Warm Point Light centered in the glowing bulb
      const internalLight = new THREE.PointLight(0xffedd5, isLampOn ? 2.4 : 0, 40, 1.2);
      internalLight.position.set(0, bulbCenterY + bulbHeight * 0.2, 0);
      group.add(internalLight);
      internalLightRef.current = internalLight;
    }

    // ── F. AUTO-FIT CAMERA TO EXACT BOUNDING SPHERE ──
    // Perfectly frames shade size on initial mount; preserves view on variant changes
    const box = new THREE.Box3().setFromObject(group);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (camera && controls) {
      const fovRad = (camera.fov * Math.PI) / 180;
      // Fit sphere comfortably in viewport with 22% padding
      const idealDist = (sphere.radius / Math.sin(fovRad / 2)) * 1.22;

      if (!isCameraInitializedRef.current) {
        // Initial Mount: Position camera at appealing 3/4 beauty product angle with clear view into top opening
        camera.position.set(idealDist * 0.65, idealDist * 0.58, idealDist * 0.88);
        controls.target.set(0, 0, 0);
        isCameraInitializedRef.current = true;
      } else {
        // Variant change (covering, attachment, or dimensions): PRESERVE user's camera angle and position!
        const prevRad = prevRadiusRef.current || sphere.radius;
        // If dimensions change significantly (> 0.08"), adapt distance proportionally along existing viewing vector
        if (Math.abs(sphere.radius - prevRad) > 0.08 && prevRad > 0.001) {
          const dir = camera.position.clone().sub(controls.target);
          const curDist = dir.length();
          if (curDist > 0.001) {
            dir.normalize();
            const newDist = (curDist / prevRad) * sphere.radius;
            camera.position.copy(controls.target).addScaledVector(dir, newDist);
          }
        }
      }

      prevRadiusRef.current = sphere.radius;
      controls.minDistance = idealDist * 0.4;
      controls.maxDistance = idealDist * 3.0;
      controls.update();
    }

    // Apply active lighting state (Daylight Studio vs. Evening Glow) to all materials and lights
    applyLightingState(isLampOnRef.current);
    requestFrame();
  }, [numTop, numBottom, numHeight, coveringName, coveringImageUrl, attachmentStyle, requestFrame, applyLightingState]);

  // Handle Lamp Light Toggle
  const handleToggleLight = () => {
    const next = !isLampOn;
    setIsLampOn(next);
    applyLightingState(next);
    onLightToggle?.(next);
  };

  // Reset Camera View
  const handleResetCamera = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const group = shadeGroupRef.current;
    if (!camera || !controls || !group) return;

    const box = new THREE.Box3().setFromObject(group);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const fovRad = (camera.fov * Math.PI) / 180;
    const idealDist = (sphere.radius / Math.sin(fovRad / 2)) * 1.22;

    camera.position.set(idealDist * 0.65, idealDist * 0.58, idealDist * 0.88);
    controls.target.set(0, 0, 0);
    controls.minDistance = idealDist * 0.4;
    controls.maxDistance = idealDist * 3.0;
    controls.update();
    if (group) group.rotation.set(0, 0, 0);
    prevRadiusRef.current = sphere.radius;
    requestFrame();
    updateOffScreenIndicator();
  };

  // Mobile AR URL for QR Code & Quick Sharing
  const getMobileARUrl = () => {
    if (typeof window === 'undefined') return '';
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('ar', '1');
      u.searchParams.set('top', String(numTop));
      u.searchParams.set('bottom', String(numBottom));
      u.searchParams.set('height', String(numHeight));
      if (coveringName) u.searchParams.set('covering', coveringName);
      if (coveringImageUrl) u.searchParams.set('coveringImg', coveringImageUrl);
      if (attachmentStyle) u.searchParams.set('attachment', attachmentStyle);
      if (isLampOn) u.searchParams.set('lamp', '1');
      if (arPlacement) u.searchParams.set('placement', arPlacement);
      return u.toString();
    } catch (e) {
      return '';
    }
  };

  // Copy mobile link to clipboard with visual confirmation
  const handleCopyLink = () => {
    const url = getMobileARUrl();
    if (!url) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2400);
      }).catch(() => {});
    }
  };

  // Launch Augmented Reality Try-On Session
  const handleLaunchAR = async (forceMobile = false, overridePlacement = null) => {
    const dev = getDeviceInfo();

    // If on Desktop and not forced -> open QR Code dialog
    if (!dev.isMobile && !forceMobile) {
      setArModalOpen(true);
      return;
    }

    const group = shadeGroupRef.current;
    if (!group) {
      setArError('3D model is still initializing. Please wait a moment.');
      return;
    }

    const activePlacement = overridePlacement || arPlacement;

    try {
      setArLoading(true);
      setArError(null);
      setArStatusText('Generating 1:1 real-scale 3D model...');

      // 1. Prepare clean AR scene scaled to true meters (1" = 0.0254m) with emissive glow & stand
      const arGroup = prepareARScene(group, {
        heightInInches: numHeight,
        isLampOn,
        arPlacement: activePlacement,
      });

      const productTitle = `${numTop}"×${numBottom}"×${numHeight}" Custom Lampshade`;
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

      if (dev.isIOS) {
        setArStatusText('Preparing Apple AR Quick Look...');
        const usdzBlob = await exportToUSDZ(arGroup);
        const blobUrl = URL.createObjectURL(usdzBlob);
        setArStatusText('Opening iOS Camera...');
        launchIOSQuickLook(blobUrl, {
          lockScale: true,
          callToAction: 'Order Custom Shade',
          checkoutTitle: productTitle,
          canonicalWebPageURL: currentUrl,
        });
      } else if (dev.isAndroid) {
        setArStatusText('Packaging model for Google Scene Viewer...');
        const glbBlob = await exportToGLB(arGroup);
        setArStatusText('Connecting to AR Camera...');
        const uploadResult = await uploadARModelToServer(glbBlob, 'glb');
        setArStatusText('Opening Camera...');
        launchAndroidSceneViewer(
          uploadResult.fullUrl,
          productTitle,
          currentUrl
        );
      } else {
        // Desktop test mode: directly download the GLB model
        setArStatusText('Downloading 3D model (.glb)...');
        const glbBlob = await exportToGLB(arGroup);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(glbBlob);
        link.download = `lampshade-${numTop}x${numBottom}x${numHeight}-${activePlacement}.glb`;
        link.click();
        setArStatusText('Downloaded!');
      }
    } catch (err) {
      console.error('AR Launch Error:', err);
      setArError(err.message || 'Unable to start camera AR session.');
    } finally {
      setTimeout(() => {
        setArLoading(false);
      }, 1800);
    }
  };

  // Auto-launch AR when user opens page via mobile QR code (?ar=1)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('ar') === '1' || params.get('ar') === 'true') {
      const placementParam = params.get('placement') || params.get('arPlacement');
      if (placementParam) {
        setArPlacement(placementParam);
      }
      const dev = getDeviceInfo();
      if (dev.isMobile) {
        const timer = setTimeout(() => {
          handleLaunchAR(true, placementParam);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: { xs: 340, sm: 400, md: 460 },
        bgcolor: isLampOn ? '#131722' : '#f8fafc',
        borderRadius: '12px',
        overflow: 'hidden',
        userSelect: 'none',
        transition: 'background-color 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* 3D WebGL Canvas Mount */}
      <Box
        ref={mountRef}
        sx={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
        }}
      />

      {/* Top Floating Badges */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        {/* Real Dimensions Spec Pill */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: isLampOn ? 'rgba(20, 24, 36, 0.88)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(8px)',
            border: isLampOn ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #e2e8f0',
            borderRadius: '20px',
            px: 1.5,
            py: 0.5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            pointerEvents: 'auto',
            transition: 'all 0.3s ease',
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: isLampOn ? '#f59e0b' : '#94a3b8',
              boxShadow: isLampOn ? '0 0 8px #f59e0b' : 'none',
              transition: 'all 0.3s ease',
            }}
          />
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: isLampOn ? '#f8fafc' : '#0f172a' }}>
            {numTop}&quot; Top × {numBottom}&quot; Bottom × {numHeight}&quot; Height
          </Typography>
        </Box>

        {/* Ambient Mood Status Badge & AR View Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            onClick={() => handleLaunchAR(false)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.6,
              bgcolor: '#0284c7',
              color: '#ffffff',
              borderRadius: '20px',
              px: 1.3,
              py: 0.45,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
              pointerEvents: 'auto',
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: '#0369a1', transform: 'scale(1.02)' },
            }}
          >
            {arLoading ? (
              <CircularProgress size={13} sx={{ color: '#fff' }} />
            ) : (
              <ViewInArIcon sx={{ fontSize: 15 }} />
            )}
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.02em' }}>
              {arLoading ? 'Loading AR...' : 'Try in Room'}
            </Typography>
          </Box>

          <Box
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              alignItems: 'center',
              gap: 0.75,
              bgcolor: isLampOn ? 'rgba(245, 158, 11, 0.16)' : 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(8px)',
              border: isLampOn ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid #e2e8f0',
              borderRadius: '20px',
              px: 1.25,
              py: 0.4,
              pointerEvents: 'auto',
              transition: 'all 0.3s ease',
            }}
          >
            <Typography
              sx={{
                fontSize: 10.5,
                fontWeight: 700,
                color: isLampOn ? '#fbbf24' : '#64748b',
                letterSpacing: '0.02em',
              }}
            >
              {isLampOn ? '🌙 Warm Light ON' : '☀️ Daylight Studio'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Floating Bottom Toolbar Controls */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.6, sm: 0.75 },
          bgcolor: isLampOn ? 'rgba(20, 24, 36, 0.92)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: isLampOn ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #e2e8f0',
          borderRadius: '30px',
          p: 0.5,
          boxShadow: isLampOn ? '0 4px 20px rgba(0, 0, 0, 0.35)' : '0 4px 16px rgba(15, 23, 42, 0.1)',
          zIndex: 2,
          maxWidth: 'calc(100% - 24px)',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Prominent AR Try in Your Room Button */}
        <Button
          variant="contained"
          size="small"
          onClick={() => handleLaunchAR(false)}
          disabled={arLoading}
          startIcon={
            arLoading ? (
              <CircularProgress size={14} sx={{ color: '#fff' }} />
            ) : (
              <ViewInArIcon sx={{ fontSize: 17 }} />
            )
          }
          sx={{
            bgcolor: '#0284c7',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: { xs: 11, sm: 12 },
            textTransform: 'none',
            borderRadius: '20px',
            px: { xs: 1.4, sm: 1.8 },
            py: 0.45,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 10px rgba(2, 132, 199, 0.45)',
            '&:hover': {
              bgcolor: '#0369a1',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.6)',
            },
          }}
        >
          {arLoading ? (arStatusText || 'Preparing...') : 'Try in Your Room'}
        </Button>

        {/* Lamp Light Toggle Button */}
        <Tooltip title={isLampOn ? 'Switch to Daylight Studio' : 'Turn On Warm Incandescent Glow'}>
          <IconButton
            size="small"
            onClick={handleToggleLight}
            sx={{
              bgcolor: isLampOn ? '#f59e0b' : 'transparent',
              color: isLampOn ? '#ffffff' : '#64748b',
              boxShadow: isLampOn ? '0 0 10px rgba(245, 158, 11, 0.5)' : 'none',
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: isLampOn ? '#d97706' : '#f1f5f9' },
            }}
          >
            {isLampOn ? <LightbulbIcon sx={{ fontSize: 18 }} /> : <LightbulbOutlinedIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>

        {/* Auto Rotate Toggle */}
        <Tooltip title={isRotating ? 'Pause 360° Spin' : 'Play 360° Spin'}>
          <IconButton
            size="small"
            onClick={() => {
              setIsRotating((prev) => {
                const next = !prev;
                isRotatingRef.current = next;
                if (next) needsRenderRef.current = true;
                return next;
              });
              requestFrame();
            }}
            sx={{
              color: isRotating ? (isLampOn ? '#38bdf8' : '#0284c7') : (isLampOn ? '#94a3b8' : '#64748b'),
              bgcolor: isRotating ? (isLampOn ? 'rgba(56, 189, 248, 0.18)' : '#f0f9ff') : 'transparent',
              '&:hover': { bgcolor: isRotating ? (isLampOn ? 'rgba(56, 189, 248, 0.28)' : '#e0f2fe') : (isLampOn ? 'rgba(255,255,255,0.1)' : '#f1f5f9') },
            }}
          >
            {isRotating ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayArrowIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>

        {/* Reset Camera View */}
        <Tooltip title="Reset to Showcase View">
          <IconButton
            size="small"
            onClick={handleResetCamera}
            sx={{
              color: isLampOn ? '#94a3b8' : '#64748b',
              '&:hover': { bgcolor: isLampOn ? 'rgba(255,255,255,0.1)' : '#f1f5f9', color: isLampOn ? '#f8fafc' : '#0f172a' },
            }}
          >
            <RestartAltIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Drag & Rotate Hint overlay */}
      <Typography
        sx={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          fontSize: 10,
          fontWeight: 600,
          color: isLampOn ? '#64748b' : '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          pointerEvents: 'none',
          display: { xs: 'none', sm: 'block' },
          transition: 'color 0.3s ease',
        }}
      >
        Drag to rotate · Scroll to zoom
      </Typography>

      {/* ── OFF-SCREEN DIRECTIONAL PRODUCT INDICATOR ── */}
      {isOffScreen && (
        <Tooltip title="Product is off-screen · Click to re-center" placement="top" arrow>
          <Box
            ref={offScreenIndicatorRef}
            onClick={handleResetCamera}
            sx={{
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.9,
              bgcolor: isLampOn ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              color: isLampOn ? '#f8fafc' : '#0f172a',
              backdropFilter: 'blur(12px)',
              border: '2px solid #0284c7',
              borderRadius: '24px',
              py: 0.6,
              px: 1.4,
              cursor: 'pointer',
              boxShadow: isLampOn
                ? '0 0 20px rgba(2, 132, 199, 0.6), 0 8px 24px rgba(0,0,0,0.5)'
                : '0 0 20px rgba(2, 132, 199, 0.4), 0 8px 24px rgba(15, 23, 42, 0.15)',
              zIndex: 10,
              userSelect: 'none',
              pointerEvents: 'auto',
              animation: 'pulseGlow 2s infinite ease-in-out',
              transition: 'transform 0.15s ease, background-color 0.2s ease',
              '&:hover': {
                transform: 'translate(-50%, -50%) scale(1.08)',
                bgcolor: isLampOn ? '#1e293b' : '#ffffff',
                boxShadow: '0 0 28px rgba(2, 132, 199, 0.8), 0 10px 28px rgba(0,0,0,0.3)',
              },
              '@keyframes pulseGlow': {
                '0%, 100%': {
                  boxShadow: '0 0 14px rgba(2, 132, 199, 0.4), 0 4px 16px rgba(0,0,0,0.2)',
                },
                '50%': {
                  boxShadow: '0 0 26px rgba(2, 132, 199, 0.85), 0 6px 20px rgba(2, 132, 199, 0.4)',
                },
              },
            }}
          >
            <Box
              className="indicator-arrow"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
                transition: 'transform 0.08s linear',
              }}
            >
              <NavigationIcon sx={{ fontSize: 16 }} />
            </Box>
            <Typography
              sx={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
                color: isLampOn ? '#f8fafc' : '#0f172a',
              }}
            >
              Locate Product
            </Typography>
            <CenterFocusStrongIcon sx={{ fontSize: 15, color: '#0284c7' }} />
          </Box>
        </Tooltip>
      )}

      {/* ── DESKTOP AR TRY-ON QR CODE MODAL ── */}
      <Dialog
        open={arModalOpen}
        onClose={() => setArModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            p: 1,
            bgcolor: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          },
        }}
      >
        <DialogTitle sx={{ p: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ViewInArIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#0f172a', lineHeight: 1.2 }}>
                Try in Your Room
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#64748b' }}>
                Instant Augmented Reality on Mobile
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setArModalOpen(false)} sx={{ color: '#94a3b8' }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2, pt: 1 }}>
          {/* AR Display Mode Selector: Shade Only vs With Lamp Stand */}
          <Box sx={{ mb: 1.75 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#475569', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Preview Mode in Room:
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1,
                bgcolor: '#f1f5f9',
                p: 0.5,
                borderRadius: '12px',
              }}
            >
              <Button
                size="small"
                onClick={() => setArPlacement('shade')}
                startIcon={<ViewInArIcon sx={{ fontSize: 16 }} />}
                sx={{
                  borderRadius: '9px',
                  textTransform: 'none',
                  fontSize: 11.5,
                  fontWeight: 700,
                  py: 0.6,
                  bgcolor: arPlacement === 'shade' ? '#ffffff' : 'transparent',
                  color: arPlacement === 'shade' ? '#0284c7' : '#64748b',
                  boxShadow: arPlacement === 'shade' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  '&:hover': {
                    bgcolor: arPlacement === 'shade' ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  },
                }}
              >
                Shade Only
              </Button>
              <Button
                size="small"
                onClick={() => setArPlacement('table_lamp')}
                startIcon={<TableBarIcon sx={{ fontSize: 16 }} />}
                sx={{
                  borderRadius: '9px',
                  textTransform: 'none',
                  fontSize: 11.5,
                  fontWeight: 700,
                  py: 0.6,
                  bgcolor: arPlacement === 'table_lamp' ? '#ffffff' : 'transparent',
                  color: arPlacement === 'table_lamp' ? '#0284c7' : '#64748b',
                  boxShadow: arPlacement === 'table_lamp' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  '&:hover': {
                    bgcolor: arPlacement === 'table_lamp' ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  },
                }}
              >
                With Lamp Base
              </Button>
            </Box>
          </Box>

          {/* QR Code Container */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              p: 2,
              mb: 1.75,
            }}
          >
            <Box
              sx={{
                width: 185,
                height: 185,
                bgcolor: '#ffffff',
                borderRadius: '12px',
                p: 1,
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.25,
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=185x185&data=${encodeURIComponent(getMobileARUrl())}`}
                alt="Scan to try on phone camera"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </Box>

            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>
              Scan with your iPhone or Android camera
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#64748b', textAlign: 'center', mt: 0.4 }}>
              Places this exact custom shade at 1:1 true scale on your tabletop.
            </Typography>
          </Box>

          {/* Active Custom Spec Card */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: '#f1f5f9',
              borderRadius: '10px',
              px: 1.5,
              py: 1,
              mb: 1.75,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#1e293b' }}>
                {numTop}&quot; × {numBottom}&quot; × {numHeight}&quot;
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: '#64748b' }}>
                {coveringName} · {attachmentStyle} {isLampOn ? '· 🌙 Lit' : '· ☀️ Studio'}
              </Typography>
            </Box>
            <Chip
              size="small"
              icon={<CheckCircleOutlineIcon style={{ fontSize: 13, color: '#0284c7' }} />}
              label="1:1 Real Scale"
              sx={{ bgcolor: '#e0f2fe', color: '#0284c7', fontSize: 10, fontWeight: 700, height: 22 }}
            />
          </Box>

          {/* Action Buttons: Copy Link & Download 3D Model */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleCopyLink}
              startIcon={copiedLink ? <CheckIcon sx={{ color: '#10b981', fontSize: 16 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 11.5,
                borderColor: copiedLink ? '#10b981' : '#cbd5e1',
                color: copiedLink ? '#059669' : '#475569',
                py: 0.8,
                bgcolor: copiedLink ? '#ecfdf5' : 'transparent',
                '&:hover': {
                  borderColor: copiedLink ? '#10b981' : '#94a3b8',
                  bgcolor: copiedLink ? '#d1fae5' : '#f8fafc',
                },
              }}
            >
              {copiedLink ? 'Link Copied!' : 'Copy Mobile Link'}
            </Button>

            <Button
              variant="outlined"
              onClick={() => handleLaunchAR(true)}
              disabled={arLoading}
              startIcon={arLoading ? <CircularProgress size={14} /> : <DownloadIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 11.5,
                borderColor: '#cbd5e1',
                color: '#475569',
                py: 0.8,
                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
              }}
            >
              {arLoading ? (arStatusText || 'Exporting...') : 'Download .glb'}
            </Button>
          </Box>

          {/* Quick AR Guidance Callout */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.8,
              mt: 1.5,
              p: 1,
              bgcolor: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 15, color: '#16a34a', flexShrink: 0 }} />
            <Typography sx={{ fontSize: 10.5, color: '#166534', lineHeight: 1.35 }}>
              Point camera at a well-lit flat table or desk and move slightly to place at 1:1 true scale.
            </Typography>
          </Box>

          {arError && (
            <Alert severity="error" sx={{ mt: 1.5, fontSize: 11.5 }}>
              {arError}
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

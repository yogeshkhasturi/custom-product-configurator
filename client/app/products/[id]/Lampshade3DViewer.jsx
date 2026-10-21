'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';

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

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { resolveImageUrl } from '../../../lib/pricingUtils';
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

  const [isLampOn, setIsLampOn] = useState(true);
  const [isRotating, setIsRotating] = useState(true);
  const isRotatingRef = useRef(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textureLoading, setTextureLoading] = useState(false);

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
    controls.addEventListener('change', requestFrame);
    // Pause auto-rotation when user interacts with shade so it stays where placed
    controls.addEventListener('start', () => {
      isRotatingRef.current = false;
      setIsRotating(false);
    });
    controlsRef.current = controls;

    // ── STUDIO LIGHTING RIG ──
    // Ambient Light (soft fill)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Key Light (warm directional, front-right)
    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.6);
    keyLight.position.set(12, 18, 14);
    scene.add(keyLight);

    // Fill Light (cool directional, back-left for soft depth)
    const fillLight = new THREE.DirectionalLight(0xe8f0fe, 0.7);
    fillLight.position.set(-14, 8, -10);
    scene.add(fillLight);

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
          outerMat.needsUpdate = true;

          if (seamMatRef.current) {
            seamMatRef.current.map = diffuseTexture;
            seamMatRef.current.color.set(isDark ? 0x222222 : 0xffffff);
            if (bumpTexture) {
              seamMatRef.current.bumpMap = bumpTexture;
              seamMatRef.current.bumpScale = isDark ? 0.035 : 0.045;
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

    requestFrame();
  }, [numTop, numBottom, numHeight, coveringName, coveringImageUrl, attachmentStyle, isLampOn, requestFrame]);

  // Handle Lamp Light Toggle
  const handleToggleLight = () => {
    const next = !isLampOn;
    setIsLampOn(next);
    if (internalLightRef.current) {
      internalLightRef.current.intensity = next ? 2.4 : 0;
    }
    if (downwardLightRef.current) {
      downwardLightRef.current.intensity = next ? 1.6 : 0;
    }
    if (lightPoolRef.current?.material) {
      lightPoolRef.current.material.opacity = next ? 0.65 : 0;
    }
    if (filamentMeshRef.current?.material) {
      filamentMeshRef.current.material.opacity = next ? 1.0 : 0.0;
    }
    if (internalBulbRef.current?.material) {
      internalBulbRef.current.material.color.set(next ? 0xfffcf2 : 0xf1f5f9);
      internalBulbRef.current.material.emissive.set(next ? 0xffedd5 : 0x000000);
      internalBulbRef.current.material.emissiveIntensity = next ? 0.95 : 0;
    }
    if (innerMatRef.current) {
      innerMatRef.current.color.set(next ? new THREE.Color(0xfff6e8) : new THREE.Color(0xf1f5f9));
      innerMatRef.current.emissive.set(next ? new THREE.Color(0xffeedd) : new THREE.Color(0x000000));
      innerMatRef.current.emissiveIntensity = next ? 0.45 : 0;
      innerMatRef.current.needsUpdate = true;
    }
    const baseColor = getCoveringColor(coveringName);
    const isDark = /black|charcoal|dark|navy/i.test(coveringName);
    const isNatural = /natural|tan|burlap|kraft/i.test(coveringName) && !isDark && !/white/i.test(coveringName);

    const updateShellEmissive = (mat) => {
      if (!mat) return;
      if (next) {
        if (isDark) {
          mat.emissive = new THREE.Color(0x101010);
          mat.emissiveIntensity = 0.04;
        } else if (isNatural) {
          mat.emissive = new THREE.Color(0xd4a373);
          mat.emissiveIntensity = 0.35;
        } else {
          mat.emissive = new THREE.Color(0xffedd5);
          mat.emissiveIntensity = 0.38;
        }
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
      mat.needsUpdate = true;
    };

    updateShellEmissive(outerMatRef.current);
    updateShellEmissive(seamMatRef.current);

    if (trimMatRef.current) {
      if (next) {
        trimMatRef.current.emissive = isDark ? new THREE.Color(0x050505) : new THREE.Color(baseColor).lerp(new THREE.Color(0xffeedd), 0.2);
        trimMatRef.current.emissiveIntensity = isDark ? 0.03 : 0.22;
      } else {
        trimMatRef.current.emissive = new THREE.Color(0x000000);
        trimMatRef.current.emissiveIntensity = 0;
      }
      trimMatRef.current.needsUpdate = true;
    }
    onLightToggle?.(next);
    requestFrame();
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
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: { xs: 340, sm: 400, md: 460 },
        bgcolor: '#f8fafc',
        borderRadius: '12px',
        overflow: 'hidden',
        userSelect: 'none',
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
            bgcolor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            px: 1.5,
            py: 0.5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            pointerEvents: 'auto',
          }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isLampOn ? '#f59e0b' : '#94a3b8' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
            {numTop}&quot; Top × {numBottom}&quot; Bottom × {numHeight}&quot; Height
          </Typography>
        </Box>

        {textureLoading && (
          <Chip
            size="small"
            icon={<CircularProgress size={12} sx={{ color: '#0284c7' }} />}
            label="Loading fabric texture..."
            sx={{ bgcolor: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: 600 }}
          />
        )}
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
          gap: 0.75,
          bgcolor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #e2e8f0',
          borderRadius: '30px',
          p: 0.5,
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.1)',
          zIndex: 2,
        }}
      >
        {/* Lamp Light Toggle Button */}
        <Tooltip title={isLampOn ? 'Turn Off Light Bulb' : 'Turn On Warm Lamp Glow'}>
          <IconButton
            size="small"
            onClick={handleToggleLight}
            sx={{
              bgcolor: isLampOn ? '#fef3c7' : 'transparent',
              color: isLampOn ? '#d97706' : '#64748b',
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: isLampOn ? '#fde68a' : '#f1f5f9' },
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
              color: isRotating ? '#0284c7' : '#64748b',
              bgcolor: isRotating ? '#f0f9ff' : 'transparent',
              '&:hover': { bgcolor: isRotating ? '#e0f2fe' : '#f1f5f9' },
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
            sx={{ color: '#64748b', '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' } }}
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
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          pointerEvents: 'none',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        Drag to rotate · Scroll to zoom
      </Typography>
    </Box>
  );
}

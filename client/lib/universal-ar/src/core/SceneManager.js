import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  constructor(canvas, container) {
    this.canvas = canvas;
    this.container = container;
    this.currentModel = null;
    this.disposed = false;
    this.isAutoRotating = false;

    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLighting();
    this.initContactShadow();
    this.initControls();
    this.initResizeListener();
    this.startLoop();
  }

  initScene() {
    this.scene = new THREE.Scene();
  }

  initCamera() {
    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 450;
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 50);
    this.defaultCameraPos = new THREE.Vector3(0, 0.45, 1.35);
    this.camera.position.copy(this.defaultCameraPos);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true // Required for clean snapshot exports
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.container.clientWidth || 600, this.container.clientHeight || 450);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  initLighting() {
    // 1. Hemisphere ambient reflection (sky + warm ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xdbeafe, 1.25);
    this.hemiLight.position.set(0, 20, 0);
    this.scene.add(this.hemiLight);

    // 2. Key directional light
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.keyLight.position.set(2.5, 4.5, 3.0);
    this.scene.add(this.keyLight);

    // 3. Fill directional light (softens key shadows)
    this.fillLight = new THREE.DirectionalLight(0xf1f5f9, 0.7);
    this.fillLight.position.set(-2.5, 2.5, -2.0);
    this.scene.add(this.fillLight);

    // 4. Subtle rim light from behind for edge separation
    this.rimLight = new THREE.DirectionalLight(0xfff7ed, 0.5);
    this.rimLight.position.set(0, 3, -3);
    this.scene.add(this.rimLight);
  }

  initContactShadow() {
    // Generate soft radial blur shadow texture via canvas
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
    gradient.addColorStop(0.35, 'rgba(15, 23, 42, 0.22)');
    gradient.addColorStop(0.7, 'rgba(15, 23, 42, 0.06)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const shadowTexture = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.85
    });

    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = -0.001;
    this.scene.add(this.shadowMesh);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 0.2;
    this.controls.maxDistance = 5.0;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Keep camera above ground
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 2.0;
    this.controls.target.set(0, 0.25, 0);
  }

  toggleAutoRotate(enable) {
    this.isAutoRotating = enable !== undefined ? enable : !this.controls.autoRotate;
    this.controls.autoRotate = this.isAutoRotating;
    return this.isAutoRotating;
  }

  resetCamera() {
    this.camera.position.copy(this.defaultCameraPos);
    if (this.currentModel) {
      const box = new THREE.Box3().setFromObject(this.currentModel);
      const center = new THREE.Vector3();
      box.getCenter(center);
      this.controls.target.set(0, center.y, 0);
    } else {
      this.controls.target.set(0, 0.25, 0);
    }
    this.controls.update();
  }

  captureSnapshot(mimeType = 'image/png', quality = 0.95) {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL(mimeType, quality);
  }

  initResizeListener() {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.disposed) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width && height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      }
    });
    this.resizeObserver.observe(this.container);
  }

  startLoop() {
    const animate = () => {
      if (this.disposed) return;
      requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  dispose() {
    this.disposed = true;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

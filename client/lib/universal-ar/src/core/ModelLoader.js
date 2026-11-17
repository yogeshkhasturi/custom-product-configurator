import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ModelLoader {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.loader = new GLTFLoader();
  }

  /**
   * Loads a GLB/GLTF model, normalizes to 1:1 metric scale, centers, and grounds on floor.
   * @param {string|ArrayBuffer} source - Model URL or ArrayBuffer
   * @param {object} options - Configuration options
   * @param {number} [options.realHeightMeters=0.5] - Desired physical height in meters for AR
   * @param {function} [options.onProgress] - Progress callback (percentage)
   * @returns {Promise<THREE.Group>}
   */
  load(source, options = {}) {
    const { realHeightMeters = 0.5, onProgress } = options;

    return new Promise((resolve, reject) => {
      const onLoad = (gltf) => {
        const model = gltf.scene;

        // 1. Remove previously loaded model if present
        if (this.sceneManager.currentModel) {
          this.sceneManager.scene.remove(this.sceneManager.currentModel);
        }

        // 2. Enhance materials for photorealistic rendering
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.side = THREE.DoubleSide;
              if (child.material.isMeshStandardMaterial) {
                child.material.envMapIntensity = 1.0;
                child.material.needsUpdate = true;
              }
            }
          }
        });

        // 3. Compute bounding box to determine raw 3D dimensions
        const rawBox = new THREE.Box3().setFromObject(model);
        const rawSize = new THREE.Vector3();
        rawBox.getSize(rawSize);

        // 4. Metric scale normalization: 1 unit in Three.js = 1 meter in real-world AR
        if (rawSize.y > 0 && realHeightMeters > 0) {
          const scaleFactor = realHeightMeters / rawSize.y;
          model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }

        // 5. Recompute scaled box, center horizontally, and ground on y = 0
        const scaledBox = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        scaledBox.getCenter(center);

        model.position.x = -center.x;
        model.position.z = -center.z;
        model.position.y = -scaledBox.min.y; // Bottom sits directly on ground plane

        // 6. Adjust contact shadow dimensions to match product footprint
        const finalBox = new THREE.Box3().setFromObject(model);
        const finalSize = new THREE.Vector3();
        finalBox.getSize(finalSize);

        const shadowDiameter = Math.max(finalSize.x, finalSize.z) * 1.6;
        if (this.sceneManager.shadowMesh) {
          this.sceneManager.shadowMesh.scale.set(shadowDiameter, shadowDiameter, 1);
        }

        // 7. Point OrbitControls target to product geometric center
        this.sceneManager.controls.target.set(0, finalSize.y * 0.5, 0);

        // 8. Adjust camera distance proportionally so any model frames nicely
        const maxDim = Math.max(finalSize.x, finalSize.y, finalSize.z);
        const cameraDist = Math.max(maxDim * 2.2, 0.8);
        this.sceneManager.camera.position.set(0, finalSize.y * 0.7, cameraDist);
        this.sceneManager.defaultCameraPos.copy(this.sceneManager.camera.position);
        this.sceneManager.controls.update();

        // 9. Add to scene and record reference
        this.mountModel(model);
        resolve(model);
      };

      const handleProgress = (xhr) => {
        if (xhr.lengthComputable && onProgress) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          onProgress(percent);
        }
      };

      if (typeof source === 'string') {
        this.loader.load(source, onLoad, handleProgress, reject);
      } else if (source instanceof ArrayBuffer) {
        this.loader.parse(source, '', onLoad, reject);
      } else {
        reject(new Error('Invalid source format. Expected URL string or ArrayBuffer.'));
      }
    });
  }

  /**
   * Rescales the active model to a new real-world height without reloading.
   * @param {number} newHeightMeters
   */
  setRealHeight(newHeightMeters) {
    const model = this.sceneManager.currentModel;
    if (!model || newHeightMeters <= 0) return;

    // Measure natural height at scale 1
    const currentScaleY = model.scale.y || 1;
    const box = new THREE.Box3().setFromObject(model);
    const currentSize = new THREE.Vector3();
    box.getSize(currentSize);
    const naturalHeight = currentSize.y / currentScaleY;

    if (naturalHeight <= 0) return;

    const newScale = newHeightMeters / naturalHeight;
    model.scale.set(newScale, newScale, newScale);
    model.updateMatrixWorld(true);

    // Re-ground base on floor y = 0, and re-center on X/Z
    const newBox = new THREE.Box3().setFromObject(model);
    const newCenter = new THREE.Vector3();
    newBox.getCenter(newCenter);

    model.position.x -= newCenter.x;
    model.position.z -= newCenter.z;
    model.position.y -= newBox.min.y;
    model.updateMatrixWorld(true);

    const finalSize = new THREE.Vector3();
    newBox.getSize(finalSize);
    const shadowDiameter = Math.max(finalSize.x, finalSize.z) * 1.6;
    if (this.sceneManager.shadowMesh) {
      this.sceneManager.shadowMesh.scale.set(shadowDiameter, shadowDiameter, 1);
    }

    this.frameCamera(model);
  }

  /**
   * Dynamically centers the target and frames the camera so the model is always
   * perfectly centered in the viewport, never sitting on the bottom edge.
   */
  frameCamera(model) {
    if (!model || !this.sceneManager.camera || !this.sceneManager.controls) return;

    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.05);
    const fov = (this.sceneManager.camera.fov || 40) * (Math.PI / 180);
    // Distance to make the object fill ~70% of the viewport height/width
    let cameraDist = (maxDim / 2) / Math.tan(fov / 2) * 1.45;
    cameraDist = Math.max(cameraDist, 0.35);

    // Target the exact vertical and horizontal center of the model
    this.sceneManager.controls.target.copy(center);

    // Elevated 35-degree top-down viewing angle for clear product inspection
    const angleRad = 35 * (Math.PI / 180);
    const elevatedY = center.y + cameraDist * Math.sin(angleRad);
    const elevatedZ = center.z + cameraDist * Math.cos(angleRad);

    this.sceneManager.camera.position.set(center.x, elevatedY, elevatedZ);
    this.sceneManager.camera.lookAt(center);
    this.sceneManager.defaultCameraPos.copy(this.sceneManager.camera.position);
    this.sceneManager.controls.update();
  }

  /**
   * Mounts any THREE.Object3D directly into the scene with proper grounding, shadow scaling, and camera framing.
   */
  mountModel(model) {
    if (this.sceneManager.currentModel && this.sceneManager.currentModel !== model) {
      this.sceneManager.scene.remove(this.sceneManager.currentModel);
    }

    // Enhance materials for PBR lighting
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Center model at origin on X and Z, and place base cleanly at y = 0
    const initialBox = new THREE.Box3().setFromObject(model);
    const initialCenter = new THREE.Vector3();
    initialBox.getCenter(initialCenter);
    model.position.x -= initialCenter.x;
    model.position.z -= initialCenter.z;
    model.position.y -= initialBox.min.y;
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Adjust shadow
    const shadowDiameter = Math.max(size.x, size.z) * 1.6;
    if (this.sceneManager.shadowMesh) {
      this.sceneManager.shadowMesh.scale.set(shadowDiameter, shadowDiameter, 1);
    }

    // Add model to scene
    this.sceneManager.scene.add(model);
    this.sceneManager.currentModel = model;

    // Frame camera on the model's true center
    this.frameCamera(model);
  }
}

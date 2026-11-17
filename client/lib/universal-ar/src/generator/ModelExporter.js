import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

/**
 * Model Exporter Utility
 * Exports Three.js Groups/Scenes to binary GLB format for saving, downloading, and AR streaming.
 */
export class ModelExporter {
  /**
   * Exports a THREE.Object3D/THREE.Group to a GLB Blob.
   * @param {THREE.Object3D} object3d
   * @returns {Promise<{ blob: Blob, url: string, buffer: ArrayBuffer }>}
   */
  static exportGLB(object3d) {
    return this.exportToGLB(object3d);
  }

  static exportToGLB(object3d) {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      exporter.parse(
        object3d,
        (result) => {
          if (result instanceof ArrayBuffer) {
            const blob = new Blob([result], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            resolve({ blob, url, buffer: result });
          } else {
            const jsonString = JSON.stringify(result);
            const blob = new Blob([jsonString], { type: 'model/gltf+json' });
            const url = URL.createObjectURL(blob);
            resolve({ blob, url, buffer: result });
          }
        },
        (error) => {
          reject(new Error(`GLTFExporter error: ${error}`));
        },
        { binary: true }
      );
    });
  }

  /**
   * Triggers a browser download of the GLB model file.
   */
  static downloadGLB(blobOrUrl, filename = 'generated-model.glb') {
    const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

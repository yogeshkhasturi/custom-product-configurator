import { SceneManager } from './core/SceneManager.js';
import { ModelLoader } from './core/ModelLoader.js';
import { ARExporter } from './core/ARExporter.js';
import { Prompt3DGenerator } from './generator/Prompt3DGenerator.js';
import { Procedural3DGenerator } from './generator/Procedural3DGenerator.js';
import { LLM3DGenerator } from './generator/LLM3DGenerator.js';
import { Structured3DBuilder } from './generator/Structured3DBuilder.js';
import { ModelExporter } from './generator/ModelExporter.js';
import { TextureGenerator } from './generator/TextureGenerator.js';
import cssText from './ui/styles.css?inline';

const BaseElement = typeof window !== "undefined" && window.HTMLElement ? window.HTMLElement : class {};
export class ImageTo3DViewerElement extends BaseElement {
  static get observedAttributes() {
    return ['src', 'usdz-src', 'alt', 'real-height', 'auto-rotate'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.sceneManager = null;
    this.modelLoader = null;
  }

  connectedCallback() {
    this.render();
    this.initCore();

    if (this.getAttribute('src')) {
      this.loadModelFromAttr();
    }
  }

  disconnectedCallback() {
    if (this.sceneManager) {
      this.sceneManager.dispose();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'src' && this.modelLoader && newValue) {
      this.loadModelFromAttr();
    } else if (name === 'real-height' && this.modelLoader && newValue) {
      this.modelLoader.setRealHeight(parseFloat(newValue) || 0.5);
    } else if (name === 'auto-rotate' && this.sceneManager) {
      this.sceneManager.toggleAutoRotate(this.hasAttribute('auto-rotate'));
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${cssText}</style>

      <div class="snapshot-flash" id="flash"></div>

      <div class="loading-overlay" id="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text" id="loading-text">Loading 3D Model...</div>
      </div>

      <div class="tools-bar">
        <button class="tool-btn" id="btn-reset" title="Reset Camera View">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
        <button class="tool-btn" id="btn-rotate" title="Toggle Auto Rotate">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
        </button>
        <button class="tool-btn" id="btn-snapshot" title="Save Snapshot">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>
      </div>

      <button class="ar-btn" id="btn-ar">
        <svg viewBox="0 0 24 24">
          <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18s-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18s.41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15L6.04 7.5 12 10.85l5.96-3.35L12 4.15zM5 8.91v6.18L11 18.4v-6.18L5 8.91zm14 0l-6 3.31v6.18l6-3.31V8.91z"/>
        </svg>
        View in AR
      </button>

      <div class="qr-modal" id="qr-modal">
        <div class="qr-content">
          <h4>View in Your Space</h4>
          <p>Scan this QR code with your mobile camera to see this product in real-world 1:1 scale AR.</p>
          <img class="qr-img" id="qr-img" alt="Scan QR Code" />
          <button class="qr-close-btn" id="qr-close">Done</button>
        </div>
      </div>

      <canvas id="viewer-canvas"></canvas>
    `;
  }

  initCore() {
    const canvas = this.shadowRoot.getElementById('viewer-canvas');
    this.sceneManager = new SceneManager(canvas, this);
    this.modelLoader = new ModelLoader(this.sceneManager);

    if (this.hasAttribute('auto-rotate')) {
      this.sceneManager.toggleAutoRotate(true);
      this.shadowRoot.getElementById('btn-rotate').classList.add('active');
    }

    this.bindEvents();
  }

  bindEvents() {
    const btnReset = this.shadowRoot.getElementById('btn-reset');
    const btnRotate = this.shadowRoot.getElementById('btn-rotate');
    const btnSnapshot = this.shadowRoot.getElementById('btn-snapshot');
    const btnAR = this.shadowRoot.getElementById('btn-ar');
    const qrModal = this.shadowRoot.getElementById('qr-modal');
    const qrClose = this.shadowRoot.getElementById('qr-close');
    const qrImg = this.shadowRoot.getElementById('qr-img');
    const flash = this.shadowRoot.getElementById('flash');

    btnReset.addEventListener('click', () => {
      this.sceneManager.resetCamera();
    });

    btnRotate.addEventListener('click', () => {
      const active = this.sceneManager.toggleAutoRotate();
      btnRotate.classList.toggle('active', active);
    });

    btnSnapshot.addEventListener('click', () => {
      flash.classList.add('flash');
      setTimeout(() => flash.classList.remove('flash'), 150);

      const dataUrl = this.sceneManager.captureSnapshot();
      this.dispatchEvent(new CustomEvent('snapshot', { detail: { dataUrl } }));

      // Trigger instant browser download
      const link = document.createElement('a');
      link.download = `${this.getAttribute('alt') || 'product'}-snapshot.png`;
      link.href = dataUrl;
      link.click();
    });

    btnAR.addEventListener('click', () => {
      this.launchAR();
    });

    qrClose.addEventListener('click', () => {
      qrModal.classList.remove('active');
    });

    qrModal.addEventListener('click', (e) => {
      if (e.target === qrModal) {
        qrModal.classList.remove('active');
      }
    });
  }

  async loadModelFromAttr() {
    const src = this.getAttribute('src');
    if (!src) return;

    const realHeight = parseFloat(this.getAttribute('real-height')) || 0.5;
    const loadingOverlay = this.shadowRoot.getElementById('loading-overlay');
    const loadingText = this.shadowRoot.getElementById('loading-text');

    loadingOverlay.classList.remove('hidden');
    loadingText.textContent = 'Loading 3D Model...';

    try {
      await this.modelLoader.load(src, {
        realHeightMeters: realHeight,
        onProgress: (percent) => {
          loadingText.textContent = `Loading 3D Model... ${percent}%`;
          this.dispatchEvent(new CustomEvent('progress', { detail: { percent } }));
        }
      });

      loadingOverlay.classList.add('hidden');
      this.dispatchEvent(new CustomEvent('load', { detail: { src } }));
    } catch (err) {
      console.error('[ImageTo3DViewer] Model loading failed:', err);
      loadingText.textContent = 'Failed to load 3D model';
      this.dispatchEvent(new CustomEvent('error', { detail: { error: err.message } }));
    }
  }

  /**
   * Programmatic API to load a model dynamically.
   */
  async loadModel(url, options = {}) {
    this.setAttribute('src', url);
    if (options.realHeightMeters) {
      this.setAttribute('real-height', options.realHeightMeters);
    }
    return this.loadModelFromAttr();
  }

  /**
   * Generates a 3D model directly using Three.js from prompt and dimensions,
   * mounts it instantly in the viewer, and prepares GLB export.
   * @param {object} options
   * @param {string} options.prompt - Text description
   * @param {object} options.dimensions - { width, height, depth } in meters
   * @param {string} [options.geminiApiKey] - Optional free Gemini key
   * @param {boolean} [options.forceProcedural=false] - Use built-in Three.js engine directly
   * @param {function} [options.onInstantPreview] - Callback when instant preview is mounted
   * @returns {Promise<{ model: THREE.Group, source: string, timing: object, getGLB: Function }>}
   */
  async generateFromPrompt(options = {}) {
    const loadingOverlay = this.shadowRoot.getElementById('loading-overlay');
    const loadingText = this.shadowRoot.getElementById('loading-text');

    loadingOverlay.classList.remove('hidden');
    loadingText.textContent = 'Initializing 3D Generation...';

    const generator = new Prompt3DGenerator();

    try {
      const result = await generator.generate({
        ...options,
        onInstantPreview: (preview) => {
          // Mount instant preview in < 5ms
          this.modelLoader.mountModel(preview.model);
          loadingText.textContent = 'Instant Preview Ready (AI Refining...)';
          if (options.onInstantPreview) {
            options.onInstantPreview(preview);
          }
        },
        onProgress: (msg) => {
          loadingText.textContent = msg;
        }
      });

      // Mount finalized model immediately without waiting for GLB export
      this.modelLoader.mountModel(result.model);
      if (result.dimensions?.height) {
        this.setAttribute('real-height', result.dimensions.height);
      }

      loadingOverlay.classList.add('hidden');
      this.dispatchEvent(new CustomEvent('generated', { detail: result }));
      return result;
    } catch (err) {
      console.error('[ImageTo3DViewer] Generation failed:', err);
      loadingText.textContent = `Error: ${err.message}`;
      setTimeout(() => loadingOverlay.classList.add('hidden'), 3500);
      throw err;
    }
  }

  /**
   * Launches AR or displays desktop QR modal.
   */
  launchAR() {
    const glbUrl = this.getAttribute('src');
    const usdzUrl = this.getAttribute('usdz-src');
    const title = this.getAttribute('alt') || 'Product AR';

    this.dispatchEvent(new CustomEvent('ar-launch', { detail: { glbUrl, usdzUrl } }));

    ARExporter.launchAR({
      glbUrl,
      usdzUrl,
      title,
      onDesktopQR: (pageUrl) => {
        const qrModal = this.shadowRoot.getElementById('qr-modal');
        const qrImg = this.shadowRoot.getElementById('qr-img');
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pageUrl)}`;
        qrModal.classList.add('active');
      }
    });
  }
}

// Automatically register custom element if in browser
if (typeof window !== 'undefined' && !customElements.get('image-to-3d-viewer')) {
  customElements.define('image-to-3d-viewer', ImageTo3DViewerElement);
}

export {
  SceneManager,
  ModelLoader,
  ARExporter,
  Prompt3DGenerator,
  Procedural3DGenerator,
  LLM3DGenerator,
  Structured3DBuilder,
  ModelExporter,
  TextureGenerator
};



import { LLM3DGenerator } from './LLM3DGenerator.js';
import { Procedural3DGenerator } from './Procedural3DGenerator.js';
import { ModelExporter } from './ModelExporter.js';

/**
 * Prompt & Dimensions 3D Model Orchestrator
 * - Provides non-blocking instant procedural preview for instant user feedback
 * - Dispatches fast structured Gemini request in background
 * - Mounts model to Three.js scene immediately without blocking on GLB export
 * - Decouples GLB binary export for on-demand downloading
 */
export class Prompt3DGenerator {
  constructor(config = {}) {
    this.llmGenerator = new LLM3DGenerator(config);
    this.proceduralGenerator = new Procedural3DGenerator();
  }

  /**
   * Generates a 3D model with optional progressive instant preview.
   * @param {object} options
   * @param {string} options.prompt - Text description
   * @param {object} options.dimensions - { width, height, depth } in meters
   * @param {string} [options.geminiApiKey] - Gemini API key
   * @param {boolean} [options.forceProcedural=false] - Force local procedural generator
   * @param {function} [options.onInstantPreview] - Callback fired immediately with procedural model
   * @param {function} [options.onProgress] - Status callback
   * @returns {Promise<{ model: THREE.Group, source: string, timing: object, getGLB: Function }>}
   */
  async generate(options = {}) {
    const {
      prompt = 'modern wooden table',
      dimensions = { width: 1.0, height: 0.75, depth: 0.6 },
      image = null,
      geminiApiKey = '',
      forceProcedural = false,
      onInstantPreview,
      onProgress
    } = options;

    const startTotal = performance.now();

    // 1. Instant optimistic procedural preview (renders in < 5ms)
    let proceduralModel = null;
    if (onInstantPreview) {
      try {
        proceduralModel = this.proceduralGenerator.generate({ prompt, dimensions });
        onInstantPreview({
          model: proceduralModel,
          source: 'procedural-preview',
          dimensions
        });
      } catch (e) {
        console.warn('Instant preview creation skipped:', e);
      }
    }

    // 2. Route generation
    if (forceProcedural || (!geminiApiKey && !image)) {
      if (onProgress) onProgress('Generated via Built-in Three.js Engine');
      const model = proceduralModel || this.proceduralGenerator.generate({ prompt, dimensions });
      const totalMs = Math.round(performance.now() - startTotal);

      return {
        model,
        source: 'procedural',
        dimensions,
        timing: { totalMs, apiLatencyMs: 0, buildDurationMs: 2 },
        getGLB: () => ModelExporter.exportToGLB(model)
      };
    }

    // 3. AI Generation via Gemini
    if (onProgress) onProgress('Synthesizing structured 3D model with Gemini AI...');
    const result = await this.llmGenerator.generate({
      prompt,
      dimensions,
      image,
      geminiApiKey,
      onProgress
    });

    const totalMs = Math.round(performance.now() - startTotal);
    result.timing.totalMs = totalMs;

    return {
      model: result.model,
      source: result.source,
      dimensions,
      timing: result.timing,
      spec: result.spec,
      getGLB: () => ModelExporter.exportToGLB(result.model)
    };
  }
}

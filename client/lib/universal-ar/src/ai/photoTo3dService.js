/**
 * Photo-to-3D AI Generation Service
 * Supports Tripo3D, Meshy.ai, and Hugging Face open-source models.
 */

export class PhotoTo3DService {
  constructor(config = {}) {
    const env = typeof process !== 'undefined' && process?.env ? process.env : {};
    this.provider = config.provider || env.AI_3D_PROVIDER || 'tripo3d';
    this.tripoKey = config.tripoKey || env.TRIPO_API_KEY;
    this.meshyKey = config.meshyKey || env.MESHY_API_KEY;
    this.hfToken = config.hfToken || env.HUGGINGFACE_TOKEN;
  }

  /**
   * Generates a 3D model from an image.
   * @param {string} imageSource - Base64 string, data URL, or public HTTP(S) image URL
   * @param {string} [format='jpg'] - File format ('jpg' | 'png')
   * @param {function} [onStatusUpdate] - Optional status progress callback
   * @returns {Promise<{ glbUrl: string, previewUrl?: string, taskId: string }>}
   */
  async generate(imageSource, format = 'jpg', onStatusUpdate) {
    switch (this.provider.toLowerCase()) {
      case 'meshy':
        return this.generateWithMeshy(imageSource, onStatusUpdate);
      case 'huggingface':
        return this.generateWithHuggingFace(imageSource, onStatusUpdate);
      case 'tripo3d':
      default:
        return this.generateWithTripo(imageSource, format, onStatusUpdate);
    }
  }

  /**
   * Tripo3D API: ~10 to 15s generation time.
   * Documentation: https://platform.tripo3d.ai/docs
   */
  async generateWithTripo(imageSource, format, onStatusUpdate) {
    if (!this.tripoKey) {
      throw new Error('TRIPO_API_KEY is not configured in .env. Please add your Tripo3D key.');
    }

    const isUrl = typeof imageSource === 'string' && imageSource.startsWith('http');
    const payload = {
      type: 'image_to_model',
      file: isUrl
        ? { type: format, url: imageSource }
        : { type: format, data: imageSource.replace(/^data:image\/\w+;base64,/, '') }
    };

    if (onStatusUpdate) onStatusUpdate('Submitting task to Tripo3D AI...');

    // 1. Submit Generation Task
    const startRes = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.tripoKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const startData = await startRes.json();
    if (!startRes.ok || startData.code !== 0) {
      throw new Error(`Tripo3D Task Submission failed: ${startData.message || JSON.stringify(startData)}`);
    }

    const taskId = startData.data.task_id;

    // 2. Poll Task Status
    let attempts = 0;
    const maxAttempts = 60; // 60 * 1.5s = 90 seconds timeout

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1500));
      attempts++;

      const checkRes = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
        headers: { Authorization: `Bearer ${this.tripoKey}` }
      });
      const checkData = await checkRes.json();

      if (checkData.code !== 0) {
        throw new Error(`Tripo3D status check failed: ${checkData.message}`);
      }

      const status = checkData.data.status;
      const progress = checkData.data.progress || 0;
      if (onStatusUpdate) onStatusUpdate(`Generating 3D model: ${progress}%...`);

      if (status === 'success') {
        return {
          glbUrl: checkData.data.output.model,
          previewUrl: checkData.data.output.rendered_image,
          taskId
        };
      }

      if (status === 'failed' || status === 'cancelled') {
        throw new Error(`Tripo3D generation failed: ${checkData.data.message || status}`);
      }
    }

    throw new Error('Tripo3D generation timed out.');
  }

  /**
   * Meshy.ai API: High geometric detail and texturing.
   * Documentation: https://docs.meshy.ai/
   */
  async generateWithMeshy(imageSource, onStatusUpdate) {
    if (!this.meshyKey) {
      throw new Error('MESHY_API_KEY is not configured in .env. Please add your Meshy key.');
    }

    if (onStatusUpdate) onStatusUpdate('Submitting image to Meshy.ai...');

    // 1. Submit Image-to-3D Task
    const startRes = await fetch('https://api.meshy.ai/v1/image-to-3d', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.meshyKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageSource,
        enable_pbr: true
      })
    });

    const startData = await startRes.json();
    if (!startRes.ok) {
      throw new Error(`Meshy task error: ${startData.message || JSON.stringify(startData)}`);
    }

    const taskId = startData.result;

    // 2. Poll status
    let attempts = 0;
    while (attempts < 60) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;

      const checkRes = await fetch(`https://api.meshy.ai/v1/image-to-3d/${taskId}`, {
        headers: { Authorization: `Bearer ${this.meshyKey}` }
      });
      const checkData = await checkRes.json();

      if (onStatusUpdate) onStatusUpdate(`Meshy processing: ${checkData.progress || 0}%...`);

      if (checkData.status === 'SUCCEEDED') {
        return {
          glbUrl: checkData.model_urls.glb,
          usdzUrl: checkData.model_urls.usdz,
          previewUrl: checkData.thumbnail_url,
          taskId
        };
      }

      if (checkData.status === 'FAILED') {
        throw new Error(`Meshy generation failed: ${checkData.task_error?.message || 'Unknown error'}`);
      }
    }

    throw new Error('Meshy.ai generation timed out.');
  }

  /**
   * Hugging Face Free Open-Source API (Stable Fast 3D / TripoSR)
   */
  async generateWithHuggingFace(imageSource, onStatusUpdate) {
    if (onStatusUpdate) onStatusUpdate('Processing via Hugging Face AI Space...');

    // Endpoint for Stable Fast 3D on Hugging Face Spaces
    const endpoint = 'https://stabilityai-stable-fast-3d.hf.space/call/generate_mvs';

    const cleanBase64 = imageSource.startsWith('data:')
      ? imageSource
      : `data:image/jpeg;base64,${imageSource}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.hfToken ? { Authorization: `Bearer ${this.hfToken}` } : {})
      },
      body: JSON.stringify({
        data: [{ path: cleanBase64 }]
      })
    });

    if (!res.ok) {
      throw new Error(`Hugging Face inference failed with status ${res.status}`);
    }

    const data = await res.json();
    const eventId = data.event_id;

    // Read result stream
    const resultRes = await fetch(`https://stabilityai-stable-fast-3d.hf.space/call/generate_mvs/${eventId}`);
    const text = await resultRes.text();

    // Extract generated .glb URL from stream event data
    const match = text.match(/https:\/\/[^"'\s]+\.glb/);
    if (match) {
      return { glbUrl: match[0], taskId: eventId };
    }

    throw new Error('Could not parse GLB URL from Hugging Face output');
  }
}

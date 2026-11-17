import { PhotoTo3DService } from './photoTo3dService.js';

const defaultService = new PhotoTo3DService();

/**
 * Universal Route Handler for Express / Connect HTTP servers.
 * Accepts POST JSON: { image: base64String, imageUrl: string, format: 'jpg' }
 */
export async function expressHandler(req, res) {
  try {
    let imageSource = null;
    let format = 'jpg';

    if (req.body && req.body.image) {
      imageSource = req.body.image;
      format = req.body.format || 'jpg';
    } else if (req.body && req.body.imageUrl) {
      imageSource = req.body.imageUrl;
    } else if (req.file) {
      // Multer file upload support
      imageSource = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      format = req.file.mimetype.includes('png') ? 'png' : 'jpg';
    }

    if (!imageSource) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: provide image (base64) or imageUrl in JSON body'
      });
    }

    const result = await defaultService.generate(imageSource, format);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[ImageTo3D Handler] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '3D Model generation failed'
    });
  }
}

/**
 * Next.js App Router (app/api/generate-3d/route.js) adapter:
 * Export this directly inside your Next.js route file!
 */
export async function nextAppRoutePOST(request) {
  try {
    const body = await request.json();
    const imageSource = body.image || body.imageUrl;

    if (!imageSource) {
      return new Response(JSON.stringify({ success: false, error: 'Missing image or imageUrl' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await defaultService.generate(imageSource, body.format || 'jpg');

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

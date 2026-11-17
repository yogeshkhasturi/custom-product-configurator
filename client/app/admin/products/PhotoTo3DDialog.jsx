'use client';
import { useState, useRef, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ImageTo3DViewer from '../../components/ImageTo3DViewer';
import { resolveImageUrl } from '../../../lib/pricingUtils';

export default function PhotoTo3DDialog({
  open,
  onClose,
  productName = '',
  productImages = [],
  onApplyModel,
}) {
  const [selectedImage, setSelectedImage] = useState(productImages[0] || '');
  const [customImageFile, setCustomImageFile] = useState(null);
  const [customImagePreview, setCustomImagePreview] = useState('');
  const [generationMode, setGenerationMode] = useState('procedural'); // 'procedural' or 'ai'
  const [fitterStyle, setFitterStyle] = useState('auto'); // 'auto', 'bulb', 'spider'
  const isBulbProduct = /bulb|clip/i.test(productName);
  const initialFitterDesc = isBulbProduct
    ? 'centered golden brass bulb clip-on attachment and light bulb'
    : '3-arm brass spider washer fitter';

  const [prompt, setPrompt] = useState(
    productName
      ? `${productName} matching reference photo with accurate taper, woven rattan/linen texture, rolled rims, and ${initialFitterDesc}`
      : `Handcrafted lampshade matching reference photo with accurate taper, woven rattan texture, rolled rims, and ${initialFitterDesc}`
  );
  const [dimensions, setDimensions] = useState({ width: 0.35, height: 0.3, depth: 0.35 }); // in meters
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedModelUrl, setGeneratedModelUrl] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      const isBulb = /bulb|clip/i.test(productName);
      const desc = isBulb
        ? 'centered golden brass bulb clip-on attachment and light bulb'
        : '3-arm brass spider washer fitter';
      setFitterStyle('auto');
      setPrompt(
        productName
          ? `${productName} matching reference photo with accurate taper, woven rattan/linen texture, rolled rims, and ${desc}`
          : `Handcrafted lampshade matching reference photo with accurate taper, woven rattan texture, rolled rims, and ${desc}`
      );
    }
  }, [open, productName]);

  const handleFitterChange = (newFitter) => {
    setFitterStyle(newFitter);
    const isBulb = newFitter === 'bulb' || (newFitter === 'auto' && /bulb|clip/i.test(productName));
    const newDesc = isBulb
      ? 'centered golden brass bulb clip-on attachment and light bulb'
      : '3-arm brass spider washer fitter';
    
    // Replace old fitter description in prompt if present
    setPrompt((prev) => {
      let updated = prev
        .replace(/3-arm brass spider washer fitter|brass spider fitter/gi, newDesc)
        .replace(/centered golden brass bulb clip-on (fitter )?attachment and light bulb/gi, newDesc);
      if (!updated.includes(newDesc)) {
        updated += ` and ${newDesc}`;
      }
      return updated;
    });
  };

  const handleCustomFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomImagePreview(ev.target?.result);
      setSelectedImage('custom');
    };
    reader.readAsDataURL(file);
  };

  const activeImageSrc = selectedImage === 'custom'
    ? customImagePreview
    : (selectedImage ? resolveImageUrl(selectedImage) : '');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage('');
    setStatusMessage('Initializing 3D generation engine...');

    try {
      if (generationMode === 'ai') {
        // Mode 1: Backend PhotoTo3D API (Tripo3D / Meshy)
        setStatusMessage('Sending photo to AI reconstruction pipeline...');
        const formData = new FormData();
        if (customImageFile) {
          formData.append('image', customImageFile);
        } else if (activeImageSrc) {
          formData.append('imageUrl', activeImageSrc);
        } else {
          throw new Error('Please select or upload a product photo first.');
        }

        const res = await fetch('/api/generate-3d', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'AI generation failed. You can also use the Built-in Three.js Generator.');
        }

        setGeneratedModelUrl(data.glbUrl);
        setStatusMessage('AI 3D Model created successfully!');
      } else {
        // Mode 2: Client-side Prompt & Dimensions 3D Generator via @universal/image-to-3d-ar
        setStatusMessage('Importing 3D generator modules...');
        const { Prompt3DGenerator, ModelExporter } = await import('@universal/image-to-3d-ar');

        const generator = new Prompt3DGenerator({
          geminiApiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
        });

        // Convert selected image to Base64 so Gemini Vision can analyze every pixel
        setStatusMessage('Analyzing product photo textures and dimensions...');
        let imageBase64 = null;
        if (customImagePreview) {
          imageBase64 = customImagePreview;
        } else if (activeImageSrc) {
          try {
            const fetchRes = await fetch(activeImageSrc);
            const blob = await fetchRes.blob();
            imageBase64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.warn('[PhotoTo3DDialog] Direct image fetch failed, passing URL:', e);
            imageBase64 = activeImageSrc;
          }
        }

        let effectivePrompt = prompt || 'Product matching exact shape, colors, and components from reference photo';
        const isBulb = fitterStyle === 'bulb' || (fitterStyle === 'auto' && /bulb|clip/i.test(effectivePrompt + ' ' + productName));
        if (isBulb && !/bulb clip|clip-on/i.test(effectivePrompt)) {
          effectivePrompt += ' with centered golden brass bulb clip-on attachment and light bulb';
        } else if (fitterStyle === 'spider' && !/spider/i.test(effectivePrompt)) {
          effectivePrompt += ' with 3-arm brass spider washer fitter';
        }

        setStatusMessage('Generating 3D model geometry and PBR materials in Three.js...');
        let result;
        try {
          result = await generator.generate({
            prompt: effectivePrompt,
            dimensions,
            image: imageBase64,
            geminiApiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
            forceProcedural: false,
            onProgress: (msg) => setStatusMessage(msg),
          });
        } catch (genErr) {
          console.warn('[PhotoTo3DDialog] AI prompt generation fallback to Three.js procedural engine:', genErr);
          setStatusMessage('Synthesizing with Built-in Three.js Procedural Engine...');
          result = await generator.generate({
            prompt: effectivePrompt,
            dimensions,
            image: imageBase64,
            forceProcedural: true,
            onProgress: (msg) => setStatusMessage(msg),
          });
        }

        setStatusMessage('Compiling binary GLB package...');
        const exportRes = result.getGLB
          ? await result.getGLB()
          : (ModelExporter.exportToGLB ? await ModelExporter.exportToGLB(result.model) : await ModelExporter.exportGLB(result.model));
        const glbBlob = exportRes?.blob || (exportRes instanceof Blob ? exportRes : new Blob([exportRes.buffer || exportRes], { type: 'model/gltf-binary' }));

        // Upload generated GLB to server storage
        setStatusMessage('Saving 3D model to product AR storage...');
        const saveForm = new FormData();
        saveForm.append('model', glbBlob, 'model.glb');
        saveForm.append('format', 'glb');

        const uploadRes = await fetch('/api/generate-3d/save-model', {
          method: 'POST',
          body: saveForm,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || 'Failed to save generated 3D model on server.');
        }

        setGeneratedModelUrl(uploadData.fullUrl || uploadData.relativeUrl);
        setStatusMessage('3D Model generated and ready for AR!');
      }
    } catch (err) {
      console.error('3D Generation failed:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during 3D generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedModelUrl && onApplyModel) {
      onApplyModel(generatedModelUrl);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={isGenerating ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <AutoAwesomeIcon sx={{ color: '#0284c7' }} />
        <Box>
          <Typography variant="h6" fontWeight={700}>
            AI Photo-to-3D Model Generator
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Convert 2D product photos and specifications into interactive 3D & AR models
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Column: Image Selection & Config */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              1. Select Source Image
            </Typography>

            {productImages.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {productImages.map((img, idx) => (
                  <Box
                    key={idx}
                    onClick={() => {
                      setSelectedImage(img);
                      setCustomImageFile(null);
                    }}
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: selectedImage === img ? '#0284c7' : '#e2e8f0',
                      p: 0.5,
                      bgcolor: '#fff',
                    }}
                  >
                    <img
                      src={resolveImageUrl(img)}
                      alt={`Product image ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  </Box>
                ))}
              </Box>
            )}

            {/* Custom file upload */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleCustomFileUpload}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<CloudUploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ mb: 2.5, textTransform: 'none' }}
            >
              {customImageFile ? `Uploaded: ${customImageFile.name}` : 'Upload New Photo'}
            </Button>

            {activeImageSrc && (
              <Box
                sx={{
                  width: '100%',
                  height: 140,
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#f8fafc',
                  mb: 2.5,
                }}
              >
                <img
                  src={activeImageSrc}
                  alt="Active source"
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                />
              </Box>
            )}

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              2. Generation Engine
            </Typography>
            <RadioGroup
              value={generationMode}
              onChange={(e) => setGenerationMode(e.target.value)}
              sx={{ mb: 2 }}
            >
              <FormControlLabel
                value="procedural"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Three.js Prompt & Dimensions Engine (Instant / Free)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Synthesizes high-fidelity 3D meshes & PBR textures directly in Three.js
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="ai"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Neural Mesh AI Pipeline (Tripo3D / Meshy Cloud)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Requires API key in server/.env (Tripo3D / Meshy)
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>

            {generationMode === 'procedural' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="fitter-select-label">Attachment Fitter Hardware</InputLabel>
                  <Select
                    labelId="fitter-select-label"
                    value={fitterStyle}
                    label="Attachment Fitter Hardware"
                    onChange={(e) => handleFitterChange(e.target.value)}
                  >
                    <MenuItem value="auto">
                      Auto-Detect ({/bulb|clip/i.test(productName) ? 'Bulb Clip-On' : '3-Arm Spider Washer'})
                    </MenuItem>
                    <MenuItem value="bulb">
                      Bulb Clip-On (Golden Brass Wire Loops + Centered Light Bulb)
                    </MenuItem>
                    <MenuItem value="spider">
                      3-Arm Spider Washer (Recessed Brass Spokes + Collar)
                    </MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="3D Model Prompt / Description"
                  size="small"
                  fullWidth
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Modern drum lampshade with textured beige linen"
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="Width (m)"
                    size="small"
                    type="number"
                    value={dimensions.width}
                    onChange={(e) => setDimensions({ ...dimensions, width: parseFloat(e.target.value) || 0.1 })}
                    inputProps={{ step: 0.05 }}
                  />
                  <TextField
                    label="Height (m)"
                    size="small"
                    type="number"
                    value={dimensions.height}
                    onChange={(e) => setDimensions({ ...dimensions, height: parseFloat(e.target.value) || 0.1 })}
                    inputProps={{ step: 0.05 }}
                  />
                  <TextField
                    label="Depth (m)"
                    size="small"
                    type="number"
                    value={dimensions.depth}
                    onChange={(e) => setDimensions({ ...dimensions, depth: parseFloat(e.target.value) || 0.1 })}
                    inputProps={{ step: 0.05 }}
                  />
                </Box>
              </Box>
            )}

            <Button
              variant="contained"
              fullWidth
              disabled={isGenerating || (!activeImageSrc && generationMode === 'ai')}
              startIcon={isGenerating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
              onClick={handleGenerate}
              sx={{
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
                textTransform: 'none',
                fontWeight: 600,
                py: 1,
              }}
            >
              {isGenerating ? 'Generating 3D Model...' : 'Generate 3D Model'}
            </Button>

            {statusMessage && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#0284c7', fontWeight: 500 }}>
                {statusMessage}
              </Typography>
            )}
          </Grid>

          {/* Right Column: Live 3D Preview */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                3. Interactive 3D Preview
              </Typography>
              {generatedModelUrl && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label="Generated"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>

            <Box
              sx={{
                width: '100%',
                height: 360,
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                overflow: 'hidden',
                bgcolor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {generatedModelUrl ? (
                <ImageTo3DViewer
                  src={generatedModelUrl}
                  alt={productName || 'Generated 3D Model'}
                  autoRotate
                  realHeight={dimensions.height}
                  height="100%"
                  width="100%"
                />
              ) : (
                <Box sx={{ textAlign: 'center', p: 3, color: '#94a3b8' }}>
                  <ViewInArIcon sx={{ fontSize: 56, mb: 1, opacity: 0.6 }} />
                  <Typography variant="body2" fontWeight={500}>
                    No 3D Model Generated Yet
                  </Typography>
                  <Typography variant="caption">
                    Select an image on the left and click "Generate 3D Model" to see the live 3D preview here.
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isGenerating} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={!generatedModelUrl || isGenerating}
          sx={{
            bgcolor: '#0284c7',
            '&:hover': { bgcolor: '#0369a1' },
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Apply 3D Model to Product
        </Button>
      </DialogActions>
    </Dialog>
  );
}

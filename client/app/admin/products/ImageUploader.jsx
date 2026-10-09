'use client';
import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { resolveImageUrl } from '../../../lib/pricingUtils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function uploadFiles(files) {
  const form = new FormData();
  files.forEach((f) => form.append('images', f));
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: form });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || `Upload failed (${res.status})`);
  return json.urls;
}

async function removeFile(url) {
  try {
    await fetch(`${API_BASE}/upload`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch {
    // ignore delete errors
  }
}

/**
 * ImageUploader
 * Props:
 *   images   — string[]  current image URLs  (also accepts legacy `value` prop)
 *   onChange — (urls: string[]) => void
 *   max / maxImages — max number of images (default 10)
 *   label    — section label
 */
export default function ImageUploader({ images, value, onChange, max, maxImages, label = 'Images' }) {
  // Normalise: accept `images` or legacy `value`; accept `max` or `maxImages`
  const urls = images ?? value ?? [];
  const limit = max ?? maxImages ?? 10;

  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleFiles = async (files) => {
    const accepted = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!accepted.length) return;
    const toUpload = accepted.slice(0, limit - urls.length);
    if (!toUpload.length) return;
    setUploadError('');
    setUploading(true);
    try {
      const newUrls = await uploadFiles(toUpload);
      onChange([...urls, ...newUrls]);
    } catch (err) {
      console.error('[ImageUploader] upload error:', err);
      setUploadError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (url, idx) => {
    onChange(urls.filter((_, i) => i !== idx));
    removeFile(url);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <Box>
      {label && (
        <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
          {label}
        </Typography>
      )}

      {/* Drop zone — only shown when under the limit */}
      {urls.length < limit && (
        <Box
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          sx={{
            border: '2px dashed',
            borderColor: dragging ? 'primary.main' : 'divider',
            borderRadius: 2,
            p: 2,
            mb: urls.length > 0 ? 2 : 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            cursor: uploading ? 'not-allowed' : 'pointer',
            bgcolor: dragging ? 'primary.50' : 'grey.50',
            transition: 'all 0.15s',
            minHeight: 80,
            '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
          }}
        >
          {uploading ? (
            <CircularProgress size={24} />
          ) : (
            <>
              <CloudUploadIcon sx={{ color: 'text.disabled', fontSize: 28 }} />
              <Typography variant="caption" color="text.secondary" textAlign="center">
                Click or drag images here
              </Typography>
              <Typography variant="caption" color="text.disabled">
                JPG, PNG, WebP · max {limit} image{limit !== 1 ? 's' : ''}
              </Typography>
            </>
          )}
        </Box>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />

      {uploadError && (
        <Typography variant="caption" color="error" display="block" mb={1}>
          {uploadError}
        </Typography>
      )}

      {/* Existing image previews with remove buttons */}
      {urls.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 0.5 }}>
          {urls.map((url, i) => (
            <Box
              key={`${url}-${i}`}
              sx={{
                position: 'relative',
                width: 80,
                height: 80,
                flexShrink: 0,
                mb: 2.5,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  border: '2px solid',
                  borderColor: i === 0 ? 'primary.main' : 'divider',
                }}
              >
                <img
                  src={resolveImageUrl(url)}
                  alt={`image-${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </Box>
              {i === 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute', bottom: -16, left: 0, right: 0,
                    textAlign: 'center', fontSize: 10, color: 'primary.main', fontWeight: 600,
                  }}
                >
                  Main
                </Typography>
              )}
              <Tooltip title="Remove image">
                <IconButton
                  size="small"
                  onClick={() => handleRemove(url, i)}
                  sx={{
                    position: 'absolute', top: -8, right: -8,
                    bgcolor: 'error.main', color: 'white', width: 22, height: 22,
                    '&:hover': { bgcolor: 'error.dark' },
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

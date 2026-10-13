'use client';
import { useState, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';

export default function ProductImageMagnifier({
  src,
  alt = 'Product Image',
  onLoad,
  onError,
  isLoading = false,
  zoomScale = 2.4,
}) {
  const containerRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current || isLoading) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setOrigin(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }, [isLoading]);

  const handleMouseEnter = useCallback(() => {
    if (!isLoading && src) setIsZoomed(true);
  }, [isLoading, src]);

  const handleMouseLeave = useCallback(() => {
    setIsZoomed(false);
    setOrigin('50% 50%');
  }, []);

  return (
    <>
      <Box
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: src ? (isZoomed ? 'zoom-out' : 'zoom-in') : 'default',
          userSelect: 'none',
        }}
      >
        {src ? (
          <Box
            component="img"
            key={src}
            src={src}
            alt={alt}
            onLoad={onLoad}
            onError={onError}
            sx={{
              maxWidth: '92%',
              maxHeight: '92%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              pointerEvents: 'none',
              transformOrigin: origin,
              transform: isZoomed && !isLoading ? `scale(${zoomScale})` : 'scale(1)',
              transition: isZoomed
                ? 'transform 0.08s ease-out'
                : 'transform 0.25s ease-out, opacity 0.2s ease',
              opacity: isLoading ? 0.35 : 1,
            }}
          />
        ) : (
          <Typography color="text.secondary">No Image Available</Typography>
        )}

        {/* Floating Zoom Hint Badge */}
        {src && !isLoading && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              gap: 0.5,
              bgcolor: 'rgba(15, 23, 42, 0.72)',
              color: '#ffffff',
              px: 1.25,
              py: 0.5,
              borderRadius: '20px',
              fontSize: 11.5,
              fontWeight: 600,
              backdropFilter: 'blur(4px)',
              pointerEvents: 'none',
              opacity: isZoomed ? 0 : 0.9,
              transition: 'opacity 0.2s ease',
              zIndex: 2,
            }}
          >
            <ZoomInIcon sx={{ fontSize: 15 }} />
            <span>Hover to zoom</span>
          </Box>
        )}

        {/* Fullscreen Expansion Button */}
        {src && !isLoading && (
          <Tooltip title="View full size" placement="top">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                color: '#0f172a',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0',
                '&:hover': {
                  bgcolor: '#ffffff',
                  color: '#0284c7',
                },
                zIndex: 2,
              }}
            >
              <FullscreenIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Loading Spinner Overlay */}
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(255, 255, 255, 0.75)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(2px)',
              zIndex: 3,
              gap: 1.25,
            }}
          >
            <CircularProgress size={36} thickness={4} sx={{ color: '#0284c7' }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
              Crafting in progress...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Lightbox Modal */}
      <Dialog
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: '#ffffff',
            p: 3,
            position: 'relative',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          },
        }}
      >
        <IconButton
          onClick={() => setLightboxOpen(false)}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            bgcolor: 'rgba(15, 23, 42, 0.06)',
            '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.12)' },
          }}
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a', mb: 2, alignSelf: 'flex-start' }}>
          {alt}
        </Typography>
        <Box
          component="img"
          src={src}
          alt={alt}
          sx={{
            maxWidth: '100%',
            maxHeight: '75vh',
            objectFit: 'contain',
            borderRadius: '8px',
          }}
        />
      </Dialog>
    </>
  );
}

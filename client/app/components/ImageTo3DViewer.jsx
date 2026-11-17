'use client';
import { useEffect, useState, useRef } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

/**
 * Universal ImageTo3DViewer React Wrapper
 * Encapsulates the Web Component <image-to-3d-viewer> from @universal/image-to-3d-ar
 */
export default function ImageTo3DViewer({
  src,
  usdzSrc,
  alt = '3D Product Model',
  realHeight = 0.5,
  autoRotate = false,
  height = '100%',
  width = '100%',
  style = {},
  className = '',
  onARLaunch,
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    // Dynamically import the library client-side only (avoid SSR HTMLElement errors)
    import('@universal/image-to-3d-ar')
      .then(() => {
        if (mounted) {
          setIsLoaded(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load @universal/image-to-3d-ar:', err);
        if (mounted) {
          setLoadError('Failed to load 3D engine components.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const el = viewerRef.current;
    if (!el || !onARLaunch) return;

    const handleAR = (e) => onARLaunch(e.detail);
    el.addEventListener('ar-launch', handleAR);
    return () => {
      el.removeEventListener('ar-launch', handleAR);
    };
  }, [onARLaunch, isLoaded]);

  if (loadError) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f8fafc',
          color: '#ef4444',
          p: 2,
          textAlign: 'center',
          ...style,
        }}
      >
        <Typography variant="body2">{loadError}</Typography>
      </Box>
    );
  }

  if (!isLoaded) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f8fafc',
          gap: 1.5,
          minHeight: 280,
          ...style,
        }}
      >
        <CircularProgress size={36} sx={{ color: '#0284c7' }} />
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
          Initializing 3D AR Viewer...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#f1f5f9',
        ...style,
      }}
      className={className}
    >
      <image-to-3d-viewer
        ref={viewerRef}
        src={src || ''}
        usdz-src={usdzSrc || ''}
        alt={alt}
        real-height={String(realHeight)}
        auto-rotate={autoRotate ? '' : undefined}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </Box>
  );
}

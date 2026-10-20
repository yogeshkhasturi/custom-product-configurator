'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// MUI Components
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PublicIcon from '@mui/icons-material/Public';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import IosShareIcon from '@mui/icons-material/IosShare';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import TuneIcon from '@mui/icons-material/Tune';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LaunchIcon from '@mui/icons-material/Launch';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import XIcon from '@mui/icons-material/X';

import {
  getProjectById,
  cloneProject,
  orderProjectToCart,
} from '../../../lib/projectsStorage';

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Interaction feedback states
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [toastMessage, setToastMessage] = useState({ open: false, text: '', severity: 'success' });

  useEffect(() => {
    if (!projectId) return;
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await getProjectById(projectId);
      if (data) {
        setProject(data);
        document.title = `${data.name} | Fenchel Shades Projects`;
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text, severity = 'success') => {
    setToastMessage({ open: true, text, severity });
  };

  const handleShareNavigator = async () => {
    if (typeof window === 'undefined') return;
    const currentUrl = window.location.href;
    const shareData = {
      title: `${project?.name || 'Project'} | Fenchel Shades`,
      text: project?.description
        ? `${project.name} - ${project.description}`
        : `Check out this custom lampshade collection "${project?.name}" by ${project?.creatorName || 'Community Designer'} on Fenchel Shades!`,
      url: currentUrl,
    };

    // Open native device navigator share sheet (WhatsApp, Email, Slack, Twitter/X, etc.)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('Shared successfully!');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User closed the native share dialog
        console.warn('Navigator share error, falling back to copy:', err);
      }
    }

    // Fallback: Copy to clipboard if navigator.share is unsupported
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      showToast('Project link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (err) {
      showToast('Could not copy link to clipboard.', 'error');
    }
  };

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast('Direct project link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleShareToPlatform = (platform) => {
    if (typeof window === 'undefined') return;
    const currentUrl = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(`${project?.name || 'Project'} | Fenchel Shades`);
    const summary = encodeURIComponent(
      project?.description
        ? `${project.name} - ${project.description}`
        : `Explore this custom lampshade collection "${project?.name}" on Fenchel Shades!`
    );

    let targetUrl = '';
    switch (platform) {
      case 'whatsapp':
        targetUrl = `https://api.whatsapp.com/send?text=${summary}%20${currentUrl}`;
        break;
      case 'email':
        targetUrl = `mailto:?subject=${title}&body=${summary}%0A%0A${currentUrl}`;
        break;
      case 'x':
        targetUrl = `https://twitter.com/intent/tweet?text=${summary}&url=${currentUrl}`;
        break;
      case 'linkedin':
        targetUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`;
        break;
      default:
        handleShareNavigator();
        return;
    }

    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleClone = async () => {
    if (!project) return;
    setIsCloning(true);
    try {
      const cloned = await cloneProject(project.id, `${project.name} (My Copy)`);
      if (cloned) {
        showToast(`Project cloned successfully! Redirecting to workspace...`);
        setTimeout(() => {
          router.push('/projects');
        }, 1200);
      } else {
        showToast('Could not duplicate project. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Cloning error:', err);
      showToast('Error cloning project.', 'error');
    } finally {
      setIsCloning(false);
    }
  };

  const handleOrder = async () => {
    if (!project || !project.items || project.items.length === 0) return;
    setIsOrdering(true);
    try {
      const res = await orderProjectToCart(project.id, project);
      if (res?.success) {
        showToast(`Added ${res.totalUnits} custom shades from "${project.name}" to your cart!`);
        setProject((prev) => ({ ...prev, status: 'ordered', orderedAt: new Date().toISOString() }));
      } else {
        showToast(res?.message || 'Failed to order project.', 'error');
      }
    } catch (err) {
      console.error('Order error:', err);
      showToast('Error ordering project.', 'error');
    } finally {
      setIsOrdering(false);
    }
  };

  // Calculations
  const itemCount = project?.items?.length || 0;
  const totalUnits = project?.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
  const totalPrice = project?.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0;

  // 1. Loading State
  if (loading) {
    return (
      <Box sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={48} sx={{ color: '#0284c7', mb: 2 }} />
        <Typography sx={{ color: '#64748b', fontSize: 16, fontWeight: 500 }}>
          Loading project specifications...
        </Typography>
      </Box>
    );
  }

  // 2. Not Found State
  if (notFound || !project) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', py: 10, px: 3, textAlign: 'center' }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: '20px',
            border: '1px dashed #cbd5e1',
            bgcolor: '#fff',
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 64, color: '#ef4444', mb: 2 }} />
          <Typography variant="h5" fontWeight={800} sx={{ color: '#0f172a', mb: 1 }}>
            Project Not Found
          </Typography>
          <Typography sx={{ color: '#64748b', mb: 4, maxWidth: 460, mx: 'auto', fontSize: 14 }}>
            The project you are looking for may have been removed, made private by its creator, or the link might be incorrect.
          </Typography>
          <Button
            component={Link}
            href="/projects"
            variant="contained"
            startIcon={<ArrowBackIcon />}
            sx={{
              bgcolor: '#0f172a',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              py: 1,
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            Back to Projects Showcase
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', pb: 10 }}>
      {/* Top Breadcrumb & Navigation Bar */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', py: 2 }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" sx={{ color: '#94a3b8' }} />} aria-label="breadcrumb">
            <Link href="/" style={{ textDecoration: 'none', color: '#64748b', fontSize: 13, fontWeight: 500 }}>
              Home
            </Link>
            <Link href="/projects" style={{ textDecoration: 'none', color: '#64748b', fontSize: 13, fontWeight: 500 }}>
              Projects
            </Link>
            <Typography sx={{ color: '#0f172a', fontSize: 13, fontWeight: 700 }}>
              {project.name}
            </Typography>
          </Breadcrumbs>

          <Button
            component={Link}
            href="/projects"
            size="small"
            startIcon={<ArrowBackIcon />}
            sx={{
              textTransform: 'none',
              color: '#475569',
              fontWeight: 600,
              fontSize: 13,
              '&:hover': { color: '#0f172a', bgcolor: '#f1f5f9' },
            }}
          >
            Back to All Projects
          </Button>
        </Box>
      </Box>

      {/* Main Container */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, pt: 4 }}>
        {/* Project Hero Banner */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4.5 },
            mb: 4,
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 70%, #0369a1 100%)',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            {/* Meta Tags Row */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
              <Chip
                icon={
                  project.isPublic ? (
                    <PublicIcon sx={{ fontSize: '14px !important', color: '#38bdf8' }} />
                  ) : (
                    <LockOutlinedIcon sx={{ fontSize: '14px !important', color: '#cbd5e1' }} />
                  )
                }
                label={project.isPublic ? 'Public Project Showcase' : 'Private Project'}
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 11,
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
              {project.status === 'ordered' && (
                <Chip
                  icon={<CheckCircleOutlineIcon sx={{ fontSize: '14px !important', color: '#86efac' }} />}
                  label="Ordered"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(34, 197, 94, 0.25)',
                    color: '#bbf7d0',
                    fontWeight: 700,
                    fontSize: 11,
                    border: '1px solid rgba(134, 239, 172, 0.3)',
                  }}
                />
              )}
              <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                Created on {new Date(project.createdAt || Date.now()).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Typography>
            </Box>

            {/* Title & Creator */}
            <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: 26, sm: 34, md: 40 }, mb: 1, lineHeight: 1.2 }}>
              {project.name}
            </Typography>

            <Typography sx={{ fontSize: { xs: 14, sm: 16 }, color: '#cbd5e1', mb: 2 }}>
              Curated by <strong style={{ color: '#fff' }}>{project.creatorName || 'Community Designer'}</strong>
            </Typography>

            {/* Description */}
            {project.description && (
              <Typography sx={{ color: '#94a3b8', fontSize: 14, maxWidth: 800, lineHeight: 1.6, mb: 3 }}>
                {project.description}
              </Typography>
            )}

            {/* Quick Action Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, pt: 1 }}>
              <Button
                variant="contained"
                onClick={handleShareNavigator}
                startIcon={<IosShareIcon />}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  px: 2.2,
                  py: 1,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.32)',
                  },
                }}
              >
                Share via Apps (Navigator)
              </Button>

              <Button
                variant="outlined"
                disabled={isCloning}
                onClick={handleClone}
                startIcon={isCloning ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <ContentCopyIcon />}
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.4)',
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  px: 2,
                  py: 1,
                  '&:hover': {
                    borderColor: '#fff',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                {isCloning ? 'Cloning...' : 'Clone to My Projects'}
              </Button>

              <Button
                variant="contained"
                disabled={isOrdering || itemCount === 0}
                onClick={handleOrder}
                startIcon={isOrdering ? <CircularProgress size={16} sx={{ color: '#0f172a' }} /> : <ShoppingCartOutlinedIcon />}
                sx={{
                  bgcolor: '#38bdf8',
                  color: '#0f172a',
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: 13,
                  px: 2.5,
                  py: 1,
                  '&:hover': { bgcolor: '#7dd3fc' },
                  '&:disabled': { bgcolor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)' },
                }}
              >
                {isOrdering ? 'Adding to Cart...' : 'Order Entire Project'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Multi-Platform Share Station */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            mb: 4,
            borderRadius: '20px',
            bgcolor: '#fff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              mb: 2.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284c7',
                  flexShrink: 0,
                }}
              >
                <IosShareIcon />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  Share Across Multiple Platforms
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                  Open your system navigator share sheet or choose a platform below to share this custom lampshade project.
                </Typography>
              </Box>
            </Box>

            {/* Main Navigator trigger button */}
            <Button
              variant="contained"
              onClick={handleShareNavigator}
              startIcon={<IosShareIcon />}
              sx={{
                bgcolor: '#0284c7',
                color: '#fff',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 13,
                px: 2.5,
                py: 1,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#0369a1' },
              }}
            >
              Open Device Share (Navigator)
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Quick Platform Icons + Direct Link Bar */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              alignItems: { lg: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            {/* Quick platform buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748b', mr: 0.5 }}>
                Share to:
              </Typography>

              {/* WhatsApp */}
              <Tooltip title="Share on WhatsApp">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleShareToPlatform('whatsapp')}
                  startIcon={<WhatsAppIcon sx={{ color: '#25D366' }} />}
                  sx={{
                    borderRadius: '8px',
                    borderColor: '#cbd5e1',
                    color: '#1e293b',
                    textTransform: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    bgcolor: '#fff',
                    '&:hover': { borderColor: '#25D366', bgcolor: '#f0fdf4' },
                  }}
                >
                  WhatsApp
                </Button>
              </Tooltip>

              {/* Email */}
              <Tooltip title="Send via Email">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleShareToPlatform('email')}
                  startIcon={<EmailOutlinedIcon sx={{ color: '#0284c7' }} />}
                  sx={{
                    borderRadius: '8px',
                    borderColor: '#cbd5e1',
                    color: '#1e293b',
                    textTransform: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    bgcolor: '#fff',
                    '&:hover': { borderColor: '#0284c7', bgcolor: '#f0f9ff' },
                  }}
                >
                  Email
                </Button>
              </Tooltip>

              {/* LinkedIn */}
              <Tooltip title="Share on LinkedIn">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleShareToPlatform('linkedin')}
                  startIcon={<LinkedInIcon sx={{ color: '#0a66c2' }} />}
                  sx={{
                    borderRadius: '8px',
                    borderColor: '#cbd5e1',
                    color: '#1e293b',
                    textTransform: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    bgcolor: '#fff',
                    '&:hover': { borderColor: '#0a66c2', bgcolor: '#f0f9ff' },
                  }}
                >
                  LinkedIn
                </Button>
              </Tooltip>

              {/* X (Twitter) */}
              <Tooltip title="Share on X (Twitter)">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleShareToPlatform('x')}
                  startIcon={<XIcon sx={{ color: '#0f172a' }} />}
                  sx={{
                    borderRadius: '8px',
                    borderColor: '#cbd5e1',
                    color: '#1e293b',
                    textTransform: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    bgcolor: '#fff',
                    '&:hover': { borderColor: '#0f172a', bgcolor: '#f8fafc' },
                  }}
                >
                  X
                </Button>
              </Tooltip>
            </Box>

            {/* Direct URL input with Copy button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: { md: 420 } }}>
              <TextField
                fullWidth
                size="small"
                readOnly
                value={typeof window !== 'undefined' ? window.location.href : ''}
                InputProps={{
                  readOnly: true,
                  sx: { fontSize: 12, bgcolor: '#f8fafc', borderRadius: '8px' },
                }}
              />
              <Button
                variant="contained"
                onClick={handleCopyLink}
                startIcon={copiedLink ? <CheckIcon /> : <ContentCopyIcon />}
                sx={{
                  bgcolor: '#0f172a',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 12,
                  px: 2,
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: '#1e293b' },
                }}
              >
                {copiedLink ? 'Copied' : 'Copy Link'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* 2-Column Content Layout: Items on Left, Order Summary on Right */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' },
            gap: 4,
            alignItems: 'start',
          }}
        >
          {/* Left Column: Configured Shades List */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a' }}>
                  Configured Areas & Shades
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#64748b' }}>
                  {itemCount} {itemCount === 1 ? 'room / space' : 'rooms / spaces'} configured · {totalUnits} total lampshades
                </Typography>
              </Box>
            </Box>

            {itemCount === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 6,
                  textAlign: 'center',
                  borderRadius: '16px',
                  border: '1px dashed #cbd5e1',
                  bgcolor: '#fff',
                }}
              >
                <LayersOutlinedIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
                <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a', mb: 1 }}>
                  No shades in this project yet
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: 14, mb: 3 }}>
                  Browse our handcrafted lampshades to configure custom shapes, fabrics, and dimensions.
                </Typography>
                <Button
                  component={Link}
                  href="/products"
                  variant="contained"
                  sx={{ bgcolor: '#0f172a', borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                >
                  Browse Lampshades
                </Button>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {project.items.map((item, idx) => (
                  <Paper
                    key={item.id || idx}
                    elevation={0}
                    sx={{
                      p: { xs: 2.5, sm: 3 },
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      bgcolor: '#fff',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#cbd5e1',
                        boxShadow: '0 6px 20px rgba(15, 23, 42, 0.05)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { sm: 'flex-start' },
                        gap: 2.5,
                      }}
                    >
                      {/* Product Thumbnail */}
                      <Box
                        sx={{
                          width: { xs: '100%', sm: 110 },
                          height: { xs: 180, sm: 110 },
                          borderRadius: '12px',
                          bgcolor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          p: 1,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.productName}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                            No Image
                          </Typography>
                        )}
                      </Box>

                      {/* Info & Specs */}
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                          <Chip
                            label={item.areaName || `Area #${idx + 1}`}
                            size="small"
                            sx={{
                              bgcolor: '#0f172a',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: 11,
                              borderRadius: '6px',
                            }}
                          />
                          {item.sku && (
                            <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                              SKU: {item.sku}
                            </Typography>
                          )}
                        </Box>

                        <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a', fontSize: 18, mb: 1 }}>
                          {item.productName}
                        </Typography>

                        {/* Summary Specification Rows / Chips */}
                        {item.summaryRows && item.summaryRows.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                            {item.summaryRows.map((spec, sIdx) => (
                              <Chip
                                key={sIdx}
                                label={
                                  <span>
                                    <strong style={{ color: '#334155' }}>{spec.label}:</strong> {spec.value}
                                  </span>
                                }
                                size="small"
                                sx={{
                                  fontSize: 12,
                                  bgcolor: '#f1f5f9',
                                  border: '1px solid #e2e8f0',
                                  color: '#475569',
                                  height: 26,
                                }}
                              />
                            ))}
                          </Box>
                        )}

                        {/* Bottom Row: Link to Product + Price Calculation */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1.5,
                            pt: 1.5,
                            borderTop: '1px dashed #e2e8f0',
                          }}
                        >
                          {item.productId ? (
                            <Button
                              component={Link}
                              href={`/products/${item.productId}`}
                              size="small"
                              endIcon={<LaunchIcon sx={{ fontSize: '14px !important' }} />}
                              sx={{
                                textTransform: 'none',
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#0284c7',
                                p: 0,
                                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                              }}
                            >
                              View Base Model
                            </Button>
                          ) : (
                            <Box />
                          )}

                          <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                              Quantity: <strong>{item.quantity}</strong> × ${Number(item.unitPrice || 0).toFixed(2)}
                            </Typography>
                            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0284c7' }}>
                              ${Number(item.totalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>

          {/* Right Column: Order Summary & Sidebar Info */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Price & Checkout Card */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#fff',
                position: { lg: 'sticky' },
                top: { lg: 24 },
              }}
            >
              <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a', mb: 2 }}>
                Project Summary
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ fontSize: 14, color: '#64748b' }}>Total Areas</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{itemCount}</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ fontSize: 14, color: '#64748b' }}>Total Lampshades</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{totalUnits} units</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: 14, color: '#64748b' }}>Estimated Subtotal</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  ${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 3 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Total Cost
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#0284c7' }}>
                  ${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>

              {/* Order Project Button */}
              <Button
                variant="contained"
                fullWidth
                disabled={isOrdering || itemCount === 0}
                onClick={handleOrder}
                startIcon={isOrdering ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <ShoppingCartOutlinedIcon />}
                sx={{
                  bgcolor: '#0f172a',
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: 14,
                  py: 1.5,
                  mb: 1.5,
                  '&:hover': { bgcolor: '#1e293b' },
                }}
              >
                {isOrdering ? 'Ordering...' : 'Order Entire Project'}
              </Button>

              {/* Clone Button */}
              <Button
                variant="outlined"
                fullWidth
                disabled={isCloning}
                onClick={handleClone}
                startIcon={isCloning ? <CircularProgress size={16} /> : <ContentCopyIcon />}
                sx={{
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  py: 1.25,
                  borderColor: '#cbd5e1',
                  color: '#334155',
                  '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                }}
              >
                Clone into My Workspace
              </Button>

              <Typography sx={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', mt: 2, lineHeight: 1.4 }}>
                Cloning saves an editable duplicate to your browser workspace so you can customize dimensions or add new rooms.
              </Typography>
            </Paper>

            {/* Designer / Project Details Card */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#fff',
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', mb: 1.5, letterSpacing: '0.05em' }}>
                Curator Information
              </Typography>

              <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                {project.creatorName || 'Community Designer'}
              </Typography>

              <Typography sx={{ fontSize: 12, color: '#64748b', mb: 2 }}>
                Status: {project.isPublic ? 'Public Showcase' : 'Private Workspace'}
              </Typography>

              <Button
                component={Link}
                href="/projects"
                size="small"
                fullWidth
                sx={{
                  bgcolor: '#f1f5f9',
                  color: '#334155',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 12,
                  py: 1,
                  '&:hover': { bgcolor: '#e2e8f0' },
                }}
              >
                Explore More Projects
              </Button>
            </Paper>
          </Box>
        </Box>
      </Box>

      {/* Snackbar Notification */}
      <Snackbar
        open={toastMessage.open}
        autoHideDuration={4000}
        onClose={() => setToastMessage((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toastMessage.severity}
          onClose={() => setToastMessage((prev) => ({ ...prev, open: false }))}
          sx={{ borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontWeight: 600 }}
        >
          {toastMessage.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}

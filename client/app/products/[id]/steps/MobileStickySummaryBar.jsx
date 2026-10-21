'use client';
import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function MobileStickySummaryBar({
  product,
  stepsConfig = [],
  stepSelections = {},
  currentStep = 0,
  totalSteps = 1,
  isReviewStep = false,
  progress = 0,
  priceResult,
  gallery = [],
  activeImage = 0,
  isConfigResolving = false,
  onContinue,
  onBack,
  onGoToStep,
  onAddToCart,
  isSubmitting = false,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Compute live final price
  const finalPrice = priceResult?.finalPrice ?? product?.basePrice ?? 0;
  const isLastConfigStep = currentStep === totalSteps - 2;

  // Build summary rows for the bottom sheet
  const summaryRows = useMemo(() => {
    const rows = [];
    const enabledSteps = (stepsConfig || [])
      .filter((s) => s.enabled && s.type !== 'review')
      .sort((a, b) => a.order - b.order);

    for (const step of enabledSteps) {
      const stepSel = stepSelections[step.id] || {};
      for (const field of step.fields || []) {
        const val = stepSel[field.name];
        if (val === undefined || val === null || val === '') continue;

        if (field.type === 'dimensions') {
          for (const dim of field.dimensions || []) {
            const dimVal = val[dim.name];
            if (dimVal !== undefined && dimVal !== '') {
              rows.push({
                stepId: step.id,
                stepTitle: step.title,
                label: dim.label || dim.name,
                value: `${dimVal} ${dim.unit || 'in'}`,
              });
            }
          }
        } else if (field.type === 'checkbox' || field.type === 'multi_select') {
          const checked = Array.isArray(val) ? val : [val];
          if (checked.length > 0) {
            const labels = checked
              .map((v) => (field.options || []).find((o) => o.value === v)?.label || v)
              .join(', ');
            rows.push({
              stepId: step.id,
              stepTitle: step.title,
              label: field.label || field.name,
              value: labels,
            });
          }
        } else {
          const opt = (field.options || []).find((o) => o.value === val);
          rows.push({
            stepId: step.id,
            stepTitle: step.title,
            label: field.label || field.name,
            value: opt?.label || val,
          });
        }
      }
    }
    return rows;
  }, [stepsConfig, stepSelections]);

  // Compact snippet for the sticky bar pill
  const quickSpecsSnippet = useMemo(() => {
    if (!summaryRows.length) return 'Custom Shade';
    // E.g. "Top 2.5", "Burlap", "Bulb"
    const keyVals = summaryRows.slice(0, 3).map((r) => r.value);
    return keyVals.join(' • ');
  }, [summaryRows]);

  const handleEditFromDrawer = (stepId) => {
    setDrawerOpen(false);
    const stepIdx = (stepsConfig || []).findIndex((s) => s.id === stepId);
    if (stepIdx >= 0) {
      onGoToStep?.(stepIdx);
    }
  };

  return (
    <>
      {/* ── STICKY BAR CONTAINER (Mobile & Tablet only) ── */}
      <Box
        sx={{
          display: { xs: 'block', lg: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1150,
          bgcolor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -4px 24px rgba(15, 23, 42, 0.08)',
          pt: 1,
          pb: 'max(10px, env(safe-area-inset-bottom, 10px))',
          px: { xs: 1.5, sm: 2.5 },
          transition: 'all 0.25s ease',
        }}
      >
        {/* Top Progress Line */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            bgcolor: '#f1f5f9',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${Math.min(100, Math.max(5, progress))}%`,
              background: 'linear-gradient(90deg, #0284c7 0%, #0f172a 100%)',
              transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </Box>

        {/* Main Bar Content */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          {/* Left: Price & Quick Specs Toggle */}
          <Box
            onClick={() => setDrawerOpen(true)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              userSelect: 'none',
              minWidth: 0,
              flex: 1,
              py: 0.25,
              borderRadius: '8px',
              transition: 'opacity 0.15s ease',
              '&:active': { opacity: 0.75 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {isConfigResolving ? (
                <CircularProgress size={16} sx={{ color: '#0284c7' }} />
              ) : (
                <Typography
                  sx={{
                    fontSize: { xs: 20, sm: 22 },
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  ${finalPrice.toFixed(2)}
                </Typography>
              )}

              {/* Specs pill / indicator */}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.25,
                  bgcolor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  px: 0.85,
                  py: 0.2,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#0284c7',
                }}
              >
                <span>Specs</span>
                <KeyboardArrowUpIcon sx={{ fontSize: 13 }} />
              </Box>
            </Box>

            <Typography
              sx={{
                fontSize: 11,
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                mt: 0.25,
              }}
            >
              Step {currentStep + 1}/{totalSteps}: {quickSpecsSnippet}
            </Typography>
          </Box>

          {/* Right: Step Action Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {currentStep > 0 && !isReviewStep && (
              <Button
                variant="outlined"
                size="small"
                onClick={onBack}
                sx={{
                  minWidth: 40,
                  width: 40,
                  height: 42,
                  p: 0,
                  borderRadius: '10px',
                  borderColor: '#cbd5e1',
                  color: '#475569',
                  '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                }}
                aria-label="Previous step"
              >
                <ArrowBackIcon sx={{ fontSize: 18 }} />
              </Button>
            )}

            {!isReviewStep ? (
              <Button
                variant="contained"
                onClick={onContinue}
                endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                sx={{
                  height: 42,
                  px: { xs: 2, sm: 3 },
                  borderRadius: '10px',
                  bgcolor: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 13.5,
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                  '&:hover': {
                    bgcolor: '#1e293b',
                    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.3)',
                  },
                }}
              >
                {isLastConfigStep ? 'Review' : 'Continue'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => onAddToCart?.(1)}
                disabled={isSubmitting}
                startIcon={
                  isSubmitting ? (
                    <CircularProgress size={16} sx={{ color: '#fff' }} />
                  ) : (
                    <ShoppingBagOutlinedIcon sx={{ fontSize: 16 }} />
                  )
                }
                sx={{
                  height: 42,
                  px: { xs: 2, sm: 3 },
                  borderRadius: '10px',
                  bgcolor: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 13.5,
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                  '&:hover': {
                    bgcolor: '#0369a1',
                    boxShadow: '0 6px 18px rgba(2, 132, 199, 0.4)',
                  },
                }}
              >
                {isSubmitting ? 'Adding…' : 'Add to Cart'}
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── EXPANDABLE SLIDE-UP BOTTOM SHEET (Drawer) ── */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            maxHeight: '84vh',
            overflowY: 'auto',
            bgcolor: '#ffffff',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
            p: { xs: 2, sm: 3 },
          },
        }}
      >
        {/* Grab Handle Pill */}
        <Box
          sx={{
            width: 40,
            height: 4.5,
            bgcolor: '#cbd5e1',
            borderRadius: '3px',
            mx: 'auto',
            mb: 2,
            cursor: 'pointer',
          }}
          onClick={() => setDrawerOpen(false)}
        />

        {/* Drawer Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              Your Custom Lampshade
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748b' }}>
              SKU: {product?.sku || 'CUSTOM'} • Step {currentStep + 1} of {totalSteps}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setDrawerOpen(false)}
            sx={{ color: '#64748b', bgcolor: '#f1f5f9' }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Product Preview Card */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 1.5,
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            mb: 2.5,
          }}
        >
          {gallery?.length > 0 && (
            <Box
              sx={{
                width: 64,
                height: 64,
                flexShrink: 0,
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                p: 0.5,
              }}
            >
              <img
                src={gallery[activeImage] || gallery[0]}
                alt={product?.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }} noWrap>
              {product?.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
              <CheckCircleIcon sx={{ fontSize: 13, color: '#16a34a' }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#16a34a' }}>
                Handcrafted & Made to Order
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
              ${finalPrice.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {/* Configuration Specs List */}
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#94a3b8',
            mb: 1,
          }}
        >
          Configuration Details
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', mb: 2.5 }}>
          {summaryRows.length > 0 ? (
            summaryRows.map((row, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <Typography sx={{ fontSize: 13, color: '#64748b' }}>
                  {row.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                    {row.value}
                  </Typography>
                  <Box
                    component="button"
                    onClick={() => handleEditFromDrawer(row.stepId)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.25,
                      border: 'none',
                      bgcolor: 'transparent',
                      color: '#0284c7',
                      cursor: 'pointer',
                      fontSize: 11.5,
                      fontWeight: 600,
                      p: 0.5,
                      borderRadius: '4px',
                      '&:hover': { bgcolor: '#f0f9ff' },
                    }}
                  >
                    <EditOutlinedIcon sx={{ fontSize: 13 }} />
                    <span>Edit</span>
                  </Box>
                </Box>
              </Box>
            ))
          ) : (
            <Typography sx={{ fontSize: 12.5, color: '#94a3b8', py: 1 }}>
              Configure your options above to see them summarized here.
            </Typography>
          )}
        </Box>

        {/* Price Breakdown */}
        {priceResult?.adjustments?.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#94a3b8',
                mb: 1,
              }}
            >
              Price Breakdown
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>Base Price</Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>
                ${(priceResult.basePrice ?? product.basePrice).toFixed(2)}
              </Typography>
            </Box>
            {priceResult.adjustments.map((adj, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>
                  {adj.field}{adj.selection ? ` (${adj.selection})` : ''}
                </Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>
                  {adj.amount >= 0 ? '+' : ''}${adj.amount.toFixed(2)}
                </Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Total</Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0284c7' }}>
                ${finalPrice.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Drawer Action Button */}
        <Button
          fullWidth
          variant="contained"
          onClick={() => {
            setDrawerOpen(false);
            if (isReviewStep) {
              onAddToCart?.(1);
            } else {
              onContinue?.();
            }
          }}
          disabled={isSubmitting}
          sx={{
            py: 1.5,
            borderRadius: '12px',
            bgcolor: '#0f172a',
            fontWeight: 700,
            fontSize: 15,
            textTransform: 'none',
            '&:hover': { bgcolor: '#1e293b' },
          }}
        >
          {isReviewStep ? 'Add to Cart' : isLastConfigStep ? 'Continue to Review' : 'Continue Configuration'}
        </Button>
      </Drawer>
    </>
  );
}

'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import CheckIcon from '@mui/icons-material/Check';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';

import { useGetProductByIdQuery, useResolveConfigurationMutation } from '../../../lib/productsApi';
import { isFieldVisible, resolveImageUrl, resolveImageUrls } from '../../../lib/pricingUtils';
import StepsConfigurator from './steps/StepsConfigurator';

// Numbered step badge (1, 2, 3)
function StepBadge({ number }) {
  return (
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        bgcolor: '#0f172a',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {number}
    </Box>
  );
}

// Stepper control for Dimensions — responsive for mobile, tablet, and desktop
function DimensionStepper({ label, options, value, onChange, error }) {
  const idx = options.findIndex((o) => o.value === value);
  const effectiveIdx = idx < 0 && options.length > 0 ? 0 : idx;
  const current = options[effectiveIdx] ?? null;

  const rawLabel = current?.label || current?.value || '—';
  const numDisplay = rawLabel.replace(/\s*inches/i, '').trim();

  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="body2"
        sx={{
          fontSize: { xs: 12, sm: 13 },
          fontWeight: 600,
          color: error ? 'error.main' : '#334155',
          mb: { xs: 0.75, sm: 1 },
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid',
          borderColor: error ? 'error.main' : '#cbd5e1',
          borderRadius: '8px',
          bgcolor: '#ffffff',
          height: { xs: 38, sm: 42 },
          px: 0.5,
          transition: 'all 0.15s ease',
          '&:hover': { borderColor: '#94a3b8' },
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={() => effectiveIdx > 0 && onChange(options[effectiveIdx - 1].value)}
          disabled={effectiveIdx <= 0}
          sx={{
            width: { xs: 28, sm: 32 },
            height: { xs: 28, sm: 32 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            bgcolor: 'transparent',
            cursor: effectiveIdx <= 0 ? 'not-allowed' : 'pointer',
            opacity: effectiveIdx <= 0 ? 0.3 : 1,
            color: '#475569',
            borderRadius: '6px',
            '&:hover:not(:disabled)': { bgcolor: '#f1f5f9' },
          }}
        >
          <RemoveIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
        </Box>

        <Typography
          sx={{
            fontSize: { xs: 14, sm: 16 },
            fontWeight: 700,
            color: '#0f172a',
            textAlign: 'center',
            px: 0.5,
            userSelect: 'none',
          }}
        >
          {numDisplay}
        </Typography>

        <Box
          component="button"
          type="button"
          onClick={() => effectiveIdx < options.length - 1 && onChange(options[effectiveIdx + 1].value)}
          disabled={effectiveIdx >= options.length - 1}
          sx={{
            width: { xs: 28, sm: 32 },
            height: { xs: 28, sm: 32 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            bgcolor: 'transparent',
            cursor: effectiveIdx >= options.length - 1 ? 'not-allowed' : 'pointer',
            opacity: effectiveIdx >= options.length - 1 ? 0.3 : 1,
            color: '#475569',
            borderRadius: '6px',
            '&:hover:not(:disabled)': { bgcolor: '#f1f5f9' },
          }}
        >
          <AddIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
        </Box>
      </Box>

      <Typography
        variant="caption"
        sx={{
          display: 'block',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: { xs: 11, sm: 12 },
          mt: 0.5,
        }}
      >
        inches
      </Typography>

      {error && (
        <Typography variant="caption" color="error.main" sx={{ display: 'block', textAlign: 'center', mt: 0.25 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const { data: productData, isLoading: loading, isError } = useGetProductByIdQuery(id);
  const [resolveConfiguration] = useResolveConfigurationMutation();
  const product = productData?.data ?? null;

  const isStepsMode =
    product?.configuratorDisplayMode === 'steps' ||
    (!product?.configuratorDisplayMode && (
      (product?.stepsConfig || []).some((s) => s.enabled !== false) ||
      (product?.steps || []).length > 0
    ));

  const [selections, setSelections] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [pricePreview, setPricePreview] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [gallery, setGallery] = useState([]);
  const [configSku, setConfigSku] = useState(null);
  const [configResolving, setConfigResolving] = useState(false);
  const [stepsPriceResult, setStepsPriceResult] = useState(null);
  const resolveReqId = useRef(0);

  // Initialize selections with first option of each field (Normal UI)
  useEffect(() => {
    if (!product || isStepsMode) return;
    setGallery(resolveImageUrls(product.images || []));
    setActiveImage(0);
    const initial = {};
    (product.customizationFields || []).forEach((f) => {
      if (f.options?.length > 0 && !initial[f.name]) {
        initial[f.name] = f.options[0].value;
      }
    });
    setSelections(initial);
  }, [product?._id, isStepsMode]);

  // Resolve configuration when selections change (Normal UI)
  useEffect(() => {
    if (!product || isStepsMode) return;
    const reqId = ++resolveReqId.current;
    const timer = setTimeout(async () => {
      setConfigResolving(true);
      try {
        const d = await resolveConfiguration({ id: product._id, selections }).unwrap();
        if (reqId !== resolveReqId.current) return;
        const newGallery = d.data.images?.length ? d.data.images : product.images || [];
        setGallery(resolveImageUrls(newGallery));
        setActiveImage(0);
        setConfigSku(d.data.sku);
        setPricePreview({
          basePrice: d.data.basePrice,
          adjustments: d.data.adjustments,
          totalAdjustment: d.data.customizationAdjustment,
          finalPrice: d.data.finalPrice,
        });
      } catch {
        if (reqId !== resolveReqId.current) return;
        const fallback = product.images || [];
        setGallery(resolveImageUrls(fallback));
        setActiveImage(0);
      } finally {
        if (reqId === resolveReqId.current) setConfigResolving(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [selections, product]);

  const setSelection = (fieldName, value) => {
    setSelections((prev) => ({ ...prev, [fieldName]: value }));
    setFieldErrors((prev) => ({ ...prev, [fieldName]: '' }));
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 16 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error" sx={{ m: 4 }}>Product not found.</Alert>;
  if (!product) return null;

  // ── Configurator Display Mode ──
  if (isStepsMode) {
    return (
      <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
        <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 1.5, sm: 2.5, md: 3 }, py: { xs: 2, sm: 2.5, md: 3 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'minmax(380px, 40%) minmax(340px, 38%) minmax(260px, 22%)' },
              gap: { xs: 2.5, md: 3 },
              alignItems: 'start',
            }}
          >
            {/* Gallery — reuse existing gallery logic */}
            <Box sx={{ gridColumn: { xs: '1', md: '1', lg: '1' }, gridRow: { xs: 'auto', md: '1 / span 2', lg: 'auto' }, position: { md: 'sticky' }, top: { md: 24 } }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: { xs: 1.5, sm: 2 }, alignItems: 'stretch' }}>
                {gallery?.length > 1 && (
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'row', sm: 'column' }, justifyContent: { xs: 'center', sm: 'flex-start' }, flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: 1.25 }}>
                    {gallery.map((img, i) => (
                      <Box key={i} onClick={() => setActiveImage(i)}
                        sx={{ width: { xs: 60, sm: 64, md: 70 }, height: { xs: 60, sm: 64, md: 70 }, flexShrink: 0, borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', bgcolor: '#fff', border: '2px solid', borderColor: i === activeImage ? '#0284c7' : '#e2e8f0', p: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}>
                        <img src={img} alt={`Thumbnail ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </Box>
                    ))}
                  </Box>
                )}
                <Box sx={{ flex: 1, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', p: { xs: 2, sm: 2.5, md: 3 }, height: { xs: 320, sm: 380, md: 440, lg: 480 }, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {gallery?.length > 0 ? (
                    <img key={gallery[activeImage]} src={gallery[activeImage]} alt={product.name} style={{ maxWidth: '92%', maxHeight: '92%', objectFit: 'contain', display: 'block' }} />
                  ) : (
                    <Typography color="text.secondary">No Image Available</Typography>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Steps Configurator */}
            <Box sx={{ gridColumn: { xs: '1', md: '2', lg: '2' }, maxWidth: { xs: '100%', lg: 620 }, width: '100%' }}>
              {/* Product header */}
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="h5" sx={{ fontSize: { xs: 20, sm: 22, md: 24 }, fontWeight: 700, color: '#0f172a' }}>
                  {product.name}
                </Typography>
                {product.description && (
                  <Typography sx={{ fontSize: { xs: 12.5, sm: 13 }, color: '#64748b', mt: 0.5 }}>{product.description}</Typography>
                )}
                <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: '#94a3b8', mt: 0.5 }}>SKU: {product.sku}</Typography>
              </Box>
              <StepsConfigurator
                product={product}
                gallery={gallery}
                activeImage={activeImage}
                setGallery={setGallery}
                setActiveImage={setActiveImage}
                onPriceResult={setStepsPriceResult}
              />
            </Box>

            {/* Summary panel */}
            <Box sx={{ gridColumn: { xs: '1', md: '2', lg: '3' }, position: { lg: 'sticky' }, top: { lg: 24 } }}>
              <Box sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', p: { xs: 2, sm: 2.5 } }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 1.5 }}>Your Custom Lampshade</Typography>
                {gallery?.length > 0 && (
                  <Box sx={{ width: '100%', height: { xs: 140, sm: 160 }, borderRadius: '8px', border: '1px solid #e2e8f0', bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', mb: 2, p: 1 }}>
                    <img src={gallery[activeImage] || gallery[0]} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </Box>
                )}
                <Typography sx={{ fontSize: { xs: 28, sm: 34 }, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                  ${(stepsPriceResult?.finalPrice ?? product.basePrice).toFixed(2)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#16a34a' }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>In Stock</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Configure your lampshade using the steps on the left. The final price will update as you make selections.</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // ── Normal UI (existing) ──

  const sortedFields = [...product.customizationFields].sort((a, b) => a.order - b.order);
  const finalPrice = pricePreview?.finalPrice ?? product.basePrice;

  // Classify fields dynamically
  const dimensionFields = sortedFields.filter((f) =>
    /diameter|slant|height|width|depth|dimension/i.test(f.name)
  );

  const attachmentStyleField = sortedFields.find((f) =>
    /attachment\s*style|fitter/i.test(f.name) || (f.name === 'Attachment Style')
  );

  const colorCoveringField = sortedFields.find((f) =>
    /covering|fabric|material|exterior|color/i.test(f.name)
  );

  const otherFields = sortedFields.filter(
    (f) =>
      !dimensionFields.includes(f) &&
      f !== attachmentStyleField &&
      f !== colorCoveringField
  );

  // Clean label helper for dimensions
  const getCleanDimLabel = (rawName) => {
    if (/slant/i.test(rawName)) return 'Slant Height';
    if (/top\s*diameter/i.test(rawName)) return 'Top Diameter';
    if (/bottom\s*diameter/i.test(rawName)) return 'Bottom Diameter';
    return rawName;
  };

  const formatInchValue = (opt) => {
    if (!opt) return '—';
    const raw = opt.label || opt.value || '';
    const clean = String(raw).replace(/\s*inches/i, '').trim();
    return clean ? `${clean}"` : '—';
  };

  // Build configuration summary list strictly from real selections
  const summaryList = sortedFields
    .filter((f) => isFieldVisible(f, selections) && selections[f.name] !== undefined && selections[f.name] !== '')
    .map((f) => {
      const val = selections[f.name];
      const opt = f.options?.find((o) => o.value === val);
      let displayVal = opt?.label || val;
      if (/diameter|height|slant/i.test(f.name)) {
        displayVal = formatInchValue(opt);
      }
      return {
        label: getCleanDimLabel(f.label || f.name),
        value: displayVal,
      };
    });

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 1.5, sm: 2.5, md: 3 }, py: { xs: 2, sm: 2.5, md: 3 } }}>
        {/* RESPONSIVE LAYOUT GRID:
            - Desktop (lg: >=1150px): 3 columns (Gallery 42%, Configurator 36%, Summary 22%)
            - Tablet (md: 768px-1149px): 2 columns (Left: Gallery sticky; Right: Configurator + Summary)
            - Mobile (xs: <768px): 1 stacked column (Gallery -> Configurator -> Summary)
        */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr',
              lg: 'minmax(420px, 42%) minmax(340px, 36%) minmax(260px, 22%)',
            },
            gap: { xs: 2.5, md: 3 },
            alignItems: 'start',
          }}
        >
          {/* ═════════════════════════════════════════════════════════════════════════ */}
          {/* ── COLUMN 1: PRODUCT GALLERY (LEFT) ── */}
          {/* ═════════════════════════════════════════════════════════════════════════ */}
          <Box
            sx={{
              gridColumn: { xs: '1', md: '1', lg: '1' },
              gridRow: { xs: 'auto', md: '1 / span 2', lg: 'auto' },
              position: { md: 'sticky' },
              top: { md: 24 },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column-reverse', sm: 'row' },
                gap: { xs: 1.5, sm: 2 },
                alignItems: 'stretch',
              }}
            >
              {/* Thumbnails: horizontal row below on mobile, vertical column on tablet/desktop */}
              {gallery?.length > 1 && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'row', sm: 'column' },
                    justifyContent: { xs: 'center', sm: 'flex-start' },
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    gap: 1.25,
                  }}
                >
                  {gallery.map((img, i) => (
                    <Box
                      key={i}
                      onClick={() => setActiveImage(i)}
                      sx={{
                        width: { xs: 60, sm: 64, md: 70 },
                        height: { xs: 60, sm: 64, md: 70 },
                        flexShrink: 0,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        bgcolor: '#ffffff',
                        border: '2px solid',
                        borderColor: i === activeImage ? '#0284c7' : '#e2e8f0',
                        boxShadow: i === activeImage ? '0 0 0 1px #0284c7' : 'none',
                        p: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: i === activeImage ? '#0284c7' : '#94a3b8',
                        },
                      }}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </Box>
                  ))}
                </Box>
              )}

              {/* Main Product Image Container — Responsive Height */}
              <Box
                sx={{
                  flex: 1,
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  p: { xs: 2, sm: 2.5, md: 3 },
                  position: 'relative',
                  height: { xs: 320, sm: 380, md: 440, lg: 480 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {gallery?.length > 0 ? (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      key={gallery[activeImage]}
                      src={gallery[activeImage]}
                      alt={product.name}
                      style={{
                        maxWidth: '92%',
                        maxHeight: '92%',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  </Box>
                ) : (
                  <Typography color="text.secondary">No Image Available</Typography>
                )}

                {/* Resolving overlay spinner */}
                {configResolving && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      bgcolor: 'rgba(255,255,255,0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(1px)',
                      zIndex: 2,
                    }}
                  >
                    <CircularProgress size={28} sx={{ color: '#0f172a' }} />
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          {/* ═════════════════════════════════════════════════════════════════════════ */}
          {/* ── COLUMN 2: CONFIGURATOR (CENTER ON DESKTOP, RIGHT ON TABLET) ── */}
          {/* ═════════════════════════════════════════════════════════════════════════ */}
          <Box
            sx={{
              gridColumn: { xs: '1', md: '2', lg: '2' },
              maxWidth: { xs: '100%', lg: 620 },
              width: '100%',
            }}
          >
            {/* PRODUCT HEADER */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontSize: { xs: 20, sm: 22, md: 24 },
                        fontWeight: 700,
                        color: '#0f172a',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {product.name}
                    </Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#16a34a' }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
                        In Stock
                      </Typography>
                    </Box>
                  </Box>

                  {product.description && (
                    <Typography sx={{ fontSize: { xs: 12.5, sm: 13 }, color: '#64748b', mt: 0.5, lineHeight: 1.5 }}>
                      {product.description}
                    </Typography>
                  )}

                  <Typography
                    sx={{
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: '#94a3b8',
                      mt: 0.5,
                      display: 'block',
                    }}
                  >
                    SKU: {configSku || product.sku}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b', cursor: 'pointer', flexShrink: 0 }}>
                  <HelpOutlineIcon sx={{ fontSize: 16 }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>Need Help?</Typography>
                </Box>
              </Box>
            </Box>

            {/* ── STEP 1: DIMENSIONS CARD ── */}
            {dimensionFields.length > 0 && (
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  p: { xs: 2, sm: 2.5 },
                  mb: 2.5,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
                  <StepBadge number={1} />
                  <Typography sx={{ fontSize: { xs: 15, sm: 16 }, fontWeight: 700, color: '#0f172a' }}>
                    Dimensions
                  </Typography>
                  <Tooltip title="Specify the custom dimensions for your lampshade">
                    <InfoOutlinedIcon sx={{ fontSize: 16, color: '#94a3b8', cursor: 'pointer' }} />
                  </Tooltip>
                </Box>

                <Typography sx={{ fontSize: 12.5, color: '#64748b', ml: 4.25, mb: 2 }}>
                  Enter the exact size for your lampshade.
                </Typography>

                {/* 3 Steppers in a Row — Responsive for Mobile */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(3, 1fr)',
                      sm: `repeat(${dimensionFields.length}, 1fr)`,
                    },
                    gap: { xs: 1, sm: 1.5, md: 2 },
                    pt: 0.5,
                  }}
                >
                  {dimensionFields.map((field) => (
                    <DimensionStepper
                      key={field.name}
                      label={getCleanDimLabel(field.label || field.name)}
                      options={field.options || []}
                      value={selections[field.name]}
                      onChange={(val) => setSelection(field.name, val)}
                      error={fieldErrors[field.name]}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* ── STEP 2: ATTACHMENT STYLE CARD ── */}
            {attachmentStyleField && (
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  p: { xs: 2, sm: 2.5 },
                  mb: 2.5,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <StepBadge number={2} />
                    <Typography sx={{ fontSize: { xs: 15, sm: 16 }, fontWeight: 700, color: '#0f172a' }}>
                      Attachment Style
                    </Typography>
                    <Tooltip title="Choose how the lampshade attaches to your lamp base">
                      <InfoOutlinedIcon sx={{ fontSize: 16, color: '#94a3b8', cursor: 'pointer' }} />
                    </Tooltip>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#0284c7', cursor: 'pointer' }}>
                    <InfoOutlinedIcon sx={{ fontSize: 15 }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                      Learn about attachments
                    </Typography>
                  </Box>
                </Box>

                <Typography sx={{ fontSize: 12.5, color: '#64748b', ml: 4.25, mb: 2 }}>
                  Select how your shade will attach to the lamp.
                </Typography>

                {/* Attachment Options Grid */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(2, 1fr)',
                      sm: 'repeat(auto-fill, minmax(130px, 1fr))',
                    },
                    gap: { xs: 1.25, sm: 1.75 },
                  }}
                >
                  {(attachmentStyleField.options || []).map((opt) => {
                    const isSelected = selections[attachmentStyleField.name] === opt.value;

                    return (
                      <Box
                        key={opt.value}
                        onClick={() => setSelection(attachmentStyleField.name, opt.value)}
                        sx={{
                          border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                          bgcolor: isSelected ? '#f0f9ff' : '#ffffff',
                          borderRadius: '10px',
                          p: { xs: 1.25, sm: 1.75 },
                          cursor: 'pointer',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            borderColor: isSelected ? '#0284c7' : '#cbd5e1',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        {isSelected && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: { xs: 6, sm: 8 },
                              right: { xs: 6, sm: 8 },
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              bgcolor: '#0284c7',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <CheckIcon sx={{ fontSize: 13, stroke: '#ffffff', strokeWidth: 1.5 }} />
                          </Box>
                        )}

                        <Box
                          sx={{
                            width: { xs: 52, sm: 64 },
                            height: { xs: 46, sm: 56 },
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 1,
                          }}
                        >
                          {opt.images?.[0] ? (
                            <img
                              src={resolveImageUrl(opt.images[0])}
                              alt={opt.label}
                              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <Box sx={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #cbd5e1' }} />
                          )}
                        </Box>

                        <Typography sx={{ fontSize: { xs: 12, sm: 13 }, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                          {opt.label}
                        </Typography>

                        {opt.priceAdjustment > 0 && (
                          <Typography sx={{ fontSize: 11, color: '#dc2626', fontWeight: 600, mt: 0.5 }}>
                            +${opt.priceAdjustment.toFixed(2)}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* ── STEP 3: COLOR & COVERING CARD (REAL DATA) ── */}
            {colorCoveringField && (
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  p: { xs: 2, sm: 2.5 },
                  mb: 2.5,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
                  <StepBadge number={3} />
                  <Typography sx={{ fontSize: { xs: 15, sm: 16 }, fontWeight: 700, color: '#0f172a' }}>
                    {colorCoveringField.label || colorCoveringField.name || 'Color & Covering'}
                  </Typography>
                  <Tooltip title="Choose the color and fabric material for your lampshade">
                    <InfoOutlinedIcon sx={{ fontSize: 16, color: '#94a3b8', cursor: 'pointer' }} />
                  </Tooltip>
                </Box>

                <Typography sx={{ fontSize: 12.5, color: '#64748b', ml: 4.25, mb: 2 }}>
                  {colorCoveringField.helpText || 'Choose the fabric color and material for your lampshade.'}
                </Typography>

                {/* Color / Covering Swatches Grid */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(2, 1fr)',
                      sm: 'repeat(auto-fill, minmax(140px, 1fr))',
                    },
                    gap: { xs: 1.25, sm: 1.75 },
                  }}
                >
                  {(colorCoveringField.options || []).map((opt) => {
                    const isSelected = selections[colorCoveringField.name] === opt.value;

                    return (
                      <Box
                        key={opt.value}
                        onClick={() => setSelection(colorCoveringField.name, opt.value)}
                        sx={{
                          border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                          bgcolor: '#ffffff',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            borderColor: isSelected ? '#0284c7' : '#cbd5e1',
                            transform: 'translateY(-2px)',
                          },
                        }}
                      >
                        {isSelected && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: { xs: 6, sm: 8 },
                              right: { xs: 6, sm: 8 },
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              bgcolor: '#0284c7',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 1,
                            }}
                          >
                            <CheckIcon sx={{ fontSize: 13, stroke: '#ffffff', strokeWidth: 1.5 }} />
                          </Box>
                        )}

                        <Box sx={{ width: '100%', height: { xs: 72, sm: 84 }, bgcolor: '#f1f5f9' }}>
                          {opt.images?.[0] ? (
                            <img
                              src={resolveImageUrl(opt.images[0])}
                              alt={opt.label}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <Box sx={{ width: '100%', height: '100%', bgcolor: opt.colorHex || '#e2e8f0' }} />
                          )}
                        </Box>

                        <Box sx={{ p: { xs: 1, sm: 1.25 }, textAlign: 'center' }}>
                          <Typography
                            sx={{
                              fontSize: { xs: 12, sm: 12.5 },
                              fontWeight: 700,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {opt.label}
                          </Typography>
                          {opt.priceAdjustment > 0 && (
                            <Typography sx={{ fontSize: 11.5, color: '#0284c7', fontWeight: 600, mt: 0.25 }}>
                              +${opt.priceAdjustment.toFixed(2)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Any remaining customization fields */}
            {otherFields.length > 0 && (
              <Box sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', p: 2.5, mb: 2.5 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 2 }}>Additional Options</Typography>
                {otherFields.map((field) => {
                  const key = field.name;
                  return (
                    <Box key={field.name} sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.75 }}>
                        {field.label || field.name}
                      </Typography>
                      <Select
                        fullWidth
                        size="small"
                        value={selections[key] || ''}
                        onChange={(e) => setSelection(field.name, e.target.value)}
                        sx={{ borderRadius: '8px' }}
                      >
                        {field.options?.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* ═════════════════════════════════════════════════════════════════════════ */}
          {/* ── COLUMN 3: PRICE + SUMMARY (DESKTOP: RIGHT COLUMN; TABLET: UNDER CONFIG) ── */}
          {/* ═════════════════════════════════════════════════════════════════════════ */}
          <Box
            sx={{
              gridColumn: { xs: '1', md: '2', lg: '3' },
              position: { lg: 'sticky' },
              top: { lg: 24 },
              width: '100%',
            }}
          >
            <Box
              sx={{
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                p: { xs: 2, sm: 2.5, md: 3 },
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <Typography sx={{ fontSize: { xs: 15, sm: 16 }, fontWeight: 700, color: '#0f172a', mb: 2 }}>
                Your Custom Lampshade
              </Typography>

              {/* Small Preview Image */}
              {gallery?.length > 0 && (
                <Box
                  sx={{
                    width: '100%',
                    height: { xs: 140, sm: 160 },
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    mb: 2,
                    p: 1,
                  }}
                >
                  <img
                    src={gallery[activeImage] || gallery[0]}
                    alt={product.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </Box>
              )}

              {/* Dynamic Price */}
              <Box sx={{ mb: 0.5 }}>
                {configResolving ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                    <CircularProgress size={20} sx={{ color: '#0f172a' }} />
                    <Typography sx={{ fontSize: 14, color: '#64748b' }}>Updating price…</Typography>
                  </Box>
                ) : (
                  <Typography
                    sx={{
                      fontSize: { xs: 30, sm: 36 },
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: 1.1,
                    }}
                  >
                    ${finalPrice.toFixed(2)}
                  </Typography>
                )}
              </Box>

              {/* Stock status */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#16a34a' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
                  In Stock
                </Typography>
              </Box>

              <Divider sx={{ mb: 2, borderColor: '#e2e8f0' }} />

              {/* Configuration Summary Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  Configuration Summary
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#0284c7',
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Edit
                </Typography>
              </Box>

              {/* Configuration Summary Key-Value Rows */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {summaryList.map((row) => (
                  <Box
                    key={row.label}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 1,
                    }}
                  >
                    <Typography sx={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.3, flexShrink: 0 }}>
                      {row.label}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', textAlign: 'right', lineHeight: 1.3 }}>
                      {row.value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Price Breakdown */}
              {pricePreview?.adjustments?.length > 0 && (
                <>
                  <Divider sx={{ my: 2, borderColor: '#e2e8f0' }} />
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      mb: 1,
                    }}
                  >
                    Price Breakdown
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12, color: '#64748b' }}>Base Price</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                      ${product.basePrice.toFixed(2)}
                    </Typography>
                  </Box>
                  {pricePreview.adjustments.map((adj, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12, color: '#64748b', maxWidth: '65%' }}>
                        {adj.field || 'Attachment'}{adj.selection ? ` — ${adj.selection}` : ''}
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                        {adj.amount >= 0 ? '+' : ''}${adj.amount.toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                </>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 16 }}><CircularProgress /></Box>}>
      <ProductDetail />
    </Suspense>
  );
}

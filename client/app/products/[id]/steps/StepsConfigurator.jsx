'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import { useCalculateStepsPriceMutation, useResolveConfigurationMutation } from '../../../../lib/productsApi';
import { resolveImageUrls } from '../../../../lib/pricingUtils';
import StepDimensions from './StepDimensions';
import StepImageCards from './StepImageCards';
import StepSwatchGrid from './StepSwatchGrid';
import StepFinishing from './StepFinishing';
import StepReview from './StepReview';
import MobileStickySummaryBar from './MobileStickySummaryBar';

// Validate a single step's selections; returns { [fieldName]: errorMsg }
function validateStep(step, stepSel = {}) {
  const errors = {};
  if (!step.required) return errors;
  for (const field of (step.fields || [])) {
    if (!field.required) continue;
    // Numeric dimensions sub-array style
    if (field.dimensions?.length > 0) {
      const dimVal = stepSel[field.name] || {};
      for (const dim of field.dimensions) {
        if (!dim.required) continue;
        const v = dimVal[dim.name];
        if (v === undefined || v === null || v === '') {
          errors[`${field.name}.${dim.name}`] = `${dim.label || dim.name} is required`;
        } else {
          const num = parseFloat(v);
          if (isNaN(num)) errors[`${field.name}.${dim.name}`] = 'Must be a number';
          else if (dim.min !== undefined && num < dim.min) errors[`${field.name}.${dim.name}`] = `Min ${dim.min}`;
          else if (dim.max !== undefined && num > dim.max) errors[`${field.name}.${dim.name}`] = `Max ${dim.max}`;
        }
      }
    } else if (field.type === 'dimensions') {
      // Legacy dimensions field shape
      const dimVal = stepSel[field.name] || {};
      for (const dim of (field.dimensions || [])) {
        if (!dim.required) continue;
        const v = dimVal[dim.name];
        if (v === undefined || v === null || v === '') {
          errors[`${field.name}.${dim.name}`] = `${dim.label || dim.name} is required`;
        } else {
          const num = parseFloat(v);
          if (isNaN(num)) errors[`${field.name}.${dim.name}`] = 'Must be a number';
          else if (dim.min !== undefined && num < dim.min) errors[`${field.name}.${dim.name}`] = `Min ${dim.min}`;
          else if (dim.max !== undefined && num > dim.max) errors[`${field.name}.${dim.name}`] = `Max ${dim.max}`;
        }
      }
    } else {
      const val = stepSel[field.name];
      // Explicit check — does NOT use truthiness, so 0 is treated as a valid selection
      const empty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
      if (empty) errors[field.name] = `${field.label || field.name} is required`;
    }
  }
  return errors;
}

// Stepper for a single dropdown-type dimension field (e.g. Top Diameter)
function StepDimensionField({ field, value, onChange, error }) {
  const options = field.options || [];

  // Normalize both sides to string for comparison to handle number/string type mismatches
  const idx = options.findIndex((o) => String(o.value) === String(value));
  // If not found, try to find closest or default to 0
  const effectiveIdx = idx >= 0 ? idx : 0;

  // Always sync value to the actual option value on first render or mismatch
  const current = options[effectiveIdx] ?? null;
  const display = current ? String(current.label || current.value).replace(/\s*inches/i, '').trim() : '—';

  const canDecrement = effectiveIdx > 0;
  const canIncrement = effectiveIdx < options.length - 1;

  const handleDecrement = () => {
    if (canDecrement) onChange(options[effectiveIdx - 1].value);
  };
  const handleIncrement = () => {
    if (canIncrement) onChange(options[effectiveIdx + 1].value);
  };

  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        title={field.label || field.name}
        sx={{
          fontSize: { xs: 11, sm: 12, md: 13 },
          fontWeight: 600,
          color: error ? 'error.main' : '#334155',
          mb: 1,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {field.label || field.name}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid', borderColor: error ? 'error.main' : '#cbd5e1', borderRadius: '8px', bgcolor: '#fff', height: { xs: 38, sm: 42 }, px: 0.5 }}>
        <Box component="button" type="button"
          onClick={handleDecrement}
          disabled={!canDecrement}
          sx={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', bgcolor: 'transparent', cursor: canDecrement ? 'pointer' : 'not-allowed',
            opacity: canDecrement ? 1 : 0.3, color: '#475569', borderRadius: '6px',
            transition: 'all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
            '&:hover:not(:disabled)': { bgcolor: '#f1f5f9', color: '#0f172a' },
            '&:active:not(:disabled)': { transform: 'scale(0.88)' },
          }}>
          <RemoveIcon sx={{ fontSize: 18 }} />
        </Box>
        <Typography sx={{ fontSize: { xs: 14, sm: 16 }, fontWeight: 700, color: '#0f172a', userSelect: 'none' }}>{display}</Typography>
        <Box component="button" type="button"
          onClick={handleIncrement}
          disabled={!canIncrement}
          sx={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', bgcolor: 'transparent', cursor: canIncrement ? 'pointer' : 'not-allowed',
            opacity: canIncrement ? 1 : 0.3, color: '#475569', borderRadius: '6px',
            transition: 'all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
            '&:hover:not(:disabled)': { bgcolor: '#f1f5f9', color: '#0f172a' },
            '&:active:not(:disabled)': { transform: 'scale(0.88)' },
          }}>
          <AddIcon sx={{ fontSize: 18 }} />
        </Box>
      </Box>
      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#94a3b8', mt: 0.5 }}>inches</Typography>
      {error && <Typography variant="caption" color="error.main" sx={{ display: 'block', textAlign: 'center' }}>{error}</Typography>}
    </Box>
  );
}

// Render the appropriate component for a step's fields
function StepContent({ step, stepValue, onChange, errors }) {
  if (!step.fields?.length) return <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>No fields configured for this step.</Typography>;

  if (step.type === 'dimensions') {
    const firstField = step.fields[0];
    // Numeric dimensions sub-array style (StepDimensions component)
    if (firstField?.dimensions?.length > 0) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {step.fields.map((field) => (
            <StepDimensions
              key={field.name}
              field={field}
              value={stepValue[field.name] || {}}
              onChange={(val) => onChange({ ...stepValue, [field.name]: val })}
              errors={Object.fromEntries(
                Object.entries(errors)
                  .filter(([k]) => k.startsWith(`${field.name}.`))
                  .map(([k, v]) => [k.replace(`${field.name}.`, ''), v])
              )}
            />
          ))}
        </Box>
      );
    }
    // Dropdown-options style — render each field as a +/− counter
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(step.fields.length, 3)}, 1fr)`, gap: { xs: 1.5, sm: 2 } }}>
        {step.fields.map((field) => (
          <StepDimensionField
            key={field.name}
            field={field}
            value={stepValue[field.name]}
            onChange={(val) => onChange({ ...stepValue, [field.name]: val })}
            error={errors[field.name]}
          />
        ))}
      </Box>
    );
  }

  if (step.type === 'swatch_grid') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {step.fields.map((field) => (
          <Box key={field.name || field.id}>
            {step.fields.length > 1 && (
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1, color: '#334155' }}>{field.label || field.name}</Typography>
            )}
            <StepSwatchGrid
              field={field}
              value={stepValue[field.name]}
              onChange={(val) => onChange({ ...stepValue, [field.name]: val })}
              error={errors[field.name]}
            />
          </Box>
        ))}
      </Box>
    );
  }

  if (step.type === 'finishing') {
    return (
      <StepFinishing
        step={step}
        stepValue={stepValue}
        onChange={onChange}
        errors={errors}
      />
    );
  }

  // Default: image_cards (also handles dependent_options)
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {step.fields.map((field) => (
        <Box key={field.name || field.id}>
          {step.fields.length > 1 && (
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1, color: '#334155' }}>{field.label || field.name}</Typography>
          )}
          <StepImageCards
            field={field}
            value={stepValue[field.name]}
            onChange={(val) => onChange({ ...stepValue, [field.name]: val })}
            error={errors[field.name]}
          />
        </Box>
      ))}
    </Box>
  );
}

// Resolve fields for a step from customizationFields if not already embedded
function resolveStepFields(step, customizationFields) {
  if (step.type === 'review') return [];
  // If fields already embedded and non-empty, use them
  if (step.fields?.length > 0) return step.fields;
  // Fall back to resolving from fieldNames + customizationFields
  const names = step.fieldNames || [];
  return names
    .map((fname) => customizationFields.find((f) => f.name === fname))
    .filter(Boolean);
}

// Infer step type from its fields if type is missing or generic
function inferStepType(step, fields) {
  if (step.type === 'review') return 'review';
  // If the admin explicitly set a non-generic step type, honour it first
  if (step.type && step.type !== 'step' && step.type !== 'image_cards') return step.type;
  if (!fields.length) return step.type || 'image_cards';
  // Numeric dimensions sub-array style
  if (fields.some((f) => f.dimensions?.length > 0)) return 'dimensions';
  // Dropdown-options dimension fields — check BEFORE finishing since dropdown is also used for dims
  if (fields.every((f) => /diameter|slant|height|width|depth|dimension/i.test(f.name) && (f.type === 'dropdown' || f.type === 'number'))) return 'dimensions';
  // Swatch / color fields
  if (fields.some((f) => f.type === 'swatch' || f.type === 'color')) return 'swatch_grid';
  // Select / dropdown / checkbox
  if (fields.some((f) => f.type === 'select' || f.type === 'dropdown' || f.type === 'checkbox')) return 'finishing';
  return 'image_cards';
}

function DraggableSteps({ steps, currentStep, onGoToStep, onReorder }) {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const containerRef = useRef(null);
  const pillRefs = useRef([]);
  const pointerDownIdx = useRef(null);
  const didDrag = useRef(false);

  const handlePointerDown = (e, i) => {
    pointerDownIdx.current = i;
    didDrag.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e, i) => {
    if (pointerDownIdx.current === null) return;
    didDrag.current = true;
    if (dragging === null) setDragging(pointerDownIdx.current);

    // Find which pill the pointer is over
    const x = e.clientX;
    const y = e.clientY;
    let overIdx = null;
    pillRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        overIdx = idx;
      }
    });
    setDragOver(overIdx);
  };

  const handlePointerUp = (e, i) => {
    const from = pointerDownIdx.current;
    pointerDownIdx.current = null;
    const wasDrag = didDrag.current;
    didDrag.current = false;
    setDragging(null);
    setDragOver(null);

    if (!wasDrag) { onGoToStep(i); return; }
    if (from === null || dragOver === null || from === dragOver) return;

    const reordered = [...steps];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dragOver, 0, moved);
    const newIdx = reordered.findIndex((s) => s.id === steps[currentStep].id);
    onReorder(reordered, newIdx);
  };

  return (
    <Box ref={containerRef} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.5 }}>
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        const isOver = dragOver === i && dragging !== null && dragging !== i;
        return (
          <Box
            key={step.id || `step-${i}`}
            ref={(el) => { pillRefs.current[i] = el; }}
            onPointerDown={(e) => handlePointerDown(e, i)}
            onPointerMove={(e) => handlePointerMove(e, i)}
            onPointerUp={(e) => handlePointerUp(e, i)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.75,
              px: 1.5, py: 0.5, borderRadius: '20px',
              cursor: dragging === i ? 'grabbing' : 'grab',
              fontSize: 12, fontWeight: 600, userSelect: 'none', touchAction: 'none',
              border: '2px solid',
              borderColor: isOver ? '#6366f1' : isActive ? '#0f172a' : isDone ? '#94a3b8' : '#e2e8f0',
              bgcolor: isActive ? '#0f172a' : isDone ? '#f8fafc' : '#fff',
              color: isActive ? '#fff' : isDone ? '#64748b' : '#94a3b8',
              opacity: dragging === i ? 0.5 : 1,
              transform: isOver ? 'scale(1.05)' : 'none',
              boxShadow: isActive ? '0 0 0 3px rgba(15, 23, 42, 0.12)' : 'none',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              '&:hover': { borderColor: '#0f172a', color: isActive ? '#fff' : '#0f172a', transform: 'translateY(-1px)' },
            }}
          >
            <Box
              className={isDone ? 'anim-badge-pop' : ''}
              sx={{
                width: 18, height: 18, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
                bgcolor: isActive ? '#fff' : isDone ? '#64748b' : '#e2e8f0',
                color: isActive ? '#0f172a' : '#fff', flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              {isDone ? '✓' : i + 1}
            </Box>
            {step.title || 'Step'}
          </Box>
        );
      })}
    </Box>
  );
}

export default function StepsConfigurator({
  product,
  gallery,
  activeImage,
  setGallery,
  setActiveImage,
  onPriceResult,
  onConfigResolving,
  onLiveSelectionsChange,
}) {
  const customizationFields = product.customizationFields || [];

  const [currentStep, setCurrentStep] = useState(0);
  const [orderedSteps, setOrderedSteps] = useState(null);
  const [stepSelections, setStepSelections] = useState({});
  const [stepErrors, setStepErrors] = useState({});
  const [priceResult, setPriceResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [cartSuccess, setCartSuccess] = useState(false);

  const [calculateStepsPrice] = useCalculateStepsPriceMutation();
  const [resolveConfiguration] = useResolveConfigurationMutation();
  const priceReqId = useRef(0);

  // Build resolved steps: embed fields + correct type
  let rawSteps = (product.stepsConfig || []).filter((s) => s.enabled !== false).sort((a, b) => (a.order || 0) - (b.order || 0));

  // Fallback 1: Build from legacy product.steps if stepsConfig is empty
  if (!rawSteps.length && (product.steps || []).length > 0) {
    rawSteps = product.steps.filter((s) => s.title).map((s, i) => ({
      id: s.id || `sc-${i}`,
      title: s.title,
      description: '',
      type: 'step',
      order: i,
      enabled: true,
      required: false,
      fieldNames: s.fieldNames || [],
    }));
  }

  // Fallback 2: Auto-group from customizationFields if no steps defined
  if (!rawSteps.length && customizationFields.length > 0) {
    const dimFields = customizationFields.filter((f) => /diameter|slant|height|width|depth|dimension/i.test(f.name));
    const attachFields = customizationFields.filter((f) => /attachment\s*style|fitter/i.test(f.name) || f.name === 'Attachment Style');
    const coverFields = customizationFields.filter((f) => /covering|fabric|material|exterior|color/i.test(f.name));
    const otherFields = customizationFields.filter((f) => !dimFields.includes(f) && !attachFields.includes(f) && !coverFields.includes(f));

    let idx = 0;
    if (dimFields.length) {
      rawSteps.push({ id: `sc-auto-${idx}`, title: 'Dimensions', description: 'Enter the exact size for your lampshade.', type: 'dimensions', order: idx++, enabled: true, required: true, fieldNames: dimFields.map((f) => f.name) });
    }
    if (attachFields.length) {
      rawSteps.push({ id: `sc-auto-${idx}`, title: 'Attachment Style', description: 'Select how your shade will attach to the lamp.', type: 'swatch_grid', order: idx++, enabled: true, required: true, fieldNames: attachFields.map((f) => f.name) });
    }
    if (coverFields.length) {
      rawSteps.push({ id: `sc-auto-${idx}`, title: 'Exterior Covering', description: 'Choose your lampshade covering material and color.', type: 'swatch_grid', order: idx++, enabled: true, required: true, fieldNames: coverFields.map((f) => f.name) });
    }
    if (otherFields.length) {
      rawSteps.push({ id: `sc-auto-${idx}`, title: 'Additional Options', description: 'Select your options.', type: 'finishing', order: idx++, enabled: true, required: false, fieldNames: otherFields.map((f) => f.name) });
    }
  }

  // Memoize stepsConfig so the initialization effect captures a stable reference
  const stepsConfig = useMemo(() => rawSteps.map((s) => {
    const fields = resolveStepFields(s, customizationFields);
    return { ...s, fields, type: inferStepType(s, fields) };
  }), [product._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const reviewIdx = stepsConfig.findIndex((s) => s.type === 'review');
  const baseConfigSteps = useMemo(
    () => reviewIdx >= 0 ? stepsConfig : [...stepsConfig, { id: '__review__', title: 'Review', type: 'review', enabled: true, order: stepsConfig.length, fields: [] }],
    [stepsConfig, reviewIdx]
  );
  const configSteps = orderedSteps ?? baseConfigSteps;
  const totalSteps = configSteps.length;

  // Initialize default values from stepsConfig — only sets a field if no selection exists yet.
  // The effect runs only when product._id changes. We read stepSelections directly from state;
  // this is safe because the effect is not triggered by stepSelections changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStepSelections((prev) => {
      const next = { ...prev };
      for (const step of configSteps) {
        if (step.type === 'review') continue;
        const existing = next[step.id] || {};
        const stepInit = { ...existing };
        for (const field of (step.fields || [])) {
          // Never overwrite an already-set selection
          if (stepInit[field.name] !== undefined) continue;
          if (field.dimensions?.length > 0) {
            const dimInit = {};
            for (const dim of field.dimensions) {
              dimInit[dim.name] = dim.defaultValue !== undefined && dim.defaultValue !== '' ? dim.defaultValue : (dim.min ?? 1);
            }
            if (Object.keys(dimInit).length) stepInit[field.name] = dimInit;
          } else if (field.type === 'dimensions') {
            const dimInit = {};
            for (const dim of (field.dimensions || [])) {
              dimInit[dim.name] = dim.defaultValue !== undefined && dim.defaultValue !== '' ? dim.defaultValue : (dim.min || 1);
            }
            if (Object.keys(dimInit).length) stepInit[field.name] = dimInit;
          } else if (field.defaultValue !== undefined && field.defaultValue !== '') {
            stepInit[field.name] = field.defaultValue;
          } else if (field.options?.length > 0) {
            const firstOpt = field.options[0];
            stepInit[field.name] = (firstOpt.value !== undefined && firstOpt.value !== '') ? firstOpt.value : firstOpt.label;
          }
        }
        next[step.id] = stepInit;
      }
      console.log('[Init] stepSelections:', JSON.stringify(next, null, 2));
      return next;
    });
  }, [product._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recalculate price and resolve gallery whenever selections change
  useEffect(() => {
    onConfigResolving?.(true);
    const reqId = ++priceReqId.current;
    const timer = setTimeout(async () => {
      try {
        // 1. Seed flatSelections with defaults from all customizationFields so resolveConfiguration has all attributes
        const flatSelections = {};
        (customizationFields || []).forEach((f) => {
          if (f.defaultValue !== undefined && f.defaultValue !== '') {
            flatSelections[f.name] = f.defaultValue;
          } else if (f.options?.length > 0) {
            const firstOpt = f.options[0];
            flatSelections[f.name] = (firstOpt.value !== undefined && firstOpt.value !== '') ? firstOpt.value : firstOpt.label;
          }
        });

        // 2. Overlay actual step selections
        for (const step of configSteps) {
          if (step.type === 'review') continue;
          const stepSel = stepSelections[step.id] || {};
          for (const field of (step.fields || [])) {
            const val = stepSel[field.name];
            if (val === undefined || val === null || val === '') continue;

            if (field.type === 'dimensions' && typeof val === 'object') {
              for (const [dKey, dVal] of Object.entries(val)) {
                if (dVal !== undefined && dVal !== '') flatSelections[dKey] = dVal;
              }
            } else {
              flatSelections[field.name] = val;
            }
          }
        }

        // Find covering swatch image if available
        let coveringImg = '';
        for (const step of configSteps) {
          const stepSel = stepSelections[step.id] || {};
          for (const field of (step.fields || [])) {
            if (/covering|fabric|material|exterior/i.test(field.name)) {
              const val = stepSel[field.name];
              const opt = (field.options || []).find((o) => String(o.value) === String(val) || String(o.label) === String(val));
              if (opt?.images?.[0]) coveringImg = opt.images[0];
            }
          }
        }
        onLiveSelectionsChange?.({ ...flatSelections, _coveringImage: coveringImg });

        const [priceRes, configRes] = await Promise.allSettled([
          calculateStepsPrice({ id: product._id, stepSelections, quantity: 1 }).unwrap(),
          resolveConfiguration({ id: product._id, selections: flatSelections }).unwrap(),
        ]);
        if (reqId !== priceReqId.current) return;
        if (priceRes.status === 'fulfilled') {
          setPriceResult(priceRes.value.data);
          onPriceResult?.(priceRes.value.data);
        }
        if (configRes.status === 'fulfilled') {
          let newGallery = configRes.value.data?.images;

          // Fallback: If no variant configuration matched specific images, check if currently selected options have images
          if (!newGallery || !newGallery.length) {
            for (const step of configSteps) {
              if (step.type === 'review') continue;
              const stepSel = stepSelections[step.id] || {};
              for (const field of (step.fields || [])) {
                const val = stepSel[field.name];
                if (!val) continue;
                const opt = (field.options || []).find((o) => String(o.value) === String(val) || String(o.label) === String(val));
                if (opt?.images?.length) {
                  newGallery = opt.images;
                  break;
                }
              }
              if (newGallery?.length) break;
            }
          }

          if (!newGallery || !newGallery.length) {
            newGallery = product.images || [];
          }

          setGallery(resolveImageUrls(newGallery));
          // Only reset activeImage if gallery actually changed, preserve step-based index otherwise
          setActiveImage((prev) => Math.min(prev, newGallery.length - 1));
        }
      } catch (err) {
        console.error('Failed to resolve configuration/price:', err);
      } finally {
        if (reqId === priceReqId.current) {
          onConfigResolving?.(false);
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [stepSelections, product._id]);

  const currentStepConfig = configSteps[currentStep];
  const isReviewStep = currentStepConfig?.type === 'review';
  const progress = ((currentStep) / (totalSteps - 1)) * 100;

  const updateStepSelection = useCallback((stepId, val) => {
    setStepSelections((prev) => ({ ...prev, [stepId]: val }));
    setStepErrors((prev) => ({ ...prev, [stepId]: {} }));
  }, [setStepSelections, setStepErrors]);

  const handleContinue = () => {
    if (isReviewStep) return;
    const step = currentStepConfig;
    const errors = validateStep(step, stepSelections[step.id] || {});
    if (Object.keys(errors).length > 0) {
      setStepErrors((prev) => ({ ...prev, [step.id]: errors }));
      return;
    }
    const next = Math.min(currentStep + 1, totalSteps - 1);
    setCurrentStep(next);
    setActiveImage(Math.min(next, gallery.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    const prev = Math.max(currentStep - 1, 0);
    setCurrentStep(prev);
    setActiveImage(Math.min(prev, gallery.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToStep = (idx) => {
    setCurrentStep(idx);
    setActiveImage(Math.min(idx, gallery.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = async (quantity) => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      // Validate all non-review steps
      let hasErrors = false;
      const allErrors = {};
      for (const step of configSteps) {
        if (step.type === 'review') continue;
        const errors = validateStep(step, stepSelections[step.id] || {});
        if (Object.keys(errors).length > 0) {
          allErrors[step.id] = errors;
          hasErrors = true;
        }
      }
      if (hasErrors) {
        setStepErrors(allErrors);
        setSubmitError('Please complete all required fields before adding to cart.');
        setIsSubmitting(false);
        return;
      }

      // Server-side price validation
      const priceData = await calculateStepsPrice({ id: product._id, stepSelections, quantity }).unwrap();

      // Build cart item
      const cartItem = {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        stepSelections,
        quantity,
        unitPrice: priceData.data.finalPrice,
        totalPrice: priceData.data.totalPrice,
        priceBreakdown: priceData.data,
        addedAt: new Date().toISOString(),
      };

      // Persist to localStorage cart
      const existing = JSON.parse(localStorage.getItem('cart') || '[]');
      existing.push(cartItem);
      localStorage.setItem('cart', JSON.stringify(existing));

      setCartSuccess(true);
    } catch (err) {
      setSubmitError(err.data?.message || 'Failed to add to cart. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!configSteps.length) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        This product is configured for Steps UI but has no steps defined. Please contact the administrator.
      </Alert>
    );
  }

  if (cartSuccess) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CheckCircleIcon sx={{ fontSize: 56, color: '#16a34a', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>Added to Cart!</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Your custom {product.name} has been added to your cart.</Typography>
        <Button variant="contained" onClick={() => setCartSuccess(false)}>Configure Another</Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Draggable step pills */}
      <DraggableSteps
        steps={configSteps}
        currentStep={currentStep}
        onGoToStep={handleGoToStep}
        onReorder={(reordered, newIdx) => { setOrderedSteps(reordered); setCurrentStep(newIdx); }}
      />

      {/* Progress bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
            Step {currentStep + 1} of {totalSteps}
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
            {Math.round(progress)}% complete
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: '#e2e8f0',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #0284c7 0%, #0f172a 100%)',
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            },
          }}
        />
      </Box>

      {/* Step title & description */}
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: { xs: 18, sm: 20 }, fontWeight: 700, color: '#0f172a' }}>
          {currentStepConfig?.title || 'Review'}
        </Typography>
        {currentStepConfig?.description && (
          <Typography sx={{ fontSize: 13, color: '#64748b', mt: 0.5 }}>
            {currentStepConfig.description}
          </Typography>
        )}
      </Box>

      {/* Step content */}
      <Box
        key={currentStepConfig?.id || `step-panel-${currentStep}`}
        className="anim-fade-in-up"
        sx={{
          bgcolor: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          transition: 'all 0.25s ease',
        }}
      >
        {isReviewStep ? (
          <StepReview
            product={product}
            stepsConfig={configSteps}
            stepSelections={stepSelections}
            priceResult={priceResult}
            gallery={gallery}
            activeImage={activeImage}
            onGoToStep={handleGoToStep}
            onAddToCart={handleAddToCart}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        ) : (
          <StepContent
            step={currentStepConfig}
            stepValue={stepSelections[currentStepConfig?.id] || {}}
            onChange={(val) => updateStepSelection(currentStepConfig.id, val)}
            errors={stepErrors[currentStepConfig?.id] || {}}
          />
        )}
      </Box>

      {/* Navigation */}
      {!isReviewStep && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon className="back-icon" sx={{ transition: 'transform 0.2s ease' }} />}
            onClick={handleBack}
            disabled={currentStep === 0}
            sx={{
              minWidth: 100,
              borderRadius: "12px",
              borderColor: '#cbd5e1',
              color: '#334155',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              '&:hover:not(:disabled)': {
                borderColor: '#0f172a',
                bgcolor: '#f1f5f9',
                color: '#0f172a !important',
                transform: 'translateX(-2px)',
                '& .back-icon': { transform: 'translateX(-3px)', color: '#0f172a' },
              },
            }}
          >
            Back
          </Button>
          <Button
            className="btn-shine-effect"
            variant="contained"
            endIcon={<ArrowForwardIcon className="next-icon" sx={{ transition: 'transform 0.2s ease' }} />}
            onClick={handleContinue}
            sx={{
              minWidth: 140,
              borderRadius: "12px",
              bgcolor: '#0f172a',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
              '&:hover': {
                bgcolor: '#1e293b',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.25)',
                '& .next-icon': { transform: 'translateX(3px)' },
              },
            }}
          >
            {currentStep === totalSteps - 2 ? 'Review' : 'Continue'}
          </Button>
        </Box>
      )}
      {isReviewStep && currentStep > 0 && (
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon className="back-icon" sx={{ transition: 'transform 0.2s ease' }} />}
          onClick={handleBack}
          sx={{
            mt: 1,
            borderRadius: '12px',
            borderColor: '#cbd5e1',
            color: '#334155',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            '&:hover:not(:disabled)': {
              borderColor: '#0f172a',
              bgcolor: '#f1f5f9',
              color: '#0f172a !important',
              transform: 'translateX(-2px)',
              '& .back-icon': { transform: 'translateX(-3px)', color: '#0f172a' },
            },
          }}
        >
          Back to Edit
        </Button>
      )}

      {/* Mobile Sticky Summary Bar */}
      <MobileStickySummaryBar
        product={product}
        stepsConfig={configSteps}
        stepSelections={stepSelections}
        currentStep={currentStep}
        totalSteps={totalSteps}
        isReviewStep={isReviewStep}
        progress={progress}
        priceResult={priceResult}
        gallery={gallery}
        activeImage={activeImage}
        onContinue={handleContinue}
        onBack={handleBack}
        onGoToStep={handleGoToStep}
        onAddToCart={handleAddToCart}
        isSubmitting={isSubmitting}
      />
    </Box>
  );
}

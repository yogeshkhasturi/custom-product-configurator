'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
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

// Validate a single step's selections; returns { [fieldName]: errorMsg }
function validateStep(step, stepSel = {}) {
  const errors = {};
  if (!step.required) return errors;
  for (const field of (step.fields || [])) {
    if (!field.required) continue;
    if (field.type === 'dimensions') {
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
      const empty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
      if (empty) errors[field.name] = `${field.label || field.name} is required`;
    }
  }
  return errors;
}

// Stepper for a single dropdown-type dimension field (e.g. Top Diameter)
function StepDimensionField({ field, value, onChange, error }) {
  const options = field.options || [];
  const idx = options.findIndex((o) => o.value === value);
  const effectiveIdx = idx < 0 && options.length > 0 ? 0 : idx;
  const current = options[effectiveIdx] ?? null;
  const display = current ? (current.label || current.value).replace(/\s*inches/i, '').trim() : '—';

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
          onClick={() => effectiveIdx > 0 && onChange(options[effectiveIdx - 1].value)}
          disabled={effectiveIdx <= 0}
          sx={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', bgcolor: 'transparent', cursor: effectiveIdx <= 0 ? 'not-allowed' : 'pointer', opacity: effectiveIdx <= 0 ? 0.3 : 1, color: '#475569', borderRadius: '6px', '&:hover:not(:disabled)': { bgcolor: '#f1f5f9' } }}>
          <RemoveIcon sx={{ fontSize: 18 }} />
        </Box>
        <Typography sx={{ fontSize: { xs: 14, sm: 16 }, fontWeight: 700, color: '#0f172a', userSelect: 'none' }}>{display}</Typography>
        <Box component="button" type="button"
          onClick={() => effectiveIdx < options.length - 1 && onChange(options[effectiveIdx + 1].value)}
          disabled={effectiveIdx >= options.length - 1}
          sx={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', bgcolor: 'transparent', cursor: effectiveIdx >= options.length - 1 ? 'not-allowed' : 'pointer', opacity: effectiveIdx >= options.length - 1 ? 0.3 : 1, color: '#475569', borderRadius: '6px', '&:hover:not(:disabled)': { bgcolor: '#f1f5f9' } }}>
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

  const firstField = step.fields[0];

  if (step.type === 'dimensions') {
    // Dimensions step: render all fields as steppers side by side
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: `repeat(${Math.min(step.fields.length, 3)}, 1fr)`, sm: `repeat(${step.fields.length}, 1fr)` }, gap: { xs: 1, sm: 1.5, md: 2 } }}>
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
  if (step.type && step.type !== 'step') return step.type;
  if (!fields.length) return 'image_cards';
  // Dimension fields: dropdown type with dimension-related names
  if (fields.every((f) => /diameter|slant|height|width|depth|dimension/i.test(f.name) && (f.type === 'dropdown' || f.type === 'number'))) return 'dimensions';
  // Swatch/color fields
  if (fields.some((f) => f.type === 'swatch' || f.type === 'color')) return 'swatch_grid';
  // Select/dropdown/checkbox fields
  if (fields.some((f) => f.type === 'select' || f.type === 'dropdown' || f.type === 'checkbox')) return 'finishing';
  return 'image_cards';
}

export default function StepsConfigurator({ product, gallery, activeImage, setGallery, setActiveImage, onPriceResult }) {
  const customizationFields = product.customizationFields || [];

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

  const stepsConfig = rawSteps.map((s) => {
    const fields = resolveStepFields(s, customizationFields);
    return { ...s, fields, type: inferStepType(s, fields) };
  });

  const reviewIdx = stepsConfig.findIndex((s) => s.type === 'review');
  // Ensure review is last; if not present, we'll show it as a virtual last step
  const configSteps = reviewIdx >= 0 ? stepsConfig : [...stepsConfig, { id: '__review__', title: 'Review', type: 'review', enabled: true, order: stepsConfig.length, fields: [] }];
  const totalSteps = configSteps.length;

  const [currentStep, setCurrentStep] = useState(0);
  const [stepSelections, setStepSelections] = useState({});
  const [stepErrors, setStepErrors] = useState({});
  const [priceResult, setPriceResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [cartSuccess, setCartSuccess] = useState(false);

  const [calculateStepsPrice] = useCalculateStepsPriceMutation();
  const [resolveConfiguration] = useResolveConfigurationMutation();
  const priceReqId = useRef(0);

  // Initialize default values from stepsConfig
  useEffect(() => {
    const initial = {};
    for (const step of configSteps) {
      if (step.type === 'review') continue;
      const stepInit = {};
      for (const field of (step.fields || [])) {
        if (field.type === 'dimensions') {
          const dimInit = {};
          for (const dim of (field.dimensions || [])) {
            dimInit[dim.name] = dim.defaultValue !== undefined && dim.defaultValue !== '' ? dim.defaultValue : (dim.min || 1);
          }
          if (Object.keys(dimInit).length) stepInit[field.name] = dimInit;
        } else if (field.defaultValue !== undefined && field.defaultValue !== '') {
          stepInit[field.name] = field.defaultValue;
        } else if (field.options?.length > 0) {
          stepInit[field.name] = field.options[0].value;
        }
      }
      if (Object.keys(stepInit).length) initial[step.id] = stepInit;
    }
    setStepSelections(initial);
  }, [product._id]);

  // Recalculate price and resolve gallery whenever selections change
  useEffect(() => {
    const reqId = ++priceReqId.current;
    const timer = setTimeout(async () => {
      // 1. Seed flatSelections with defaults from all customizationFields so resolveConfiguration has all attributes
      const flatSelections = {};
      (customizationFields || []).forEach((f) => {
        if (f.defaultValue !== undefined && f.defaultValue !== '') {
          flatSelections[f.name] = f.defaultValue;
        } else if (f.options?.length > 0) {
          flatSelections[f.name] = f.options[0].value;
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
              const opt = (field.options || []).find((o) => o.value === val);
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
        setActiveImage(0);
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
  }, []);

  const handleContinue = () => {
    if (isReviewStep) return;
    const step = currentStepConfig;
    const errors = validateStep(step, stepSelections[step.id] || {});
    if (Object.keys(errors).length > 0) {
      setStepErrors((prev) => ({ ...prev, [step.id]: errors }));
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToStep = (idx) => {
    setCurrentStep(idx);
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

  if (!stepsConfig.length) {
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
          sx={{ height: 4, borderRadius: 2, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#0f172a' } }}
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
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', p: { xs: 2, sm: 2.5 }, mb: 3 }}>
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
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            disabled={currentStep === 0}
            sx={{ minWidth: 100 }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={handleContinue}
            sx={{ minWidth: 140 }}
          >
            {currentStep === totalSteps - 2 ? 'Review' : 'Continue'}
          </Button>
        </Box>
      )}
      {isReviewStep && currentStep > 0 && (
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 1 }}>
          Back to Edit
        </Button>
      )}
    </Box>
  );
}

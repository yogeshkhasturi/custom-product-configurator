'use client';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import EditIcon from '@mui/icons-material/Edit';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';

export default function StepReview({
  product,
  stepsConfig,
  stepSelections,
  priceResult,
  gallery,
  activeImage,
  onGoToStep,
  onAddToCart,
  isSubmitting,
  submitError,
}) {
  const [quantity, setQuantity] = useState(1);
  const finalPrice = priceResult?.finalPrice ?? product.basePrice;
  const totalPrice = Math.round(finalPrice * quantity * 100) / 100;

  // Build summary rows from all steps
  const summaryRows = [];
  const enabledSteps = (stepsConfig || []).filter((s) => s.enabled && s.type !== 'review').sort((a, b) => a.order - b.order);

  for (const step of enabledSteps) {
    const stepSel = stepSelections[step.id] || {};
    for (const field of (step.fields || [])) {
      const val = stepSel[field.name];
      if (val === undefined || val === null || val === '') continue;

      if (field.type === 'dimensions') {
        for (const dim of (field.dimensions || [])) {
          const dimVal = val[dim.name];
          if (dimVal !== undefined && dimVal !== '') {
            summaryRows.push({ stepId: step.id, stepTitle: step.title, label: dim.label || dim.name, value: `${dimVal} ${dim.unit || 'in'}` });
          }
        }
      } else if (field.type === 'checkbox' || field.type === 'multi_select') {
        const checked = Array.isArray(val) ? val : [val];
        if (checked.length > 0) {
          const labels = checked.map((v) => (field.options || []).find((o) => o.value === v)?.label || v).join(', ');
          summaryRows.push({ stepId: step.id, stepTitle: step.title, label: field.label || field.name, value: labels });
        }
      } else {
        const opt = (field.options || []).find((o) => o.value === val);
        summaryRows.push({ stepId: step.id, stepTitle: step.title, label: field.label || field.name, value: opt?.label || val });
      }
    }
  }

  return (
    <Box>
      {/* Product preview */}
      {gallery?.length > 0 && (
        <Box sx={{ width: '100%', height: { xs: 200, sm: 240 }, borderRadius: '10px', border: '1px solid #e2e8f0', bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', mb: 3, p: 1 }}>
          <img src={gallery[activeImage] || gallery[0]} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </Box>
      )}

      {/* Configuration summary */}
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a', mb: 1.5 }}>Your Configuration</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {summaryRows.map((row, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', py: 1, borderBottom: '1px solid #f1f5f9', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>{row.label}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{row.value}</Typography>
              <Box
                onClick={() => {
                  const stepIdx = (stepsConfig || []).findIndex((s) => s.id === row.stepId);
                  if (stepIdx >= 0) onGoToStep(stepIdx);
                }}
                sx={{ cursor: 'pointer', color: '#0284c7', display: 'flex', alignItems: 'center' }}
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Price breakdown */}
      {priceResult && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
            Price Breakdown
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>Base Price</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>${priceResult.basePrice.toFixed(2)}</Typography>
          </Box>
          {(priceResult.adjustments || []).map((adj, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: 12.5, color: '#64748b', maxWidth: '65%' }}>
                {adj.field}{adj.selection ? ` — ${adj.selection}` : ''}
              </Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                {adj.amount >= 0 ? '+' : ''}${adj.amount.toFixed(2)}
              </Typography>
            </Box>
          ))}
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Unit Price</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>${finalPrice.toFixed(2)}</Typography>
          </Box>
        </>
      )}

      {/* Quantity */}
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Quantity</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <Box component="button" type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { bgcolor: '#f1f5f9' } }}>
            <RemoveIcon sx={{ fontSize: 16 }} />
          </Box>
          <Typography sx={{ px: 2, fontSize: 14, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>{quantity}</Typography>
          <Box component="button" type="button" onClick={() => setQuantity((q) => q + 1)}
            sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { bgcolor: '#f1f5f9' } }}>
            <AddIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0f172a', ml: 'auto' }}>
          ${totalPrice.toFixed(2)}
        </Typography>
      </Box>

      {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}

      <Button
        fullWidth
        variant="contained"
        size="large"
        disabled={isSubmitting}
        onClick={() => onAddToCart(quantity)}
        sx={{ py: 1.5, fontSize: 15, fontWeight: 700 }}
      >
        {isSubmitting ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Add to Cart'}
      </Button>
    </Box>
  );
}

'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import { resolveImageUrl } from '../../../../lib/pricingUtils';

export default function StepImageCards({ field, value, onChange, error }) {
  const options = field.options || [];
  const isMulti = field.type === 'multi_select' || field.type === 'checkbox';

  const isSelected = (optVal) => {
    if (isMulti) return Array.isArray(value) && value.includes(optVal);
    return value === optVal;
  };

  const handleClick = (optVal) => {
    if (isMulti) {
      const arr = Array.isArray(value) ? value : [];
      onChange(arr.includes(optVal) ? arr.filter((v) => v !== optVal) : [...arr, optVal]);
    } else {
      onChange(optVal);
    }
  };

  return (
    <Box>
      {field.helpText && (
        <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2 }}>{field.helpText}</Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(auto-fill, minmax(130px, 1fr))' },
          gap: { xs: 1.25, sm: 1.75 },
        }}
      >
        {options.map((opt) => {
          const selected = isSelected(opt.value);
          return (
            <Box
              key={opt.value}
              onClick={() => handleClick(opt.value)}
              sx={{
                border: selected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                bgcolor: selected ? '#f0f9ff' : '#fff',
                borderRadius: '10px',
                p: { xs: 1.25, sm: 1.75 },
                cursor: 'pointer',
                position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: selected ? '#0284c7' : '#cbd5e1', transform: 'translateY(-1px)' },
              }}
            >
              {selected && (
                <Box sx={{
                  position: 'absolute', top: { xs: 6, sm: 8 }, right: { xs: 6, sm: 8 },
                  width: 18, height: 18, borderRadius: '50%', bgcolor: '#0284c7', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckIcon sx={{ fontSize: 13 }} />
                </Box>
              )}
              <Box sx={{ width: { xs: 52, sm: 64 }, height: { xs: 46, sm: 56 }, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                {opt.images?.[0] ? (
                  <img src={resolveImageUrl(opt.images[0])} alt={opt.label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <Box sx={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #cbd5e1' }} />
                )}
              </Box>
              <Typography sx={{ fontSize: { xs: 12, sm: 13 }, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                {opt.label}
              </Typography>
              {opt.description && (
                <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.25, lineHeight: 1.3 }}>{opt.description}</Typography>
              )}
              {opt.priceAdjustment > 0 && (
                <Typography sx={{ fontSize: 11, color: '#dc2626', fontWeight: 600, mt: 0.5 }}>
                  +${Number(opt.priceAdjustment).toFixed(2)}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
      {error && <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>{error}</Typography>}
    </Box>
  );
}

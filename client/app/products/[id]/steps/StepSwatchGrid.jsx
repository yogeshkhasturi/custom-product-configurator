'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import { resolveImageUrl } from '../../../../lib/pricingUtils';

export default function StepSwatchGrid({ field, value, onChange, error }) {
  const options = field.options || [];

  return (
    <Box>
      {field.helpText && (
        <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2 }}>{field.helpText}</Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(auto-fill, minmax(140px, 1fr))' },
          gap: { xs: 1.25, sm: 1.75 },
        }}
      >
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Box
              key={opt.value}
              onClick={() => onChange(opt.value)}
              sx={{
                border: selected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                bgcolor: '#fff', borderRadius: '10px', overflow: 'hidden',
                cursor: 'pointer', position: 'relative',
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: selected ? '#0284c7' : '#cbd5e1', transform: 'translateY(-2px)' },
              }}
            >
              {selected && (
                <Box sx={{
                  position: 'absolute', top: { xs: 6, sm: 8 }, right: { xs: 6, sm: 8 },
                  width: 18, height: 18, borderRadius: '50%', bgcolor: '#0284c7', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                }}>
                  <CheckIcon sx={{ fontSize: 13 }} />
                </Box>
              )}
              <Box sx={{ width: '100%', height: { xs: 72, sm: 84 }, bgcolor: '#f1f5f9' }}>
                {opt.images?.[0] ? (
                  <img src={resolveImageUrl(opt.images[0])} alt={opt.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Box sx={{ width: '100%', height: '100%', bgcolor: opt.colorHex || '#e2e8f0' }} />
                )}
              </Box>
              <Box sx={{ p: { xs: 1, sm: 1.25 }, textAlign: 'center' }}>
                <Typography sx={{ fontSize: { xs: 12, sm: 12.5 }, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {opt.label}
                </Typography>
                {opt.description && (
                  <Typography sx={{ fontSize: 11, color: '#64748b', mt: 0.25 }}>{opt.description}</Typography>
                )}
                {opt.priceAdjustment > 0 && (
                  <Typography sx={{ fontSize: 11.5, color: '#0284c7', fontWeight: 600, mt: 0.25 }}>
                    +${Number(opt.priceAdjustment).toFixed(2)}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
      {error && <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>{error}</Typography>}
    </Box>
  );
}

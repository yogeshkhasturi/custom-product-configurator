'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import { resolveImageUrl } from '../../../../lib/pricingUtils';

export default function StepSwatchGrid({ field, value, onChange, error }) {
  const options = field.options || [];

  const getOptVal = (opt) => (opt.value !== undefined && opt.value !== '') ? opt.value : opt.label;

  const isSelected = (opt) => {
    if (value === null || value === undefined || value === '') return false;
    const optVal = getOptVal(opt);
    return (
      String(value) === String(optVal) ||
      (opt.value && String(value) === String(opt.value)) ||
      (opt.label && String(value) === String(opt.label))
    );
  };

  return (
    <Box>
      {field.helpText && (
        <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2 }}>{field.helpText}</Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(auto-fill, minmax(120px, 150px))' },
          gap: { xs: 1.25, sm: 1.75 },
        }}
      >
        {options.map((opt, idx) => {
          const selected = isSelected(opt);
          const optVal = getOptVal(opt);
          const optKey = optVal ? String(optVal) : `opt-${idx}`;

          return (
            <Box
              key={optKey}
              role="button"
              tabIndex={0}
              onClick={() => onChange(optVal)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(optVal); } }}
              sx={{
                border: selected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                bgcolor: selected ? '#f0f9ff' : '#fff',
                borderRadius: '10px',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                outline: 'none',
                maxWidth: { sm: 160 },
                boxShadow: selected ? '0 4px 14px rgba(2, 132, 199, 0.18)' : '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'all 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
                '&:hover': {
                  borderColor: selected ? '#0284c7' : '#94a3b8',
                  transform: 'translateY(-3px)',
                  boxShadow: selected ? '0 6px 20px rgba(2, 132, 199, 0.22)' : '0 6px 16px rgba(15, 23, 42, 0.08)',
                  '& img': { transform: 'scale(1.06)' },
                },
                '&:active': { transform: 'scale(0.97)' },
                '&:focus-visible': { boxShadow: '0 0 0 3px rgba(2,132,199,0.4)' },
              }}
            >
              {selected && (
                <Box
                  className="anim-badge-pop"
                  sx={{
                    position: 'absolute', top: { xs: 6, sm: 8 }, right: { xs: 6, sm: 8 },
                    width: 18, height: 18, borderRadius: '50%', bgcolor: '#0284c7', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                  }}
                >
                  <CheckIcon sx={{ fontSize: 13 }} />
                </Box>
              )}
              <Box sx={{
                width: '100%',
                height: { xs: 105, sm: 120 },
                bgcolor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                p: { xs: 1, sm: 1.25 },
              }}>
                {opt.images?.[0] ? (
                  <img
                    src={resolveImageUrl(opt.images[0])}
                    alt={opt.label || optVal}
                    style={{
                      maxWidth: '85%',
                      maxHeight: '85%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      display: 'block',
                      transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    }}
                  />
                ) : (
                  <Box sx={{ width: '100%', height: '100%', bgcolor: opt.colorHex || '#e2e8f0', borderRadius: '4px' }} />
                )}
              </Box>
              <Box sx={{ p: { xs: 1, sm: 1.25 }, textAlign: 'center' }}>
                <Typography sx={{ fontSize: { xs: 12, sm: 12.5 }, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {opt.label || opt.value}
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

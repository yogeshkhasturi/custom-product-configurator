'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';

function DimInput({ dim, value, onChange, error }) {
  const num = parseFloat(value);
  const min = dim.min ?? 1;
  const max = dim.max ?? 999;
  const step = dim.step ?? 1;

  const decrement = () => {
    const next = Math.max(min, (isNaN(num) ? min : num) - step);
    onChange(next);
  };
  const increment = () => {
    const next = Math.min(max, (isNaN(num) ? min : num) + step);
    onChange(next);
  };

  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="body2"
        title={dim.label || dim.name}
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
        {dim.label || dim.name}
      </Typography>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: '1px solid', borderColor: error ? 'error.main' : '#cbd5e1',
          borderRadius: '8px', bgcolor: '#fff', height: { xs: 38, sm: 42 }, px: 0.5,
        }}
      >
        <Box
          component="button" type="button" onClick={decrement} disabled={!isNaN(num) && num <= min}
          sx={{
            width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 }, display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: 'none', bgcolor: 'transparent',
            cursor: (!isNaN(num) && num <= min) ? 'not-allowed' : 'pointer',
            opacity: (!isNaN(num) && num <= min) ? 0.3 : 1, color: '#475569', borderRadius: '6px',
            '&:hover:not(:disabled)': { bgcolor: '#f1f5f9' },
          }}
        >
          <RemoveIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
        </Box>
        <Typography sx={{ fontSize: { xs: 14, sm: 16 }, fontWeight: 700, color: '#0f172a', userSelect: 'none' }}>
          {isNaN(num) ? '—' : num}
        </Typography>
        <Box
          component="button" type="button" onClick={increment} disabled={!isNaN(num) && num >= max}
          sx={{
            width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 }, display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: 'none', bgcolor: 'transparent',
            cursor: (!isNaN(num) && num >= max) ? 'not-allowed' : 'pointer',
            opacity: (!isNaN(num) && num >= max) ? 0.3 : 1, color: '#475569', borderRadius: '6px',
            '&:hover:not(:disabled)': { bgcolor: '#f1f5f9' },
          }}
        >
          <AddIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
        </Box>
      </Box>
      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#94a3b8', mt: 0.5 }}>
        {dim.unit || 'inches'}
      </Typography>
      {error && <Typography variant="caption" color="error.main" sx={{ display: 'block', textAlign: 'center' }}>{error}</Typography>}
    </Box>
  );
}

export default function StepDimensions({ field, value = {}, onChange, errors = {} }) {
  const dims = field.dimensions || [];

  const handleDimChange = (dimName, val) => {
    onChange({ ...value, [dimName]: val });
  };

  return (
    <Box>
      {field.helpText && (
        <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2 }}>{field.helpText}</Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: `repeat(${Math.min(dims.length, 3)}, 1fr)`, sm: `repeat(${dims.length}, 1fr)` },
          gap: { xs: 1, sm: 1.5, md: 2 },
        }}
      >
        {dims.map((dim) => (
          <DimInput
            key={dim.name}
            dim={dim}
            value={value[dim.name]}
            onChange={(val) => handleDimChange(dim.name, val)}
            error={errors[dim.name]}
          />
        ))}
      </Box>
    </Box>
  );
}

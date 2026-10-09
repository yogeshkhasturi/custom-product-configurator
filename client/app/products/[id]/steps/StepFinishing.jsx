'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import CheckIcon from '@mui/icons-material/Check';

function FieldRenderer({ field, value, onChange, error }) {
  if (field.type === 'select' || field.type === 'dropdown') {
    return (
      <FormControl fullWidth size="small" error={!!error}>
        <InputLabel>{field.label || field.name}</InputLabel>
        <Select value={value || ''} label={field.label || field.name} onChange={(e) => onChange(e.target.value)}>
          {(field.options || []).map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}{opt.priceAdjustment > 0 ? ` (+$${Number(opt.priceAdjustment).toFixed(2)})` : ''}
            </MenuItem>
          ))}
        </Select>
        {error && <Typography variant="caption" color="error.main">{error}</Typography>}
      </FormControl>
    );
  }

  if (field.type === 'radio' || field.type === 'image_cards') {
    return (
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1, color: '#334155' }}>{field.label || field.name}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {(field.options || []).map((opt) => {
            const selected = value === opt.value;
            return (
              <Box
                key={opt.value}
                onClick={() => onChange(opt.value)}
                sx={{
                  border: selected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  bgcolor: selected ? '#f0f9ff' : '#fff',
                  borderRadius: '8px', px: 1.5, py: 1, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 1,
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: '#94a3b8' },
                }}
              >
                {selected && <CheckIcon sx={{ fontSize: 14, color: '#0284c7' }} />}
                <Typography sx={{ fontSize: 13, fontWeight: selected ? 700 : 400, color: '#0f172a' }}>
                  {opt.label}{opt.priceAdjustment > 0 ? ` (+$${Number(opt.priceAdjustment).toFixed(2)})` : ''}
                </Typography>
              </Box>
            );
          })}
        </Box>
        {error && <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>{error}</Typography>}
      </Box>
    );
  }

  if (field.type === 'checkbox' || field.type === 'multi_select') {
    const checked = Array.isArray(value) ? value : [];
    return (
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5, color: '#334155' }}>{field.label || field.name}</Typography>
        {(field.options || []).map((opt) => (
          <FormControlLabel
            key={opt.value}
            control={
              <Checkbox
                size="small"
                checked={checked.includes(opt.value)}
                onChange={(e) => {
                  const next = e.target.checked ? [...checked, opt.value] : checked.filter((v) => v !== opt.value);
                  onChange(next);
                }}
              />
            }
            label={`${opt.label}${opt.priceAdjustment > 0 ? ` (+$${Number(opt.priceAdjustment).toFixed(2)})` : ''}`}
          />
        ))}
        {error && <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>{error}</Typography>}
      </Box>
    );
  }

  return null;
}

export default function StepFinishing({ step, stepValue = {}, onChange, errors = {} }) {
  const fields = (step.fields || []);

  const handleFieldChange = (fieldName, val) => {
    onChange({ ...stepValue, [fieldName]: val });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {fields.map((field) => (
        <Box key={field.name || field.id}>
          <FieldRenderer
            field={field}
            value={stepValue[field.name]}
            onChange={(val) => handleFieldChange(field.name, val)}
            error={errors[field.name]}
          />
          {field.helpText && (
            <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.5 }}>{field.helpText}</Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

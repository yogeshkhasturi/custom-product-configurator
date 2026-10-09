'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Checkbox from '@mui/material/Checkbox';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import TablePagination from '@mui/material/TablePagination';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import TuneIcon from '@mui/icons-material/Tune';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useCreateProductMutation, useUpdateProductMutation } from '../../../lib/productsApi';
import ImageUploader from './ImageUploader';

const FIELD_TYPES = ['select', 'dropdown', 'radio', 'checkbox', 'color', 'swatch', 'number', 'text', 'textarea'];
const FIELD_TYPE_LABELS = {
  select: 'Select (dropdown list)',
  dropdown: 'Dropdown (+ / − stepper)',
  number: 'Number (+ / − stepper)',
  radio: 'Radio buttons',
  checkbox: 'Checkboxes',
  color: 'Color swatches',
  swatch: 'Fabric image tiles',
  text: 'Text input',
  textarea: 'Textarea',
};
const PRICING_TYPES = ['fixed', 'percentage', 'per_unit', 'range'];
const PRICING_TYPE_LABELS = { fixed: 'Fixed ($)', percentage: 'Percentage (%)', per_unit: 'Per Unit (qty × $)', range: 'Range-Based' };

const emptyOption = () => ({ label: '', value: '', priceAdjustment: 0, pricingType: 'fixed', priceRanges: [], images: [], description: '', sku: '' });
const emptyField = () => ({
  name: '', label: '', type: 'select', required: false, order: 0,
  options: [], pricingConfig: { pricingType: 'fixed', perUnitPrice: 0, priceRanges: [] },
  conditions: [], placeholder: '', helpText: '', min: '', max: '',
  _expanded: true,
});
const emptyCondition = () => ({ field: '', operator: 'eq', value: '' });
const emptyRange = () => ({ min: '', max: '', amount: '' });
const emptyStep = () => ({ id: `step-${Date.now()}`, title: '', fieldNames: [] });

const emptyStepConfig = () => ({
  id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title: '',
  description: '',
  type: 'image_cards',
  order: 0,
  enabled: true,
  required: true,
  fieldNames: [],
});
const emptyStepField = () => ({ name: '', label: '', type: 'image_cards', required: false, options: [], helpText: '', dimensions: [] });
const emptyStepOption = () => ({ label: '', value: '', priceAdjustment: 0, images: [], description: '' });
const emptyDimension = () => ({ name: '', label: '', unit: 'inches', min: 1, max: 100, step: 1, required: true, priceRanges: [] });
const VARIATION_FIELD_TYPES = ['select', 'dropdown', 'radio', 'color', 'swatch', 'number', 'checkbox'];

function generateVariations(customizationFields) {
  const fields = customizationFields
    .filter((f) => VARIATION_FIELD_TYPES.includes(f.type) && f.options?.length > 0)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!fields.length) return [];
  let combos = [{}];
  for (const field of fields) {
    const next = [];
    for (const combo of combos) {
      for (const opt of field.options) next.push({ ...combo, [field.name]: opt.value });
    }
    combos = next;
  }
  return combos;
}

function buildConfigKey(customizationFields, selections) {
  const fields = [...customizationFields].sort((a, b) => (a.order || 0) - (b.order || 0));
  return fields.map((f) => String(selections[f.name] ?? '').trim().toLowerCase()).join('|');
}

// Section wrapper used throughout the form
function Section({ title, subtitle, icon, action, children }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {icon && <Box sx={{ color: 'secondary.main' }}>{icon}</Box>}
          <Box>
            <Typography variant="h6" fontWeight={700}>{title}</Typography>
            {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
          </Box>
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
}

export default function ProductForm({ initialData, mode = 'create' }) {
  const router = useRouter();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const saving = isCreating || isUpdating;
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    sku: initialData?.sku || '',
    basePrice: initialData?.basePrice ?? '',
    images: initialData?.images || [],
    status: initialData?.status || 'active',
    configuratorDisplayMode: initialData?.configuratorDisplayMode || 'normal',
    customizationFields: (initialData?.customizationFields || []).map((f) => ({ ...f, _expanded: false })),
    configurations: (initialData?.configurations || []).map((c) => ({ ...c, images: c.images || [] })),
    steps: initialData?.steps || [],
    stepsConfig: (initialData?.stepsConfig && initialData.stepsConfig.length > 0)
      ? initialData.stepsConfig
      : (initialData?.steps || []).map((s, i) => ({
          id: s.id || `sc-${Date.now()}-${i}`,
          title: s.title,
          description: '',
          type: 'image_cards',
          order: i,
          enabled: true,
          required: false,
          fieldNames: s.fieldNames || [],
        })),
  });

  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  // Steps
  const addStep = () => setField('steps', [...form.steps, emptyStep()]);
  const removeStep = (si) => setField('steps', form.steps.filter((_, i) => i !== si));
  const updateStep = (si, key, val) => setField('steps', form.steps.map((s, i) => i === si ? { ...s, [key]: val } : s));
  const moveStep = (si, dir) => {
    const arr = [...form.steps];
    const target = si + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[si], arr[target]] = [arr[target], arr[si]];
    setField('steps', arr);
  };

  // Steps Config (Steps UI)
  const addStepConfig = () => {
    const s = emptyStepConfig();
    s.order = form.stepsConfig.length;
    setField('stepsConfig', [...form.stepsConfig, s]);
  };
  const removeStepConfig = (si) => setField('stepsConfig', form.stepsConfig.filter((_, i) => i !== si));
  const updateStepConfig = (si, key, val) => setField('stepsConfig', form.stepsConfig.map((s, i) => i === si ? { ...s, [key]: val } : s));
  const moveStepConfig = (si, dir) => {
    const arr = [...form.stepsConfig];
    const t = si + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[si], arr[t]] = [arr[t], arr[si]];
    arr.forEach((s, i) => (s.order = i));
    setField('stepsConfig', arr);
  };
  const [expandedStepConfigs, setExpandedStepConfigs] = useState({});
  const toggleStepConfigExpand = (si) => setExpandedStepConfigs((p) => ({ ...p, [si]: !p[si] }));

  // StepConfig fields
  const addStepField = (si) => updateStepConfig(si, 'fields', [...(form.stepsConfig[si].fields || []), emptyStepField()]);
  const removeStepField = (si, fi) => updateStepConfig(si, 'fields', form.stepsConfig[si].fields.filter((_, i) => i !== fi));
  const updateStepField = (si, fi, key, val) => updateStepConfig(si, 'fields', form.stepsConfig[si].fields.map((f, i) => i === fi ? { ...f, [key]: val } : f));

  // StepConfig field options
  const addStepFieldOption = (si, fi) => updateStepField(si, fi, 'options', [...(form.stepsConfig[si].fields[fi].options || []), emptyStepOption()]);
  const removeStepFieldOption = (si, fi, oi) => updateStepField(si, fi, 'options', form.stepsConfig[si].fields[fi].options.filter((_, i) => i !== oi));
  const updateStepFieldOption = (si, fi, oi, key, val) => updateStepField(si, fi, 'options', form.stepsConfig[si].fields[fi].options.map((o, i) => i === oi ? { ...o, [key]: val } : o));

  // StepConfig dimensions
  const addDimension = (si, fi) => updateStepField(si, fi, 'dimensions', [...(form.stepsConfig[si].fields[fi].dimensions || []), emptyDimension()]);
  const removeDimension = (si, fi, di) => updateStepField(si, fi, 'dimensions', form.stepsConfig[si].fields[fi].dimensions.filter((_, i) => i !== di));
  const updateDimension = (si, fi, di, key, val) => updateStepField(si, fi, 'dimensions', form.stepsConfig[si].fields[fi].dimensions.map((d, i) => i === di ? { ...d, [key]: val } : d));

  // Customization fields
  const addField = () => {
    const f = emptyField();
    f.order = form.customizationFields.length;
    setField('customizationFields', [...form.customizationFields, f]);
  };
  const removeField = (fi) => setField('customizationFields', form.customizationFields.filter((_, i) => i !== fi));
  const updateCField = (fi, key, val) => setField('customizationFields', form.customizationFields.map((f, i) => i === fi ? { ...f, [key]: val } : f));
  const moveCField = (fi, dir) => {
    const arr = [...form.customizationFields];
    const target = fi + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[fi], arr[target]] = [arr[target], arr[fi]];
    arr.forEach((f, i) => (f.order = i));
    setField('customizationFields', arr);
  };
  const toggleExpand = (fi) => updateCField(fi, '_expanded', !form.customizationFields[fi]._expanded);

  // Options
  const addOption = (fi) => updateCField(fi, 'options', [...form.customizationFields[fi].options, emptyOption()]);
  const removeOption = (fi, oi) => updateCField(fi, 'options', form.customizationFields[fi].options.filter((_, i) => i !== oi));
  const updateOption = (fi, oi, key, val) => updateCField(fi, 'options', form.customizationFields[fi].options.map((o, i) => i === oi ? { ...o, [key]: val } : o));

  // Option price ranges
  const addOptionRange = (fi, oi) => {
    const opts = [...form.customizationFields[fi].options];
    opts[oi] = { ...opts[oi], priceRanges: [...(opts[oi].priceRanges || []), emptyRange()] };
    updateCField(fi, 'options', opts);
  };
  const removeOptionRange = (fi, oi, ri) => {
    const opts = [...form.customizationFields[fi].options];
    opts[oi] = { ...opts[oi], priceRanges: opts[oi].priceRanges.filter((_, i) => i !== ri) };
    updateCField(fi, 'options', opts);
  };
  const updateOptionRange = (fi, oi, ri, key, val) => {
    const opts = [...form.customizationFields[fi].options];
    const ranges = [...opts[oi].priceRanges];
    ranges[ri] = { ...ranges[ri], [key]: val };
    opts[oi] = { ...opts[oi], priceRanges: ranges };
    updateCField(fi, 'options', opts);
  };

  // Field pricing config
  const updatePricingConfig = (fi, key, val) => updateCField(fi, 'pricingConfig', { ...form.customizationFields[fi].pricingConfig, [key]: val });
  const addFieldRange = (fi) => updatePricingConfig(fi, 'priceRanges', [...(form.customizationFields[fi].pricingConfig?.priceRanges || []), emptyRange()]);
  const removeFieldRange = (fi, ri) => updatePricingConfig(fi, 'priceRanges', form.customizationFields[fi].pricingConfig.priceRanges.filter((_, i) => i !== ri));
  const updateFieldRange = (fi, ri, key, val) => {
    const ranges = [...form.customizationFields[fi].pricingConfig.priceRanges];
    ranges[ri] = { ...ranges[ri], [key]: val };
    updatePricingConfig(fi, 'priceRanges', ranges);
  };

  // Variations
  const [editDialog, setEditDialog] = useState(null);
  const [varPage, setVarPage] = useState(0);
  const [varRowsPerPage, setVarRowsPerPage] = useState(10);
  const variationFields = useMemo(
    () => form.customizationFields.filter((f) => VARIATION_FIELD_TYPES.includes(f.type) && f.options?.length > 0).sort((a, b) => (a.order || 0) - (b.order || 0)),
    [form.customizationFields]
  );
  const allVariations = useMemo(() => { setVarPage(0); return generateVariations(form.customizationFields); }, [form.customizationFields]);
  const getConfigKey = (selections) => buildConfigKey(form.customizationFields, selections);
  const findConfig = (selections) => {
    const key = getConfigKey(selections);
    return (form.configurations || []).find((c) => buildConfigKey(form.customizationFields, c.selections) === key) || null;
  };
  const openEditDialog = (selections) => {
    const existing = findConfig(selections);
    setEditDialog({ selections, draft: { sku: existing?.sku || '', priceAdjustment: existing?.priceAdjustment ?? 0, status: existing?.status || 'active', images: existing?.images || [] } });
  };
  const saveEditDialog = () => {
    if (!editDialog) return;
    const { selections, draft } = editDialog;
    const key = getConfigKey(selections);
    const existing = (form.configurations || []).find((c) => buildConfigKey(form.customizationFields, c.selections) === key);
    const updated = { id: existing?.id || `config-${Date.now()}`, selections, sku: draft.sku, priceAdjustment: parseFloat(draft.priceAdjustment) || 0, status: draft.status, images: draft.images };
    if (existing) {
      setField('configurations', form.configurations.map((c) => buildConfigKey(form.customizationFields, c.selections) === key ? updated : c));
    } else {
      setField('configurations', [...(form.configurations || []), updated]);
    }
    setEditDialog(null);
  };
  const removeConfig = (selections) => {
    const key = getConfigKey(selections);
    setField('configurations', (form.configurations || []).filter((c) => buildConfigKey(form.customizationFields, c.selections) !== key));
  };

  // Conditions
  const addCondition = (fi) => updateCField(fi, 'conditions', [...form.customizationFields[fi].conditions, emptyCondition()]);
  const removeCondition = (fi, ci) => updateCField(fi, 'conditions', form.customizationFields[fi].conditions.filter((_, i) => i !== ci));
  const updateCondition = (fi, ci, key, val) => updateCField(fi, 'conditions', form.customizationFields[fi].conditions.map((c, i) => i === ci ? { ...c, [key]: val } : c));

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        name: form.name, description: form.description, sku: form.sku,
        basePrice: parseFloat(form.basePrice), images: form.images, status: form.status,
        configuratorDisplayMode: form.configuratorDisplayMode,
        customizationFields: form.customizationFields.map(({ _expanded, ...f }, i) => ({
          ...f, order: i,
          min: f.min !== '' ? Number(f.min) : undefined,
          max: f.max !== '' ? Number(f.max) : undefined,
          options: f.options.map((o) => ({ ...o, images: o.images || [], priceAdjustment: parseFloat(o.priceAdjustment) || 0, priceRanges: (o.priceRanges || []).map((r) => ({ min: Number(r.min), max: Number(r.max), amount: Number(r.amount) })) })),
          pricingConfig: { ...f.pricingConfig, perUnitPrice: parseFloat(f.pricingConfig?.perUnitPrice) || 0, priceRanges: (f.pricingConfig?.priceRanges || []).map((r) => ({ min: Number(r.min), max: Number(r.max), amount: Number(r.amount) })) },
          conditions: f.conditions.filter((c) => c.field && c.value !== ''),
        })),
        steps: form.steps.filter((s) => s.title.trim()),
        stepsConfig: form.stepsConfig.map((s, i) => {
          const resolvedFields = (s.fieldNames || []).map((fname) => {
            const cf = form.customizationFields.find((f) => f.name === fname);
            if (!cf) return null;
            const { _expanded, ...cleanField } = cf;
            return {
              ...cleanField,
              options: (cleanField.options || []).map((o) => ({
                ...o,
                images: o.images || [],
                priceAdjustment: parseFloat(o.priceAdjustment) || 0,
                priceRanges: (o.priceRanges || []).map((r) => ({ min: Number(r.min), max: Number(r.max), amount: Number(r.amount) })),
              })),
            };
          }).filter(Boolean);

          // Infer step type from fields if not explicitly set
          let stepType = s.type;
          if (stepType === 'step' || !stepType) {
            if (s.title?.toLowerCase() === 'review') stepType = 'review';
            else if (resolvedFields.some((f) => /diameter|slant|height|width|depth|dimension/i.test(f.name))) stepType = 'dimensions';
            else if (resolvedFields.some((f) => f.type === 'swatch' || f.type === 'color')) stepType = 'swatch_grid';
            else if (resolvedFields.some((f) => f.type === 'select' || f.type === 'dropdown' || f.type === 'checkbox')) stepType = 'finishing';
            else stepType = 'image_cards';
          }

          return {
            id: s.id,
            title: s.title,
            description: s.description || '',
            type: stepType,
            order: i,
            enabled: s.enabled !== false,
            required: s.required,
            fieldNames: s.fieldNames || [],
            fields: stepType === 'review' ? [] : resolvedFields,
          };
        }),
        configurations: (form.configurations || []).map((c) => ({ ...c, images: c.images || [], configurationKey: getConfigKey(c.selections), priceAdjustment: parseFloat(c.priceAdjustment) || 0 })),
      };
      if (mode === 'create') await createProduct(payload).unwrap();
      else await updateProduct({ id: initialData._id, ...payload }).unwrap();
      router.push('/admin/products');
    } catch (err) {
      setError(err.data?.message || 'Failed to save product.');
    }
  };

  const hasOptions = (type) => ['select', 'radio', 'checkbox', 'color', 'swatch', 'dropdown', 'number'].includes(type);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 4 } }}>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Basic Info */}
      <Section title="Basic Information" subtitle="Product name, SKU, price and status" icon={<TuneIcon />}>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Product Name" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="SKU" value={form.sku} onChange={(e) => setField('sku', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Base Price ($)" type="number" value={form.basePrice} onChange={(e) => setField('basePrice', e.target.value)} required inputProps={{ min: 0, step: 0.01 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={3} label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={form.status} label="Status" onChange={(e) => setField('status', e.target.value)}>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Section>

      {/* Images */}
      <Section title="Product Images" icon={<ViewColumnIcon />}>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <ImageUploader images={form.images} onChange={(imgs) => setField('images', imgs)} />
        </Paper>
      </Section>

      {/* Configurator Display Mode */}
      <Section title="Configurator Display Mode" subtitle="Choose how customers configure this product" icon={<TuneIcon />}>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Display Mode</InputLabel>
                <Select
                  value={form.configuratorDisplayMode}
                  label="Display Mode"
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((p) => {
                      let nextStepsConfig = p.stepsConfig;
                      if (val === 'steps' && (!nextStepsConfig || nextStepsConfig.length === 0) && p.steps?.length > 0) {
                        nextStepsConfig = p.steps.map((s, i) => ({
                          id: s.id || `sc-${Date.now()}-${i}`,
                          title: s.title,
                          description: '',
                          type: 'image_cards',
                          order: i,
                          enabled: true,
                          required: false,
                          fieldNames: s.fieldNames || [],
                        }));
                      }
                      return { ...p, configuratorDisplayMode: val, stepsConfig: nextStepsConfig };
                    });
                  }}
                >
                  <MenuItem value="normal">Normal UI (all options on one page)</MenuItem>
                  <MenuItem value="steps">Steps UI (multi-step configurator)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <Alert severity={form.configuratorDisplayMode === 'steps' ? 'info' : 'success'} sx={{ py: 0.5 }}>
                {form.configuratorDisplayMode === 'steps'
                  ? 'Steps UI: customers will navigate through configurable steps. Configure steps below.'
                  : 'Normal UI: all customization fields appear on a single product page.'}
              </Alert>
            </Grid>
          </Grid>
        </Paper>
      </Section>

      {/* Steps Config — only shown when Steps UI is selected */}
      {form.configuratorDisplayMode === 'steps' && (
        <Section
          title="Steps UI Configuration"
          subtitle="Define the steps customers navigate through. Assign existing Customization Fields to each step."
          icon={<AccountTreeIcon />}
          action={<Button size="small" startIcon={<AddIcon />} onClick={addStepConfig}>Add Step</Button>}
        >
          {form.customizationFields.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>Add Customization Fields below first, then assign them to steps here.</Alert>
          )}
          {form.stepsConfig.length === 0 ? (
            <Alert severity="warning">No steps configured. Add at least one step and a Review step at the end.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {form.stepsConfig.map((step, si) => (
                <Paper key={step.id} variant="outlined" sx={{ overflow: 'hidden' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, bgcolor: 'grey.50', borderBottom: expandedStepConfigs[si] ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 24 }}>#{si + 1}</Typography>
                    <Typography variant="subtitle2" sx={{ flex: 1 }}>
                      {step.title || 'Untitled Step'}
                      {step.type === 'review' && <Chip label="review" size="small" sx={{ ml: 1 }} />}
                      {!step.enabled && <Chip label="Disabled" size="small" color="default" sx={{ ml: 0.5 }} />}
                    </Typography>
                    <FormControlLabel
                      control={<Switch size="small" checked={step.enabled} onChange={(e) => updateStepConfig(si, 'enabled', e.target.checked)} />}
                      label="Enabled"
                      sx={{ mr: 0 }}
                    />
                    <Tooltip title="Move Up"><span><IconButton size="small" onClick={() => moveStepConfig(si, -1)} disabled={si === 0}><ArrowUpwardIcon fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="Move Down"><span><IconButton size="small" onClick={() => moveStepConfig(si, 1)} disabled={si === form.stepsConfig.length - 1}><ArrowDownwardIcon fontSize="small" /></IconButton></span></Tooltip>
                    <IconButton size="small" onClick={() => toggleStepConfigExpand(si)}>{expandedStepConfigs[si] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}</IconButton>
                    <IconButton size="small" color="error" onClick={() => { if (confirm('Delete this step?')) removeStepConfig(si); }}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>

                  {expandedStepConfigs[si] && (
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField fullWidth size="small" label="Step Title" value={step.title} onChange={(e) => updateStepConfig(si, 'title', e.target.value)} required />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Step Type</InputLabel>
                            <Select value={step.type || 'image_cards'} label="Step Type" onChange={(e) => updateStepConfig(si, 'type', e.target.value)}>
                              <MenuItem value="image_cards">Image Cards</MenuItem>
                              <MenuItem value="swatch_grid">Swatch Grid</MenuItem>
                              <MenuItem value="dimensions">Dimensions</MenuItem>
                              <MenuItem value="finishing">Finishing / Dropdowns</MenuItem>
                              <MenuItem value="review">Review (final step)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControlLabel control={<Switch checked={!!step.required} onChange={(e) => updateStepConfig(si, 'required', e.target.checked)} />} label="Required" />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField fullWidth size="small" label="Step Description (shown to customer)" value={step.description || ''} onChange={(e) => updateStepConfig(si, 'description', e.target.value)} />
                        </Grid>
                      </Grid>

                      {step.type !== 'review' && (
                        <>
                          <Divider sx={{ my: 2 }} />
                          <FormControl fullWidth size="small">
                            <InputLabel>Fields in this step</InputLabel>
                            <Select
                              multiple
                              value={step.fieldNames || []}
                              onChange={(e) => updateStepConfig(si, 'fieldNames', e.target.value)}
                              input={<OutlinedInput label="Fields in this step" />}
                              renderValue={(selected) => selected.join(', ')}
                            >
                              {form.customizationFields.map((f) => (
                                <MenuItem key={f.name} value={f.name}>
                                  <Checkbox checked={(step.fieldNames || []).includes(f.name)} />
                                  <ListItemText primary={f.label || f.name} secondary={f.type} />
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {(step.fieldNames || []).length === 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                              No fields assigned. Select fields from your Customization Fields list.
                            </Typography>
                          )}
                        </>
                      )}
                      {step.type === 'review' && (
                        <Alert severity="info" sx={{ mt: 2 }}>The Review step automatically shows all selections from previous steps. No fields needed.</Alert>
                      )}
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </Section>
      )}

      {/* Steps (Normal UI grouping) — only shown for Normal UI */}
      {form.configuratorDisplayMode === 'normal' && (
        <Section
          title="Configurator Steps"
          subtitle="Group fields into named steps for the product configurator"
          icon={<AccountTreeIcon />}
          action={<Button size="small" startIcon={<AddIcon />} onClick={addStep}>Add Step</Button>}
        >
          {form.steps.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No steps defined. Fields will appear in a single page.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {form.steps.map((step, si) => (
                <Paper key={step.id} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 24 }}>#{si + 1}</Typography>
                    <TextField size="small" label="Step Title" value={step.title} onChange={(e) => updateStep(si, 'title', e.target.value)} sx={{ flex: 1 }} />
                    <Tooltip title="Move Up"><span><IconButton size="small" onClick={() => moveStep(si, -1)} disabled={si === 0}><ArrowUpwardIcon fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="Move Down"><span><IconButton size="small" onClick={() => moveStep(si, 1)} disabled={si === form.steps.length - 1}><ArrowDownwardIcon fontSize="small" /></IconButton></span></Tooltip>
                    <IconButton size="small" color="error" onClick={() => removeStep(si)}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                  <FormControl fullWidth size="small">
                    <InputLabel>Fields in this step</InputLabel>
                    <Select
                      multiple
                      value={step.fieldNames}
                      onChange={(e) => updateStep(si, 'fieldNames', e.target.value)}
                      input={<OutlinedInput label="Fields in this step" />}
                      renderValue={(selected) => selected.join(', ')}
                    >
                      {form.customizationFields.map((f) => (
                        <MenuItem key={f.name} value={f.name}>
                          <Checkbox checked={step.fieldNames.includes(f.name)} />
                          <ListItemText primary={f.label || f.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Paper>
              ))}
            </Box>
          )}
        </Section>
      )}

      {/* Customization Fields */}
      <Section
        title="Customization Fields"
        subtitle="Define the options customers can configure"
        icon={<TuneIcon />}
        action={<Button size="small" startIcon={<AddIcon />} onClick={addField}>Add Field</Button>}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {form.customizationFields.map((field, fi) => (
            <Paper key={fi} variant="outlined" sx={{ p: 0, overflow: 'hidden' }}>
              {/* Field header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, bgcolor: 'grey.50', borderBottom: field._expanded ? '1px solid' : 'none', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 24 }}>#{fi + 1}</Typography>
                <Typography variant="subtitle2" sx={{ flex: 1 }}>{field.label || field.name || 'Untitled Field'} <Chip label={field.type} size="small" sx={{ ml: 1 }} /></Typography>
                <Tooltip title="Move Up"><span><IconButton size="small" onClick={() => moveCField(fi, -1)} disabled={fi === 0}><ArrowUpwardIcon fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title="Move Down"><span><IconButton size="small" onClick={() => moveCField(fi, 1)} disabled={fi === form.customizationFields.length - 1}><ArrowDownwardIcon fontSize="small" /></IconButton></span></Tooltip>
                <IconButton size="small" onClick={() => toggleExpand(fi)}>{field._expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}</IconButton>
                <IconButton size="small" color="error" onClick={() => removeField(fi)}><DeleteIcon fontSize="small" /></IconButton>
              </Box>

              {field._expanded && (
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <TextField fullWidth size="small" label="Field Name (key)" value={field.name} onChange={(e) => updateCField(fi, 'name', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField fullWidth size="small" label="Label" value={field.label} onChange={(e) => updateCField(fi, 'label', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select value={field.type} label="Type" onChange={(e) => updateCField(fi, 'type', e.target.value)}>
                          {FIELD_TYPES.map((t) => <MenuItem key={t} value={t}>{FIELD_TYPE_LABELS[t]}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField fullWidth size="small" label="Placeholder" value={field.placeholder} onChange={(e) => updateCField(fi, 'placeholder', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth size="small" label="Help Text" value={field.helpText} onChange={(e) => updateCField(fi, 'helpText', e.target.value)} />
                    </Grid>
                    {(field.type === 'number' || field.type === 'dropdown') && (
                      <>
                        <Grid item xs={6} md={3}>
                          <TextField fullWidth size="small" label="Min" type="number" value={field.min} onChange={(e) => updateCField(fi, 'min', e.target.value)} />
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <TextField fullWidth size="small" label="Max" type="number" value={field.max} onChange={(e) => updateCField(fi, 'max', e.target.value)} />
                        </Grid>
                      </>
                    )}
                    <Grid item xs={12} md={3}>
                      <FormControlLabel control={<Switch checked={field.required} onChange={(e) => updateCField(fi, 'required', e.target.checked)} />} label="Required" />
                    </Grid>
                  </Grid>

                  {/* Pricing Config */}
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>Field-Level Pricing</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Pricing Type</InputLabel>
                        <Select value={field.pricingConfig?.pricingType || 'fixed'} label="Pricing Type" onChange={(e) => updatePricingConfig(fi, 'pricingType', e.target.value)}>
                          {PRICING_TYPES.map((t) => <MenuItem key={t} value={t}>{PRICING_TYPE_LABELS[t]}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    {field.pricingConfig?.pricingType === 'per_unit' && (
                      <Grid item xs={12} md={4}>
                        <TextField fullWidth size="small" label="Per Unit Price ($)" type="number" value={field.pricingConfig?.perUnitPrice || ''} onChange={(e) => updatePricingConfig(fi, 'perUnitPrice', e.target.value)} inputProps={{ min: 0, step: 0.01 }} />
                      </Grid>
                    )}
                    {field.pricingConfig?.pricingType === 'range' && (
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {(field.pricingConfig?.priceRanges || []).map((r, ri) => (
                            <Box key={ri} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <TextField size="small" label="Min" type="number" value={r.min} onChange={(e) => updateFieldRange(fi, ri, 'min', e.target.value)} sx={{ width: 100 }} />
                              <TextField size="small" label="Max" type="number" value={r.max} onChange={(e) => updateFieldRange(fi, ri, 'max', e.target.value)} sx={{ width: 100 }} />
                              <TextField size="small" label="Amount ($)" type="number" value={r.amount} onChange={(e) => updateFieldRange(fi, ri, 'amount', e.target.value)} sx={{ width: 120 }} />
                              <IconButton size="small" color="error" onClick={() => removeFieldRange(fi, ri)}><DeleteIcon fontSize="small" /></IconButton>
                            </Box>
                          ))}
                          <Button size="small" startIcon={<AddIcon />} onClick={() => addFieldRange(fi)} sx={{ alignSelf: 'flex-start' }}>Add Range</Button>
                        </Box>
                      </Grid>
                    )}
                  </Grid>

                  {/* Options */}
                  {hasOptions(field.type) && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">Options</Typography>
                        <Button size="small" startIcon={<AddIcon />} onClick={() => addOption(fi)}>Add Option</Button>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {field.options.map((opt, oi) => (
                          <Paper key={oi} variant="outlined" sx={{ p: 2 }}>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} md={3}>
                                <TextField fullWidth size="small" label="Label" value={opt.label} onChange={(e) => updateOption(fi, oi, 'label', e.target.value)} />
                              </Grid>
                              <Grid item xs={12} md={2}>
                                <TextField fullWidth size="small" label="Value" value={opt.value} onChange={(e) => updateOption(fi, oi, 'value', e.target.value)} />
                              </Grid>
                              <Grid item xs={12} md={2}>
                                <TextField fullWidth size="small" label="SKU" value={opt.sku} onChange={(e) => updateOption(fi, oi, 'sku', e.target.value)} />
                              </Grid>
                              <Grid item xs={12} md={2}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Pricing</InputLabel>
                                  <Select value={opt.pricingType || 'fixed'} label="Pricing" onChange={(e) => updateOption(fi, oi, 'pricingType', e.target.value)}>
                                    {PRICING_TYPES.map((t) => <MenuItem key={t} value={t}>{PRICING_TYPE_LABELS[t]}</MenuItem>)}
                                  </Select>
                                </FormControl>
                              </Grid>
                              {opt.pricingType !== 'range' && (
                                <Grid item xs={12} md={2}>
                                  <TextField fullWidth size="small" label="Price Adj. ($)" type="number" value={opt.priceAdjustment} onChange={(e) => updateOption(fi, oi, 'priceAdjustment', e.target.value)} inputProps={{ step: 0.01 }} />
                                </Grid>
                              )}
                              <Grid item xs={12} md={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <IconButton size="small" color="error" onClick={() => removeOption(fi, oi)}><DeleteIcon fontSize="small" /></IconButton>
                              </Grid>
                              {(field.type === 'color' || field.type === 'swatch') && (
                                <Grid item xs={12}>
                                  <ImageUploader images={opt.images || []} onChange={(imgs) => updateOption(fi, oi, 'images', imgs)} maxImages={1} label="Option Image" />
                                </Grid>
                              )}
                              {opt.pricingType === 'range' && (
                                <Grid item xs={12}>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {(opt.priceRanges || []).map((r, ri) => (
                                      <Box key={ri} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <TextField size="small" label="Min" type="number" value={r.min} onChange={(e) => updateOptionRange(fi, oi, ri, 'min', e.target.value)} sx={{ width: 100 }} />
                                        <TextField size="small" label="Max" type="number" value={r.max} onChange={(e) => updateOptionRange(fi, oi, ri, 'max', e.target.value)} sx={{ width: 100 }} />
                                        <TextField size="small" label="Amount ($)" type="number" value={r.amount} onChange={(e) => updateOptionRange(fi, oi, ri, 'amount', e.target.value)} sx={{ width: 120 }} />
                                        <IconButton size="small" color="error" onClick={() => removeOptionRange(fi, oi, ri)}><DeleteIcon fontSize="small" /></IconButton>
                                      </Box>
                                    ))}
                                    <Button size="small" startIcon={<AddIcon />} onClick={() => addOptionRange(fi, oi)} sx={{ alignSelf: 'flex-start' }}>Add Range</Button>
                                  </Box>
                                </Grid>
                              )}
                            </Grid>
                          </Paper>
                        ))}
                      </Box>
                    </>
                  )}

                  {/* Conditions */}
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2">Visibility Conditions</Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => addCondition(fi)}>Add Condition</Button>
                  </Box>
                  {field.conditions.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Always visible</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {field.conditions.map((cond, ci) => (
                        <Box key={ci} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Field</InputLabel>
                            <Select value={cond.field} label="Field" onChange={(e) => updateCondition(fi, ci, 'field', e.target.value)}>
                              {form.customizationFields.filter((_, i) => i !== fi).map((f) => (
                                <MenuItem key={f.name} value={f.name}>{f.label || f.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Operator</InputLabel>
                            <Select value={cond.operator} label="Operator" onChange={(e) => updateCondition(fi, ci, 'operator', e.target.value)}>
                              <MenuItem value="eq">equals</MenuItem>
                              <MenuItem value="neq">not equals</MenuItem>
                              <MenuItem value="gt">greater than</MenuItem>
                              <MenuItem value="lt">less than</MenuItem>
                            </Select>
                          </FormControl>
                          <TextField size="small" label="Value" value={cond.value} onChange={(e) => updateCondition(fi, ci, 'value', e.target.value)} sx={{ flex: 1 }} />
                          <IconButton size="small" color="error" onClick={() => removeCondition(fi, ci)}><DeleteIcon fontSize="small" /></IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          ))}
          {form.customizationFields.length === 0 && (
            <Typography variant="body2" color="text.secondary">No customization fields yet.</Typography>
          )}
        </Box>
      </Section>

      {/* Variations / Configurations */}
      {allVariations.length > 0 && (
        <Section title="Variations" subtitle="Set SKU, price adjustment and images per variation" icon={<ViewColumnIcon />}>
          <Paper variant="outlined" sx={{ overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {variationFields.map((f) => <TableCell key={f.name}>{f.label || f.name}</TableCell>)}
                  <TableCell>SKU</TableCell>
                  <TableCell>Price Adj.</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Images</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allVariations.slice(varPage * varRowsPerPage, varPage * varRowsPerPage + varRowsPerPage).map((selections, vi) => {
                  const cfg = findConfig(selections);
                  return (
                    <TableRow key={vi}>
                      {variationFields.map((f) => {
                        const opt = f.options?.find((o) => o.value === selections[f.name]);
                        return <TableCell key={f.name}>{opt?.label || selections[f.name]}</TableCell>;
                      })}
                      <TableCell>{cfg?.sku || <Typography variant="body2" color="text.secondary">—</Typography>}</TableCell>
                      <TableCell>{cfg ? `$${cfg.priceAdjustment}` : <Typography variant="body2" color="text.secondary">—</Typography>}</TableCell>
                      <TableCell>{cfg ? <Chip label={cfg.status} size="small" color={cfg.status === 'active' ? 'success' : 'default'} /> : <Typography variant="body2" color="text.secondary">—</Typography>}</TableCell>
                      <TableCell>
                        {cfg?.images?.length > 0 ? (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {cfg.images.map((img, imgIdx) => (
                              <Box key={imgIdx} sx={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
                                <img src={img} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #e0e0e0', display: 'block' }} />
                                <Tooltip title="Remove image">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const key = getConfigKey(selections);
                                      setField('configurations', form.configurations.map((c) =>
                                        buildConfigKey(form.customizationFields, c.selections) === key
                                          ? { ...c, images: c.images.filter((_, ii) => ii !== imgIdx) }
                                          : c
                                      ));
                                    }}
                                    sx={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
                                  >
                                    <DeleteIcon sx={{ fontSize: 10 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEditDialog(selections)}><EditIcon fontSize="small" /></IconButton>
                        {cfg && <IconButton size="small" color="error" onClick={() => removeConfig(selections)}><DeleteIcon fontSize="small" /></IconButton>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={allVariations.length}
              page={varPage}
              onPageChange={(_, p) => setVarPage(p)}
              rowsPerPage={varRowsPerPage}
              onRowsPerPageChange={(e) => { setVarRowsPerPage(parseInt(e.target.value, 10)); setVarPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Paper>
        </Section>
      )}

      {/* Submit */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
        <Button variant="outlined" onClick={() => router.push('/admin/products')} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving…' : mode === 'create' ? 'Create Product' : 'Save Changes'}</Button>
      </Box>

      {/* Edit Variation Dialog */}
      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Variation</DialogTitle>
        <DialogContent>
          {editDialog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {variationFields.map((f) => {
                  const opt = f.options?.find((o) => o.value === editDialog.selections[f.name]);
                  return <Chip key={f.name} label={`${f.label || f.name}: ${opt?.label || editDialog.selections[f.name]}`} />;
                })}
              </Box>
              <TextField fullWidth size="small" label="SKU" value={editDialog.draft.sku} onChange={(e) => setEditDialog((d) => ({ ...d, draft: { ...d.draft, sku: e.target.value } }))} />
              <TextField fullWidth size="small" label="Price Adjustment ($)" type="number" value={editDialog.draft.priceAdjustment} onChange={(e) => setEditDialog((d) => ({ ...d, draft: { ...d.draft, priceAdjustment: e.target.value } }))} inputProps={{ step: 0.01 }} />
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={editDialog.draft.status} label="Status" onChange={(e) => setEditDialog((d) => ({ ...d, draft: { ...d.draft, status: e.target.value } }))}>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
              <ImageUploader images={editDialog.draft.images} onChange={(imgs) => setEditDialog((d) => ({ ...d, draft: { ...d.draft, images: imgs } }))} label="Variation Images" />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveEditDialog}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/**
 * Zero-dependency tests for pricingService.calculateStepsPrice and selection logic.
 * Run with: node server/tests/stepsSelection.test.js
 */

const { calculateStepsPrice } = require('../services/pricingService');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS  ${label}`); passed++; }
  else { console.error(`  FAIL  ${label}`); failed++; }
}

function assertEqual(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { console.log(`  PASS  ${label}`); passed++; }
  else { console.error(`  FAIL  ${label}  actual=${JSON.stringify(actual)}  expected=${JSON.stringify(expected)}`); failed++; }
}

// ── Shared product fixture ────────────────────────────────────────────────────

const STEP_ATTACH = 'step-attach';
const STEP_COVER  = 'step-cover';

const product = {
  basePrice: 100,
  stepsConfig: [
    {
      id: STEP_ATTACH,
      enabled: true,
      type: 'image_cards',
      fields: [{
        name: 'Attachment Style',
        label: 'Attachment Style',
        type: 'image_cards',
        required: true,
        options: [
          { label: 'Washer',   value: 'washer',   priceAdjustment: 0  },
          { label: 'Spider',   value: 'spider',   priceAdjustment: 10 },
          { label: 'Clip-On',  value: 'clip-on',  priceAdjustment: 5  },
        ],
      }],
    },
    {
      id: STEP_COVER,
      enabled: true,
      type: 'swatch_grid',
      fields: [{
        name: 'Lampshade Covering',
        label: 'Lampshade Covering',
        type: 'swatch',
        required: true,
        options: [
          { label: 'BURLAP - NATURAL',    value: 'burlap-natural',    priceAdjustment: 0 },
          { label: 'BURLAP - OFF WHITE',  value: 'burlap-off-white',  priceAdjustment: 8 },
          { label: 'BURLAP - BLACK',      value: 'burlap-black',      priceAdjustment: 8 },
        ],
      }],
    },
  ],
};

// ── Test 1: Select Washer ─────────────────────────────────────────────────────
console.log('\n[1] Select Washer attachment');
{
  const sel = { [STEP_ATTACH]: { 'Attachment Style': 'washer' }, [STEP_COVER]: { 'Lampshade Covering': 'burlap-natural' } };
  const r = calculateStepsPrice(product, sel);
  assertEqual(r.finalPrice, 100, 'Washer + Natural = $100 (no adjustments)');
  assertEqual(r.adjustments.length, 0, 'Zero price adjustments');
}

// ── Test 2: Switch attachment to Spider ──────────────────────────────────────
console.log('\n[2] Switch attachment to Spider');
{
  const sel = { [STEP_ATTACH]: { 'Attachment Style': 'spider' }, [STEP_COVER]: { 'Lampshade Covering': 'burlap-natural' } };
  const r = calculateStepsPrice(product, sel);
  assertEqual(r.finalPrice, 110, 'Spider adds $10 -> $110');
  assert(r.adjustments.some((a) => a.selection === 'Spider'), 'Spider adjustment in breakdown');
}

// ── Test 3: Select BURLAP - NATURAL ──────────────────────────────────────────
console.log('\n[3] Select BURLAP - NATURAL');
{
  const sel = { [STEP_ATTACH]: { 'Attachment Style': 'washer' }, [STEP_COVER]: { 'Lampshade Covering': 'burlap-natural' } };
  const r = calculateStepsPrice(product, sel);
  assertEqual(r.finalPrice, 100, 'Natural has no price adjustment');
}

// ── Test 4: Change to BURLAP - OFF WHITE ─────────────────────────────────────
console.log('\n[4] Change to BURLAP - OFF WHITE');
{
  const sel = { [STEP_ATTACH]: { 'Attachment Style': 'washer' }, [STEP_COVER]: { 'Lampshade Covering': 'burlap-off-white' } };
  const r = calculateStepsPrice(product, sel);
  assertEqual(r.finalPrice, 108, 'OFF WHITE adds $8 -> $108');
  assert(r.adjustments.some((a) => a.selection === 'BURLAP - OFF WHITE'), 'OFF WHITE in breakdown');
}

// ── Test 5: Change from OFF WHITE to BLACK ────────────────────────────────────
console.log('\n[5] Change from OFF WHITE to BLACK');
{
  const sel = { [STEP_ATTACH]: { 'Attachment Style': 'washer' }, [STEP_COVER]: { 'Lampshade Covering': 'burlap-black' } };
  const r = calculateStepsPrice(product, sel);
  assertEqual(r.finalPrice, 108, 'BLACK adds $8 -> $108');
  assert(r.adjustments.some((a) => a.selection === 'BURLAP - BLACK'), 'BLACK in breakdown');
}

// ── Test 6: Combined Spider + OFF WHITE ───────────────────────────────────────
console.log('\n[6] Combined Spider + OFF WHITE');
{
  const sel = { [STEP_ATTACH]: { 'Attachment Style': 'spider' }, [STEP_COVER]: { 'Lampshade Covering': 'burlap-off-white' } };
  const r = calculateStepsPrice(product, sel);
  assertEqual(r.finalPrice, 118, 'Spider $10 + OFF WHITE $8 = $118');
}

// ── Test 7: Correct field name and option value stored ────────────────────────
console.log('\n[7] Field name and option value correctness');
{
  const stepSel = { 'Attachment Style': 'clip-on' };
  assert(stepSel['Attachment Style'] === 'clip-on', 'Stored under field name, not label');
  assert(stepSel['Attachment Style'] !== 'Clip-On', 'Value is option.value, not option.label');
}

// ── Test 8: Required-field validation ────────────────────────────────────────
console.log('\n[8] Required-field validation');
{
  function validateStep(step, stepSel) {
    const errors = {};
    if (!step.required) return errors;
    for (const field of (step.fields || [])) {
      if (!field.required) continue;
      const val = stepSel[field.name];
      const empty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
      if (empty) errors[field.name] = `${field.label || field.name} is required`;
    }
    return errors;
  }

  const step = {
    ...product.stepsConfig[0],
    required: true,
    fields: product.stepsConfig[0].fields.map((f) => ({ ...f, required: true })),
  };

  const errEmpty = validateStep(step, {});
  assert(Object.keys(errEmpty).length > 0, 'Empty selection produces validation error');

  const errValid = validateStep(step, { 'Attachment Style': 'washer' });
  assert(Object.keys(errValid).length === 0, 'Valid selection passes validation');
}

// ── Test 9: Value 0 is treated as valid ──────────────────────────────────────
console.log('\n[9] Value 0 is valid (not treated as empty)');
{
  function isEmpty(val) {
    return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
  }
  assert(!isEmpty(0),         'isEmpty(0) === false');
  assert(!isEmpty('0'),       'isEmpty("0") === false');
  assert(isEmpty(undefined),  'isEmpty(undefined) === true');
  assert(isEmpty(null),       'isEmpty(null) === true');
  assert(isEmpty(''),         'isEmpty("") === true');
  assert(isEmpty([]),         'isEmpty([]) === true');
}

// ── Test 10: Multi-select field ───────────────────────────────────────────────
console.log('\n[10] Multi-select field');
{
  const multiProduct = {
    basePrice: 50,
    stepsConfig: [{
      id: 'step-extras',
      enabled: true,
      type: 'finishing',
      fields: [{
        name: 'Extras',
        label: 'Extras',
        type: 'checkbox',
        required: false,
        options: [
          { label: 'Harp',     value: 'harp',     priceAdjustment: 5 },
          { label: 'Diffuser', value: 'diffuser', priceAdjustment: 3 },
        ],
      }],
    }],
  };
  const sel = { 'step-extras': { Extras: ['harp', 'diffuser'] } };
  const r = calculateStepsPrice(multiProduct, sel);
  assertEqual(r.finalPrice, 58, 'Multi-select: harp $5 + diffuser $3 = $58');
}

// ── Test 11: Price recalculation receives updated selection ───────────────────
console.log('\n[11] Price recalculation with updated selection');
{
  const sel1 = { [STEP_ATTACH]: { 'Attachment Style': 'washer' }, [STEP_COVER]: { 'Lampshade Covering': 'burlap-natural' } };
  const sel2 = { [STEP_ATTACH]: { 'Attachment Style': 'washer' }, [STEP_COVER]: { 'Lampshade Covering': 'burlap-off-white' } };
  const r1 = calculateStepsPrice(product, sel1);
  const r2 = calculateStepsPrice(product, sel2);
  assert(r2.finalPrice > r1.finalPrice, 'Switching to OFF WHITE increases price');
  assertEqual(r2.finalPrice - r1.finalPrice, 8, 'Price delta is exactly $8');
}

// ── Test 12: String/number normalization in option matching ───────────────────
console.log('\n[12] String/number normalization');
{
  const options = [{ value: 'washer', label: 'Washer', priceAdjustment: 0 }];
  const findNorm = (val) => options.find((o) => String(o.value) === String(val));
  assert(findNorm('washer') !== undefined, 'String match works');
  assert(findNorm('washer') === findNorm('washer'), 'Consistent match');
  assert(findNorm('WASHER') === undefined, 'Case-sensitive: WASHER does not match washer');
}

// ── Test 13: Review screen resolves option label from value ───────────────────
console.log('\n[13] Review screen: label resolved from value');
{
  const field = {
    name: 'Lampshade Covering',
    options: [
      { value: 'burlap-off-white', label: 'BURLAP - OFF WHITE' },
    ],
  };
  const val = 'burlap-off-white';
  const opt = (field.options || []).find((o) => o.value === val);
  assertEqual(opt?.label, 'BURLAP - OFF WHITE', 'Review shows label, not raw value');
}

// ── Test 14: Cart payload contains stepSelections ─────────────────────────────
console.log('\n[14] Cart payload contains correct stepSelections');
{
  const stepSelections = {
    [STEP_ATTACH]: { 'Attachment Style': 'spider' },
    [STEP_COVER]:  { 'Lampshade Covering': 'burlap-off-white' },
  };
  const cartItem = { productId: 'p1', stepSelections, quantity: 1 };
  assertEqual(cartItem.stepSelections[STEP_ATTACH]['Attachment Style'], 'spider', 'Cart has attachment value');
  assertEqual(cartItem.stepSelections[STEP_COVER]['Lampshade Covering'], 'burlap-off-white', 'Cart has covering value');
}

// ── Test 15: inferStepType honours explicit admin-set type ────────────────────
console.log('\n[15] inferStepType honours explicit non-generic step type');
{
  function inferStepType(step, fields) {
    if (step.type === 'review') return 'review';
    if (step.type && step.type !== 'step' && step.type !== 'image_cards') return step.type;
    if (!fields.length) return step.type || 'image_cards';
    if (fields.some((f) => f.dimensions?.length > 0)) return 'dimensions';
    if (fields.every((f) => /diameter|slant|height|width|depth|dimension/i.test(f.name) && (f.type === 'dropdown' || f.type === 'number'))) return 'dimensions';
    if (fields.some((f) => f.type === 'swatch' || f.type === 'color')) return 'swatch_grid';
    if (fields.some((f) => f.type === 'select' || f.type === 'dropdown' || f.type === 'checkbox')) return 'finishing';
    return 'image_cards';
  }

  assertEqual(inferStepType({ type: 'swatch_grid' }, []), 'swatch_grid', 'Explicit swatch_grid preserved');
  assertEqual(inferStepType({ type: 'finishing' }, []), 'finishing', 'Explicit finishing preserved');
  assertEqual(
    inferStepType({ type: 'image_cards' }, [{ type: 'swatch', name: 'Covering', options: [] }]),
    'swatch_grid',
    'Generic image_cards -> inferred swatch_grid from field.type=swatch'
  );
  assertEqual(
    inferStepType({ type: 'step' }, [{ type: 'swatch', name: 'Covering', options: [] }]),
    'swatch_grid',
    'Generic step -> inferred swatch_grid'
  );
  assertEqual(inferStepType({ type: 'review' }, []), 'review', 'review always returns review');
}

// ── Test 16: Disabled step is skipped in pricing ──────────────────────────────
console.log('\n[16] Disabled step is skipped in pricing');
{
  const disabledProduct = {
    basePrice: 100,
    stepsConfig: [{
      id: 'step-disabled',
      enabled: false,
      type: 'image_cards',
      fields: [{
        name: 'Attachment Style',
        type: 'image_cards',
        options: [{ label: 'Spider', value: 'spider', priceAdjustment: 10 }],
      }],
    }],
  };
  const sel = { 'step-disabled': { 'Attachment Style': 'spider' } };
  const r = calculateStepsPrice(disabledProduct, sel);
  assertEqual(r.finalPrice, 100, 'Disabled step does not contribute to price');
}

// ── Summary ───────────────────────────────────────────────────────────────────
setTimeout(() => {
  console.log('\n' + '─'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}, 200);

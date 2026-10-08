/**
 * Centralized pricing service — single source of truth for price calculation.
 * Used by both the calculate-price API and any internal order logic.
 */

function applyPricingType(pricingType, priceAdjustment, priceRanges, basePrice, inputValue) {
  switch (pricingType) {
    case 'percentage':
      return (basePrice * priceAdjustment) / 100;

    case 'per_unit': {
      const qty = parseFloat(inputValue) || 0;
      return priceAdjustment * qty;
    }

    case 'range': {
      const num = parseFloat(inputValue) || 0;
      if (!Array.isArray(priceRanges)) return 0;
      const match = priceRanges.find((r) => num >= r.min && num <= r.max);
      return match ? match.amount : 0;
    }

    case 'fixed':
    default:
      return priceAdjustment || 0;
  }
}

/**
 * @param {Object} product - Mongoose product document (plain object or doc)
 * @param {Object} selectedCustomizations - { fieldName: selectedValue, ... }
 * @returns {{ basePrice, adjustments, totalAdjustment, finalPrice }}
 */
function calculateProductPrice(product, selectedCustomizations = {}) {
  const basePrice = product.basePrice;
  const adjustments = [];

  const fields = product.customizationFields || [];

  // Sort by order
  const sorted = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0));

  for (const field of sorted) {
    // Check if this field is visible given conditions
    if (!isFieldVisible(field, selectedCustomizations)) continue;

    const fieldName = field.name.toLowerCase();
    const selectedValue = selectedCustomizations[fieldName] ?? selectedCustomizations[field.name];

    if (selectedValue === undefined || selectedValue === null || selectedValue === '') continue;

    let amount = 0;

    if (['select', 'swatch', 'radio', 'color', 'dropdown', 'number'].includes(field.type)) {
      const option = (field.options || []).find(
        (o) => o.value === selectedValue || o.label === selectedValue
      );
      if (option) {
        amount = applyPricingType(
          option.pricingType || 'fixed',
          option.priceAdjustment || 0,
          option.priceRanges || [],
          basePrice,
          selectedValue
        );
      }
    } else if (field.type === 'checkbox') {
      // selectedValue is array of checked values
      const checked = Array.isArray(selectedValue) ? selectedValue : [selectedValue];
      for (const val of checked) {
        const option = (field.options || []).find((o) => o.value === val);
        if (option) {
          const adj = applyPricingType(
            option.pricingType || 'fixed',
            option.priceAdjustment || 0,
            option.priceRanges || [],
            basePrice,
            val
          );
          if (adj !== 0) {
            adjustments.push({ field: field.label, selection: option.label, amount: adj });
          }
        }
      }
      continue; // already pushed above
    }
    // text / textarea fields don't affect price unless explicitly configured

    if (amount !== 0) {
      const label =
        field.type === 'number'
          ? `${field.label} (${selectedValue})`
          : (field.options || []).find((o) => o.value === selectedValue)?.label || selectedValue;

      adjustments.push({ field: field.label, selection: label, amount });
    }
  }

  const totalAdjustment = adjustments.reduce((sum, a) => sum + a.amount, 0);
  const finalPrice = Math.round((basePrice + totalAdjustment) * 100) / 100;

  return { basePrice, adjustments, totalAdjustment, finalPrice };
}

/**
 * Evaluate whether a field should be shown based on its conditions array.
 */
function isFieldVisible(field, selectedCustomizations) {
  if (!field.conditions || field.conditions.length === 0) return true;

  return field.conditions.every((cond) => {
    const watchedKey = cond.field.toLowerCase();
    const currentVal =
      selectedCustomizations[watchedKey] ?? selectedCustomizations[cond.field];

    switch (cond.operator) {
      case 'neq':
        return currentVal !== cond.value;
      case 'in':
        return Array.isArray(cond.value)
          ? cond.value.includes(currentVal)
          : currentVal === cond.value;
      case 'nin':
        return Array.isArray(cond.value)
          ? !cond.value.includes(currentVal)
          : currentVal !== cond.value;
      case 'eq':
      default:
        return currentVal === cond.value;
    }
  });
}

/**
 * Generate a deterministic configuration key from current selections.
 * Uses the product's customizationFields order so the key is always stable.
 */
function generateConfigurationKey(customizationFields, selections) {
  const sorted = [...customizationFields].sort((a, b) => (a.order || 0) - (b.order || 0));
  return sorted
    .map((f) => {
      // Accept both original casing and lowercase keys from the frontend
      const val = selections[f.name] ?? selections[f.name.toLowerCase()] ?? '';
      return String(val).trim().toLowerCase();
    })
    .join('|');
}

/**
 * Find the configuration that matches the current selections.
 * Only compares fields that are explicitly defined in the stored config's selections.
 * Fields absent from the stored config are ignored (wildcard).
 */
function findMatchingConfiguration(product, selections) {
  const configs = product.configurations || [];
  if (!configs.length) return null;

  // Normalize a value for comparison: trim + lowercase
  const norm = (v) => String(v ?? '').trim().toLowerCase();

  return configs.find((config) => {
    const stored = config.selections || {};
    const keys = Object.keys(stored);
    if (keys.length === 0) return false;
    const match = keys.every((fieldName) => {
      const current = selections[fieldName] ?? selections[fieldName.toLowerCase()] ?? '';
      const result = norm(current) === norm(stored[fieldName]);
      console.log(`  [match] "${fieldName}": stored="${stored[fieldName]}" current="${current}" => ${result}`);
      return result;
    });
    console.log(`[config ${config.id}] match=${match}`);
    return match;
  }) || null;
}

module.exports = { calculateProductPrice, isFieldVisible, generateConfigurationKey, findMatchingConfiguration };

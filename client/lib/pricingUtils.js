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

// Rewrites image URLs to always be loadable in the current environment.
// Images may be stored as http://localhost:5000/... (old/dev) or https://cloudways-host/... (production).
// In development: convert localhost:5000 URLs to relative /uploads/... so the Next.js rewrite proxy serves them.
// In production: rewrite localhost URLs to NEXT_PUBLIC_BACKEND_URL; Cloudways URLs pass through unchanged.
const BACKEND_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BACKEND_URL || '')
    : '';

export function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('/')) return url;

  // Always convert localhost/127.0.0.1 URLs to relative paths — works in both dev and prod
  // because Next.js rewrites /uploads/* → backend in dev, and in prod the server never
  // generates localhost URLs (SERVER_URL is set to the real host).
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(url)) {
    const match = url.match(/\/uploads\/(.+)$/);
    if (match) return `/uploads/${match[1]}`;
  }

  return url;
}

export function resolveImageUrls(urls) {
  if (!Array.isArray(urls)) return urls;
  return urls.map(resolveImageUrl);
}

export function isFieldVisible(field, selectedCustomizations) {
  if (!field.conditions || field.conditions.length === 0) return true;
  return field.conditions.every((cond) => {
    const key = cond.field.toLowerCase();
    const val = selectedCustomizations[key] ?? selectedCustomizations[cond.field];
    switch (cond.operator) {
      case 'neq': return val !== cond.value;
      case 'in': return Array.isArray(cond.value) ? cond.value.includes(val) : val === cond.value;
      case 'nin': return Array.isArray(cond.value) ? !cond.value.includes(val) : val !== cond.value;
      case 'eq':
      default: return val === cond.value;
    }
  });
}

export function calculateProductPrice(product, selectedCustomizations = {}) {
  const basePrice = product.basePrice;
  const adjustments = [];
  const fields = [...(product.customizationFields || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

  for (const field of fields) {
    if (!isFieldVisible(field, selectedCustomizations)) continue;

    const key = field.name.toLowerCase();
    const selectedValue = selectedCustomizations[key] ?? selectedCustomizations[field.name];
    if (selectedValue === undefined || selectedValue === null || selectedValue === '') continue;

    let amount = 0;

    if (['select', 'swatch', 'radio', 'color', 'dropdown', 'number'].includes(field.type)) {
      const option = (field.options || []).find((o) => o.value === selectedValue);
      if (option) {
        amount = applyPricingType(option.pricingType || 'fixed', option.priceAdjustment || 0, option.priceRanges || [], basePrice, selectedValue);
      }
    } else if (field.type === 'checkbox') {
      const checked = Array.isArray(selectedValue) ? selectedValue : [selectedValue];
      for (const val of checked) {
        const option = (field.options || []).find((o) => o.value === val);
        if (option) {
          const adj = applyPricingType(option.pricingType || 'fixed', option.priceAdjustment || 0, option.priceRanges || [], basePrice, val);
          if (adj !== 0) adjustments.push({ field: field.label, selection: option.label, amount: adj });
        }
      }
      continue;
    }

    if (amount !== 0) {
      const selLabel = (field.options || []).find((o) => o.value === selectedValue)?.label || selectedValue;
      adjustments.push({ field: field.label, selection: field.type === 'number' ? `${selectedValue}` : selLabel, amount });
    }
  }

  const totalAdjustment = adjustments.reduce((sum, a) => sum + a.amount, 0);
  const finalPrice = Math.round((basePrice + totalAdjustment) * 100) / 100;
  return { basePrice, adjustments, totalAdjustment, finalPrice };
}

const { validationResult } = require('express-validator');
const slugify = require('slugify');
const Product = require('../models/Product');
const { calculateProductPrice, findMatchingConfiguration, generateConfigurationKey } = require('../services/pricingService');

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    return true;
  }
  return false;
};

const createProduct = async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  try {
    const { name, description, sku, basePrice, images, status, customizationFields, configurations, steps } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    const existing = await Product.findOne({ $or: [{ slug }, { sku }] });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: existing.slug === slug ? 'A product with this name already exists.' : 'SKU already in use.',
      });
    }

    const product = await Product.create({
      name, slug, description, sku, basePrice,
      images: images || [],
      status: status || 'active',
      customizationFields: customizationFields || [],
      configurations: configurations || [],
      steps: steps || [],
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const all = await Product.find(filter);
    const total = all.length;
    const paged = all.slice((page - 1) * limit, page * limit);

    res.json({ success: true, data: paged, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateProduct = async (req, res) => {
  if (handleValidationErrors(req, res)) return;
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const { name, description, sku, basePrice, images, status, customizationFields } = req.body;

    if (name && name !== product.name) {
      product.slug = slugify(name, { lower: true, strict: true });
      product.name = name;
    }
    if (description !== undefined) product.description = description;
    if (sku !== undefined) product.sku = sku;
    if (basePrice !== undefined) product.basePrice = basePrice;
    if (images !== undefined) product.images = images;
    if (status !== undefined) product.status = status;
    if (customizationFields !== undefined) product.customizationFields = customizationFields;
    if (req.body.configurations !== undefined) product.configurations = req.body.configurations;
    if (req.body.steps !== undefined) product.steps = req.body.steps;

    await product.save();
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const calculatePrice = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    if (product.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Product is not available.' });
    }

    const { customizations = {} } = req.body;
    const sortedFields = [...product.customizationFields].sort((a, b) => a.order - b.order);

    for (const field of sortedFields) {
      if (!field.required) continue;
      const isVisible = field.conditions.length === 0 || field.conditions.every((cond) => {
        const key = cond.field.toLowerCase();
        const val = customizations[key] ?? customizations[cond.field];
        return cond.operator === 'eq' ? val === cond.value : val !== cond.value;
      });
      if (!isVisible) continue;

      const key = field.name.toLowerCase();
      const val = customizations[key] ?? customizations[field.name];
      if (val === undefined || val === null || val === '') {
        return res.status(400).json({ success: false, message: `Required field "${field.label}" is missing.` });
      }
      if (['select', 'swatch', 'radio'].includes(field.type)) {
        if (!field.options.some((o) => o.value === val)) {
          return res.status(400).json({ success: false, message: `Invalid option "${val}" for field "${field.label}".` });
        }
      }
      if (field.type === 'number' || field.type === 'dropdown') {
        const num = parseFloat(val);
        if (isNaN(num)) return res.status(400).json({ success: false, message: `"${field.label}" must be a number.` });
        if (field.min !== undefined && num < field.min) return res.status(400).json({ success: false, message: `"${field.label}" must be at least ${field.min}.` });
        if (field.max !== undefined && num > field.max) return res.status(400).json({ success: false, message: `"${field.label}" must be at most ${field.max}.` });
      }
    }

    const result = calculateProductPrice(product.toObject(), customizations);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const resolveConfiguration = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const { selections = {} } = req.body;
    console.log('[resolveConfiguration] received selections:', JSON.stringify(selections));
    const productObj = product.toObject();

    // Calculate price using existing engine
    const priceResult = calculateProductPrice(productObj, selections);

    // Find matching configuration
    const config = findMatchingConfiguration(productObj, selections);
    console.log('[resolveConfiguration] matched config:', config ? config.id : 'NONE', '| images:', config?.images?.length ?? 0);

    // Configuration-level price adjustment on top
    const configAdj = config?.priceAdjustment || 0;
    const finalPrice = Math.round((priceResult.finalPrice + configAdj) * 100) / 100;

    res.json({
      success: true,
      data: {
        configurationId: config?.id || null,
        configurationKey: config?.configurationKey || generateConfigurationKey(productObj.customizationFields || [], selections),
        images: config?.images?.length ? config.images : null,
        sku: config?.sku || null,
        status: config?.status || null,
        basePrice: priceResult.basePrice,
        adjustments: priceResult.adjustments,
        customizationAdjustment: priceResult.totalAdjustment,
        configurationAdjustment: configAdj,
        finalPrice,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createProduct, getProducts, getProduct, updateProduct, deleteProduct, calculatePrice, resolveConfiguration };

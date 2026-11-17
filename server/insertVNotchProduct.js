const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

// Minimal inline schema (mirrors server/models/Product.js)
const productSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: '' },
    sku: { type: String, default: '' },
    basePrice: { type: Number, required: true },
    images: { type: [String], default: [] },
    status: { type: String, default: 'active' },
    customizationFields: { type: [mongoose.Schema.Types.Mixed], default: [] },
    configurations: { type: [mongoose.Schema.Types.Mixed], default: [] },
    steps: { type: [mongoose.Schema.Types.Mixed], default: [] },
    configuratorDisplayMode: { type: String, enum: ['normal', 'steps'], default: 'steps' },
    stepsConfig: { type: [mongoose.Schema.Types.Mixed], default: [] },
    model3dUrl: { type: String, default: '' },
    modelUsdzUrl: { type: String, default: '' },
  },
  { timestamps: true, _id: false }
);

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// ── Size options parsed from image: TopDiameter x BottomDiameter x Height (inches) ──
const sizeOptions = [
  { label: '8x12x11', value: '8x12x11', top: 8,  bottom: 12, height: 11, priceAdj: 0   },
  { label: '9x14x12', value: '9x14x12', top: 9,  bottom: 14, height: 12, priceAdj: 20  },
  { label: '10x16x13', value: '10x16x13', top: 10, bottom: 16, height: 13, priceAdj: 40  },
  { label: '12x18x15', value: '12x18x15', top: 12, bottom: 18, height: 15, priceAdj: 70  },
  { label: '14x20x16', value: '14x20x16', top: 14, bottom: 20, height: 16, priceAdj: 110 },
];

// Build size customization field
const sizeField = {
  name: 'Size',
  label: 'Size (Top × Bottom × Height)',
  type: 'dropdown',
  required: true,
  order: 0,
  options: sizeOptions.map(s => ({
    label: `${s.label} inches`,
    value: s.value,
    priceAdjustment: s.priceAdj,
    pricingType: 'fixed',
    priceRanges: [],
    images: [],
    description: `Top: ${s.top}" | Bottom: ${s.bottom}" | Height: ${s.height}"`,
    sku: `LE-V20-S75-${s.value}-WHI`,
    // Store dimensions for 3D viewer
    meta: { top: s.top, bottom: s.bottom, height: s.height },
  })),
  pricingConfig: { pricingType: 'fixed', perUnitPrice: 0, priceRanges: [] },
  conditions: [],
  placeholder: 'Choose a Size',
  helpText: 'Dimensions listed as Top Diameter × Bottom Diameter × Height (all in inches)',
  min: 0,
  max: 0,
};

// Covering / Fabric field (matching existing product style)
const coveringField = {
  name: 'Lampshade Covering',
  label: 'Lampshade Covering',
  type: 'swatch',
  required: true,
  order: 1,
  options: [
    {
      label: 'WHITE',
      value: 'White',
      priceAdjustment: 0,
      pricingType: 'fixed',
      priceRanges: [],
      images: ['/images/lampshades/coverings/off-white.png'],
      description: 'Classic crisp white fabric',
      sku: '',
    },
    {
      label: 'OFF WHITE',
      value: 'Off White',
      priceAdjustment: 5,
      pricingType: 'fixed',
      priceRanges: [],
      images: ['/images/lampshades/coverings/off-white.png'],
      description: 'Warm off-white natural tone',
      sku: '',
    },
    {
      label: 'BURLAP - NATURAL',
      value: 'BURLAP - NATURAL',
      priceAdjustment: 0,
      pricingType: 'fixed',
      priceRanges: [],
      images: ['/images/lampshades/coverings/natural.png'],
      description: 'Natural burlap woven texture',
      sku: '',
    },
    {
      label: 'BURLAP - BLACK',
      value: 'BURLAP - BLACK',
      priceAdjustment: 10,
      pricingType: 'fixed',
      priceRanges: [],
      images: ['/images/lampshades/coverings/black.png'],
      description: 'Rich black burlap finish',
      sku: '',
    },
  ],
  pricingConfig: { pricingType: 'fixed', perUnitPrice: 0, priceRanges: [] },
  conditions: [],
  placeholder: '',
  helpText: 'Select your preferred covering material and color',
  min: 0,
  max: 0,
};

// Attachment style field
const attachmentField = {
  name: 'Attachment Style',
  label: 'Attachment Style',
  type: 'swatch',
  required: false,
  order: 2,
  options: [
    {
      label: 'Washer',
      value: 'Washer',
      priceAdjustment: 0,
      pricingType: 'fixed',
      priceRanges: [],
      images: ['/images/lampshades/attachments/washer/natural-washer.png'],
      description: '',
      sku: '',
    },
    {
      label: 'Bulb Clip',
      value: 'Bulb',
      priceAdjustment: 0,
      pricingType: 'fixed',
      priceRanges: [],
      images: ['/images/lampshades/attachments/bulb/natural-bulb.png'],
      description: '',
      sku: '',
    },
  ],
  pricingConfig: { pricingType: 'fixed', perUnitPrice: 0, priceRanges: [] },
  conditions: [],
  placeholder: '',
  helpText: '',
  min: 0,
  max: 0,
};

const now = Date.now();

// Steps config (matching the existing product pattern)
const stepsConfig = [
  {
    id: `step-${now}-size`,
    title: 'Choose Your Size',
    description: 'Select the dimensions that best fit your lamp base',
    type: 'step',
    order: 0,
    enabled: true,
    required: true,
    fieldNames: ['Size'],
    fields: [sizeField],
  },
  {
    id: `step-${now}-covering`,
    title: 'Lampshade Covering',
    description: 'Select your preferred fabric material and color',
    type: 'image_cards',
    order: 1,
    enabled: true,
    required: true,
    fieldNames: ['Lampshade Covering'],
    fields: [coveringField],
  },
  {
    id: `step-${now}-attachment`,
    title: 'Attachment Style',
    description: 'Choose how the shade attaches to your lamp',
    type: 'image_cards',
    order: 2,
    enabled: true,
    required: false,
    fieldNames: ['Attachment Style'],
    fields: [attachmentField],
  },
];

const newProduct = {
  _id: randomUUID(),
  name: 'V Notch Round Bell with Gimp Braid Top and Bottom',
  slug: 'v-notch-round-bell-gimp-braid',
  description:
    'Handcrafted V Notch Round Bell lampshade featuring elegant gimp braid trim at both the top and bottom rims. Available in multiple sizes to fit any lamp base, with a soft scalloped silhouette that adds a refined traditional touch to any room.',
  sku: 'LE-V20-S75-WHI',
  basePrice: 129,
  images: [
    '/images/lampshades/coverings/off-white.png',
    '/images/lampshades/attachments/washer/natural-washer.png',
    '/images/lampshades/coverings/natural.png',
  ],
  status: 'active',
  customizationFields: [sizeField, coveringField, attachmentField],
  configurations: [],
  steps: [],
  configuratorDisplayMode: 'steps',
  stepsConfig,
  model3dUrl: '',
  modelUsdzUrl: '',
};

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', mongoose.connection.host);

  // Safety check: never remove existing product
  const existing = await Product.findOne({ slug: 'v-notch-round-bell-gimp-braid' });
  if (existing) {
    console.log('⚠️  Product already exists with this slug. Skipping insert to avoid duplicates.');
    console.log('   Existing product ID:', existing._id);
  } else {
    const created = await Product.create(newProduct);
    console.log('🎉 New product created successfully!');
    console.log('   ID:   ', created._id);
    console.log('   Name: ', created.name);
    console.log('   SKU:  ', created.sku);
    console.log('   Price:', `$${created.basePrice}`);
    console.log('   Sizes:', sizeOptions.map(s => s.label).join(', '));
  }

  // Verify existing product is still present
  const originalProduct = await Product.findOne({ sku: 'CUSTOM-ROUND' });
  if (originalProduct) {
    console.log('\n✅ Original product "Custom Round Lampshade" is still intact:');
    console.log('   ID:  ', originalProduct._id);
    console.log('   Name:', originalProduct.name);
  } else {
    console.log('\n⚠️  Could not find original product (this is unexpected)');
  }

  await mongoose.disconnect();
  console.log('\n✅ Done. Disconnected from MongoDB.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});


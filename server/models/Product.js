const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

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
  },
  {
    timestamps: true,
    _id: false,
  }
);

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);

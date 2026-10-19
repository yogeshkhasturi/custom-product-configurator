const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const projectItemSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    areaName: { type: String, required: true },
    productId: { type: String, default: '' },
    productName: { type: String, required: true },
    sku: { type: String, default: '' },
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    stepSelections: { type: mongoose.Schema.Types.Mixed, default: {} },
    summaryRows: { type: [mongoose.Schema.Types.Mixed], default: [] },
    image: { type: String, default: '' },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    creatorName: { type: String, default: 'Community Designer', trim: true },
    isPublic: { type: Boolean, default: true },
    likesCount: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'ordered'], default: 'draft' },
    items: { type: [projectItemSchema], default: [] },
    orderedAt: { type: Date },
  },
  {
    timestamps: true,
    _id: false,
  }
);

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);

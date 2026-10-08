const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const uri = 'mongodb+srv://tusharwebiators_db_user:RN1DJRSwBkFN2spB@fenchelshades.x1riprb.mongodb.net/fenchel-shades?retryWrites=true&w=majority';

const productSchema = new mongoose.Schema(
  {
    _id: { type: String },
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
  { timestamps: true, _id: false }
);

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function run() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas successfully.');

  const dataPath = path.join(__dirname, 'data', 'products.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Data file not found:', dataPath);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`Found ${products.length} products to transfer.`);

  for (const p of products) {
    const existing = await Product.findById(p._id);
    if (existing) {
      console.log(`Updating existing product in Atlas: ${p._id} (${p.name})`);
      await Product.replaceOne({ _id: p._id }, p);
    } else {
      console.log(`Inserting new product to Atlas: ${p._id} (${p.name})`);
      await Product.create(p);
    }
  }

  // Verification
  const count = await Product.countDocuments();
  console.log(`Total products in Atlas collection: ${count}`);

  const sample = await Product.findById('66442428-25f8-4646-bef7-5e9d68875496');
  if (sample) {
    console.log('Verification check PASSED!');
    console.log(`- Name: ${sample.name}`);
    console.log(`- Customization Fields: ${sample.customizationFields?.length}`);
    console.log(`- Configurations: ${sample.configurations?.length}`);
  } else {
    console.error('Verification check FAILED: sample product not found.');
  }

  await mongoose.disconnect();
  console.log('Transfer complete.');
}

run().catch((err) => {
  console.error('Transfer failed with error:', err);
  process.exit(1);
});

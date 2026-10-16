const http = require('http');
const { MongoClient } = require('mongodb');
require('dotenv').config();

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function testAll() {
  console.log('--- Starting CRUD & Isolation Verification ---');

  // Step 1: Create a test product via API
  const testPayload = {
    name: 'Migration Verification Shade',
    slug: 'migration-verification-shade',
    basePrice: 150,
    sku: 'TEST-SHADE-01',
    status: 'draft',
    description: 'Temporary item to verify local write operations'
  };

  console.log('1. POST /api/products...');
  const createRes = await request('POST', '/api/products', testPayload);
  console.log('Create status:', createRes.status);
  if (createRes.status !== 201 || !createRes.body.success) {
    throw new Error('Failed to create product via API: ' + JSON.stringify(createRes.body));
  }
  const createdId = createRes.body.data._id;
  console.log('Created product ID:', createdId);

  // Step 2: Read it back via GET
  console.log('\n2. GET /api/products/' + createdId + '...');
  const getRes = await request('GET', '/api/products/' + createdId);
  console.log('GET status:', getRes.status);
  if (getRes.status !== 200 || getRes.body.data.name !== testPayload.name) {
    throw new Error('Failed to read back created product');
  }

  // Step 3: Check local MongoDB directly has 2 documents
  const localClient = new MongoClient('mongodb://127.0.0.1:27017/fenchel-shades');
  await localClient.connect();
  const localDb = localClient.db();
  const localCountDuringTest = await localDb.collection('products').countDocuments();
  console.log('\n3. Local DB document count during test:', localCountDuringTest);
  if (localCountDuringTest !== 2) {
    throw new Error(`Expected 2 documents in local DB during test, found ${localCountDuringTest}`);
  }

  // Step 4: Check remote Atlas DB has NOT changed (must still be 1 document)
  const remoteAtlasUri = 'mongodb+srv://tusharwebiators_db_user:RN1DJRSwBkFN2spB@fenchelshades.x1riprb.mongodb.net/fenchel-shades?retryWrites=true&w=majority';
  const remoteClient = new MongoClient(remoteAtlasUri);
  await remoteClient.connect();
  const remoteDb = remoteClient.db();
  const remoteCount = await remoteDb.collection('products').countDocuments();
  console.log('4. Remote Atlas document count (Isolation check):', remoteCount);
  if (remoteCount !== 1) {
    throw new Error(`CRITICAL: Remote Atlas was modified! Count is ${remoteCount}`);
  }
  console.log('Remote Atlas isolation confirmed: UNTOUCHED (still 1 document)');

  // Step 5: Update the test product via PUT
  console.log('\n5. PUT /api/products/' + createdId + '...');
  const updateRes = await request('PUT', '/api/products/' + createdId, {
    basePrice: 175,
    description: 'Updated description for verification'
  });
  console.log('PUT status:', updateRes.status);
  if (updateRes.status !== 200 || updateRes.body.data.basePrice !== 175) {
    throw new Error('Failed to update product via API');
  }

  // Step 6: Delete the test product via DELETE
  console.log('\n6. DELETE /api/products/' + createdId + '...');
  const deleteRes = await request('DELETE', '/api/products/' + createdId);
  console.log('DELETE status:', deleteRes.status);
  if (deleteRes.status !== 200) {
    throw new Error('Failed to delete test product via API');
  }

  // Step 7: Verify final local DB count is back to 1
  const finalLocalCount = await localDb.collection('products').countDocuments();
  console.log('\n7. Final local DB count after cleanup:', finalLocalCount);
  if (finalLocalCount !== 1) {
    throw new Error(`Expected 1 document after cleanup, got ${finalLocalCount}`);
  }

  await localClient.close();
  await remoteClient.close();

  console.log('\n=== ALL CRUD & ISOLATION TESTS PASSED SUCCESSFULLY! ===');
}

testAll().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

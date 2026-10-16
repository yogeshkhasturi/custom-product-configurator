const { MongoClient } = require('mongodb');
require('dotenv').config();

async function verify() {
  const remoteUri = process.env.MONGO_URI;
  const localUri = 'mongodb://127.0.0.1:27017/fenchel-shades';

  console.log('Connecting to remote Atlas and local MongoDB for deep verification...');
  const remoteClient = new MongoClient(remoteUri);
  const localClient = new MongoClient(localUri);

  await remoteClient.connect();
  await localClient.connect();

  const remoteDb = remoteClient.db('fenchel-shades');
  const localDb = localClient.db('fenchel-shades');

  // 1. Collections check
  const remoteCols = (await remoteDb.listCollections().toArray()).map(c => c.name).sort();
  const localCols = (await localDb.listCollections().toArray()).map(c => c.name).sort();

  console.log('\n--- 1. COLLECTIONS VERIFICATION ---');
  console.log('Remote collections:', remoteCols);
  console.log('Local collections: ', localCols);
  if (JSON.stringify(remoteCols) !== JSON.stringify(localCols)) {
    throw new Error('Collections mismatch between remote and local!');
  }
  console.log('Collections match check: PASSED');

  // 2. Collections count & index check
  console.log('\n--- 2. DOCUMENT COUNTS & INDEXES ---');
  for (const colName of remoteCols) {
    const remoteCount = await remoteDb.collection(colName).countDocuments();
    const localCount = await localDb.collection(colName).countDocuments();
    console.log(`[${colName}] Remote count: ${remoteCount} | Local count: ${localCount}`);
    if (remoteCount !== localCount) {
      throw new Error(`Count mismatch in collection ${colName}: remote=${remoteCount}, local=${localCount}`);
    }

    const remoteIdx = await remoteDb.collection(colName).indexes();
    const localIdx = await localDb.collection(colName).indexes();
    console.log(`[${colName}] Remote indexes: ${remoteIdx.length} | Local indexes: ${localIdx.length}`);
    for (const rIdx of remoteIdx) {
      const match = localIdx.find(l => l.name === rIdx.name);
      if (!match) {
        throw new Error(`Index ${rIdx.name} missing in local collection ${colName}`);
      }
      console.log(`  Index [${rIdx.name}] matches: key=${JSON.stringify(rIdx.key)}`);
    }
  }

  // 3. Document-by-document deep comparison
  console.log('\n--- 3. DOCUMENT DEEP COMPARISON ---');
  for (const colName of remoteCols) {
    const remoteDocs = await remoteDb.collection(colName).find({}).sort({ _id: 1 }).toArray();
    const localDocs = await localDb.collection(colName).find({}).sort({ _id: 1 }).toArray();

    for (let i = 0; i < remoteDocs.length; i++) {
      const rDoc = remoteDocs[i];
      const lDoc = localDocs[i];

      if (rDoc._id !== lDoc._id) {
        throw new Error(`ID mismatch at index ${i}: remote=${rDoc._id}, local=${lDoc._id}`);
      }

      // Check key attributes
      console.log(`Checking doc _id: ${rDoc._id}`);
      console.log(`- Name: remote="${rDoc.name}", local="${lDoc.name}"`);
      console.log(`- Slug: remote="${rDoc.slug}", local="${lDoc.slug}"`);
      console.log(`- BasePrice: remote=${rDoc.basePrice}, local=${lDoc.basePrice}`);
      console.log(`- Configurations: remote=${rDoc.configurations?.length}, local=${lDoc.configurations?.length}`);
      console.log(`- CustomizationFields: remote=${rDoc.customizationFields?.length}, local=${lDoc.customizationFields?.length}`);
      console.log(`- Steps: remote=${rDoc.steps?.length}, local=${lDoc.steps?.length}`);
      console.log(`- Images: remote=${rDoc.images?.length}, local=${lDoc.images?.length}`);

      // Deep JSON equality comparison
      const rJson = JSON.stringify(rDoc);
      const lJson = JSON.stringify(lDoc);
      if (rJson === lJson) {
        console.log(`- Full JSON exact match: TRUE`);
      } else {
        console.warn(`- Full JSON diff detected. Inspecting properties...`);
        const rKeys = Object.keys(rDoc);
        const lKeys = Object.keys(lDoc);
        console.log('Remote keys:', rKeys);
        console.log('Local keys:', lKeys);
        for (const k of rKeys) {
          if (JSON.stringify(rDoc[k]) !== JSON.stringify(lDoc[k])) {
            console.warn(`  Field mismatch on '${k}'`);
          }
        }
        throw new Error(`Deep JSON mismatch for doc ${rDoc._id}`);
      }
    }
  }

  console.log('\n=== ALL DATABASE INTEGRITY CHECKS PASSED ===\n');

  await remoteClient.close();
  await localClient.close();
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

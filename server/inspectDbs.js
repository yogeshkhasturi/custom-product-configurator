const { MongoClient } = require('mongodb');
require('dotenv').config();

async function inspect() {
  const remoteUri = process.env.MONGO_URI;
  const localUri = 'mongodb://127.0.0.1:27017';

  console.log('--- REMOTE ATLAS INSPECTION ---');
  const remoteClient = new MongoClient(remoteUri);
  await remoteClient.connect();
  const remoteAdmin = remoteClient.db().admin();
  try {
    const remoteDbs = await remoteAdmin.listDatabases();
    console.log('Remote Atlas databases:');
    for (const d of remoteDbs.databases) {
      console.log(`- ${d.name} (${(d.sizeOnDisk / 1024).toFixed(1)} KB)`);
    }
  } catch (e) {
    console.log('Could not list all remote databases (permission limitation):', e.message);
  }
  const remoteDb = remoteClient.db();
  console.log('Connected to remote DB:', remoteDb.databaseName);

  const remoteCollections = await remoteDb.listCollections().toArray();
  console.log('Remote collections count:', remoteCollections.length);
  for (const colInfo of remoteCollections) {
    const col = remoteDb.collection(colInfo.name);
    const count = await col.countDocuments();
    const indexes = await col.indexes();
    console.log(`- Collection [${colInfo.name}]: ${count} docs, ${indexes.length} indexes`);
    for (const idx of indexes) {
      console.log(`    Index: ${idx.name} -> ${JSON.stringify(idx.key)} (unique: ${!!idx.unique})`);
    }
  }

  console.log('\n--- LOCAL MONGO INSPECTION ---');
  const localClient = new MongoClient(localUri);
  await localClient.connect();
  const adminDb = localClient.db().admin();
  const dbs = await adminDb.listDatabases();
  console.log('Local databases:');
  for (const db of dbs.databases) {
    console.log(`- ${db.name} (${(db.sizeOnDisk / 1024).toFixed(1)} KB)`);
  }
  const localDb = localClient.db(remoteDb.databaseName);
  const localCollections = await localDb.listCollections().toArray();
  console.log(`Local DB '${remoteDb.databaseName}' collections count:`, localCollections.length);
  for (const colInfo of localCollections) {
    const col = localDb.collection(colInfo.name);
    const count = await col.countDocuments();
    console.log(`- Collection [${colInfo.name}]: ${count} docs`);
  }

  await remoteClient.close();
  await localClient.close();
}

inspect().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});

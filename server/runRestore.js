const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const mongorestorePath = 'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongorestore.exe';
const backupDir = path.join(__dirname, 'backup', 'fenchel-shades');
const localUri = 'mongodb://127.0.0.1:27017/fenchel-shades';

if (!fs.existsSync(mongorestorePath)) {
  console.error('Error: mongorestore.exe not found at:', mongorestorePath);
  process.exit(1);
}

if (!fs.existsSync(backupDir)) {
  console.error('Error: backup directory not found at:', backupDir);
  process.exit(1);
}

console.log('Restoring to local MongoDB at', localUri, 'from', backupDir);

const result = spawnSync(mongorestorePath, [
  `--uri=${localUri}`,
  `--nsInclude=fenchel-shades.*`,
  backupDir
], {
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'pipe']
});

if (result.error) {
  console.error('mongorestore execution error:', result.error.message);
  process.exit(1);
}

if (result.stdout) console.log(result.stdout);
if (result.stderr) console.log(result.stderr);

if (result.status !== 0) {
  console.error('mongorestore failed with status', result.status);
  process.exit(1);
}

console.log('mongorestore finished successfully.');

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const mongodumpPath = 'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe';
const backupDir = path.join(__dirname, 'backup');

if (!process.env.MONGO_URI) {
  console.error('Error: MONGO_URI is not defined in server/.env');
  process.exit(1);
}

if (!fs.existsSync(mongodumpPath)) {
  console.error('Error: mongodump.exe not found at:', mongodumpPath);
  process.exit(1);
}

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('Starting mongodump backup from remote MongoDB Atlas...');

// Execute mongodump without logging the URI to preserve credentials
const result = spawnSync(mongodumpPath, [
  `--uri=${process.env.MONGO_URI}`,
  `--out=${backupDir}`
], {
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'pipe']
});

if (result.error) {
  console.error('mongodump execution error:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  // Mask credentials if present in stderr
  const safeStderr = (result.stderr || '').replace(/:([^:@]+)@/, ':***@');
  console.error('mongodump failed with status', result.status, ':', safeStderr);
  process.exit(1);
}

// Sanitize stdout/stderr output before logging
const safeStdout = (result.stdout || '').replace(/:([^:@]+)@/, ':***@');
const safeStderr = (result.stderr || '').replace(/:([^:@]+)@/, ':***@');

if (safeStdout) console.log(safeStdout);
if (safeStderr) console.log(safeStderr);

console.log('mongodump completed successfully.');

// Verify backup files
const dbBackupPath = path.join(backupDir, 'fenchel-shades');
if (fs.existsSync(dbBackupPath)) {
  const files = fs.readdirSync(dbBackupPath);
  console.log('Backup contents in', dbBackupPath, ':');
  for (const f of files) {
    const stats = fs.statSync(path.join(dbBackupPath, f));
    console.log(`- ${f} (${stats.size} bytes)`);
  }
} else {
  console.error('Expected database directory not found in backup!');
  process.exit(1);
}

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const srcDir = 'D:/Image to 3d library';
const destDir = path.resolve(__dirname, '../client/lib/universal-ar');

if (!fs.existsSync(srcDir)) {
  console.error(`Source directory not found: ${srcDir}`);
  process.exit(1);
}

console.log('📦 Building latest bundles in D:\\Image to 3d library...');
try {
  execSync('npm run build', { cwd: srcDir, stdio: 'inherit' });
} catch (e) {
  console.warn('Vite build warning/error in source, copying current files...');
}

console.log('🔄 Syncing files into client/lib/universal-ar...');
fs.mkdirSync(destDir, { recursive: true });

function copyRecursive(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      if (item === 'node_modules' || item === '.git') continue;
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(path.join(srcDir, 'dist'), path.join(destDir, 'dist'));
copyRecursive(path.join(srcDir, 'src'), path.join(destDir, 'src'));
fs.copyFileSync(path.join(srcDir, 'package.json'), path.join(destDir, 'package.json'));

// Ensure clean entrypoint
fs.writeFileSync(
  path.join(destDir, 'index.js'),
  `// Universal AR / Image-to-3D Library entrypoint\nexport * from './dist/image-to-3d-ar.es.js';\n`,
  'utf8'
);

console.log('✅ Universal 3D/AR Library synced successfully!');

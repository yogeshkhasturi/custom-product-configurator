const fs = require('fs');
const path = require('path');

// 1. Update server/routes/generate3dRoutes.js
const routesPath = path.resolve(__dirname, '../server/routes/generate3dRoutes.js');
if (fs.existsSync(routesPath)) {
  let content = fs.readFileSync(routesPath, 'utf8');
  const targetPattern = / - If the image shows a BULB CLIP-ON FITTER[\s\S]*?color: "#e2e6ea"\)\./;
  const replacement = ` - If the image shows a BULB CLIP-ON FITTER (wire loops to clip onto a bulb):
      * Model the symmetrical golden brass support struts, central wire saddle ring, dual vertical spring wire clip loops, and centered incandescent light bulb:
        - Left strut: shape "cylinder", size: [0.0022, 0.0022, radiusTop * 0.9], pos: [-radiusTop * 0.45, height/2 - 0.03, 0], rot: [0, 0, 1.25], material: "gold", color: "#d4af37".
        - Right strut: shape "cylinder", size: [0.0022, 0.0022, radiusTop * 0.9], pos: [radiusTop * 0.45, height/2 - 0.03, 0], rot: [0, 0, -1.25], material: "gold", color: "#d4af37".
        - Saddle ring: shape "torus", size: [0.026, 0.0022], pos: [0, height/2 - 0.045, 0], rot: [1.5708, 0, 0], material: "gold", color: "#d4af37".
        - Front clip loop: shape "torus", size: [0.032, 0.002], pos: [0, height/2 - 0.08, 0.035], rot: [0, 1.5708, 0], material: "gold", color: "#d4af37".
        - Back clip loop: shape "torus", size: [0.032, 0.002], pos: [0, height/2 - 0.08, -0.035], rot: [0, 1.5708, 0], material: "gold", color: "#d4af37".
        - Centered light bulb glass: shape "sphere", size: [0.035, 0.045, 0.035], pos: [0, height/2 - 0.085, 0], material: "glass", color: "#fffdfa".
        - Bulb screw base: shape "cylinder", size: [0.014, 0.013, 0.022], pos: [0, height/2 - 0.13, 0], material: "gold", color: "#d4af37".`;

  if (targetPattern.test(content)) {
    content = content.replace(targetPattern, replacement);
    fs.writeFileSync(routesPath, content, 'utf8');
    console.log('✅ Updated server/routes/generate3dRoutes.js');
  } else {
    console.log('ℹ️ generate3dRoutes.js pattern already updated or not found');
  }
}

// 2. Sync to D:\Image to 3d library
const externalDir = 'D:/Image to 3d library';
const clientLibDir = path.resolve(__dirname, '../client/lib/universal-ar');

if (fs.existsSync(externalDir)) {
  const filesToCopy = [
    'src/generator/TextureGenerator.js',
    'src/generator/Procedural3DGenerator.js',
    'src/generator/Structured3DBuilder.js',
    'src/generator/LLM3DGenerator.js',
  ];

  for (const rel of filesToCopy) {
    const src = path.join(clientLibDir, rel);
    const dest = path.join(externalDir, rel);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`✅ Synced ${rel} to D:\\Image to 3d library`);
    }
  }
}

console.log('All files updated and synced successfully!');

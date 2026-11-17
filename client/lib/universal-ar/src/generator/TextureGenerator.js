import * as THREE from 'three';

/**
 * Procedural PBR Canvas Texture Generator
 * Generates photorealistic, seamless procedural textures (wood, fabric, metal, marble, leather, cardboard)
 * entirely inside client-side canvas with zero external image requests.
 */
export class TextureGenerator {
  /**
   * Creates a procedural wood grain texture.
   */
  static createWoodTexture(primaryColor = '#8b5a2b', secondaryColor = '#5c3a21', resolution = 512) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, resolution, resolution);

    // Draw subtle, organic wood grain lines
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 1.0;
    ctx.globalAlpha = 0.14;

    for (let y = 0; y < resolution; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < resolution; x += 16) {
        const noise = Math.sin(x * 0.04 + y * 0.015) * 3 + Math.sin(x * 0.01) * 4;
        ctx.lineTo(x, y + noise);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Creates a photorealistic procedural woven burlap / rattan / wicker basketweave texture.
   */
  static createWovenTexture(baseColor = '#d1a877', threadColor = null, resolution = 512) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');

    const col = new THREE.Color(baseColor || '#d1a877');
    const hsl = { h: 0, s: 0, l: 0 };
    col.getHSL(hsl);
    const isDark = hsl.l < 0.28;

    // Dynamically derive the 5-tone PBR weave gradient from baseColor
    let bgHex, deepHex, shadowHex, midHex, highlightHex, ridgeColor, eyeletHex;

    if (isDark) {
      // Dark/black woven fabric or wicker (like black-bulb.png)
      bgHex = '#0a0a0c';
      deepHex = '#121316';
      shadowHex = '#1a1c20';
      midHex = '#272a30';
      highlightHex = '#4a4f5a';
      ridgeColor = '#0d0e10';
      eyeletHex = '#050506';
    } else {
      // Warm tan, wheat, rattan, or custom hue
      bgHex = col.clone().multiplyScalar(0.28).getStyle();
      deepHex = col.clone().multiplyScalar(0.42).getStyle();
      shadowHex = col.clone().multiplyScalar(0.7).getStyle();
      midHex = col.getStyle();
      highlightHex = col.clone().offsetHSL(0, -0.05, 0.22).getStyle();
      ridgeColor = col.clone().multiplyScalar(0.4).getStyle();
      eyeletHex = col.clone().multiplyScalar(0.18).getStyle();
    }

    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, resolution, resolution);

    const tileSize = 32;
    const pad = 3;

    for (let y = 0; y < resolution; y += tileSize) {
      for (let x = 0; x < resolution; x += tileSize) {
        const isHorizontal = ((x / tileSize) + (y / tileSize)) % 2 === 0;

        if (isHorizontal) {
          const grad = ctx.createLinearGradient(x, y, x, y + tileSize);
          grad.addColorStop(0, deepHex);
          grad.addColorStop(0.18, shadowHex);
          grad.addColorStop(0.45, midHex);
          grad.addColorStop(0.55, highlightHex);
          grad.addColorStop(0.82, shadowHex);
          grad.addColorStop(1.0, deepHex);

          ctx.fillStyle = grad;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x + pad, y + pad, tileSize - pad * 2, tileSize - pad * 2, 4);
          } else {
            ctx.rect(x + pad, y + pad, tileSize - pad * 2, tileSize - pad * 2);
          }
          ctx.fill();

          ctx.strokeStyle = ridgeColor;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = 1.2;
          for (let gy = y + 7; gy < y + tileSize - 4; gy += 5) {
            ctx.beginPath();
            ctx.moveTo(x + pad + 2, gy);
            ctx.lineTo(x + tileSize - pad - 2, gy);
            ctx.stroke();
          }
          ctx.globalAlpha = 1.0;
        } else {
          const grad = ctx.createLinearGradient(x, y, x + tileSize, y);
          grad.addColorStop(0, deepHex);
          grad.addColorStop(0.18, shadowHex);
          grad.addColorStop(0.45, midHex);
          grad.addColorStop(0.55, highlightHex);
          grad.addColorStop(0.82, shadowHex);
          grad.addColorStop(1.0, deepHex);

          ctx.fillStyle = grad;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x + pad, y + pad, tileSize - pad * 2, tileSize - pad * 2, 4);
          } else {
            ctx.rect(x + pad, y + pad, tileSize - pad * 2, tileSize - pad * 2);
          }
          ctx.fill();

          ctx.strokeStyle = ridgeColor;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = 1.2;
          for (let gx = x + 7; gx < x + tileSize - 4; gx += 5) {
            ctx.beginPath();
            ctx.moveTo(gx, y + pad + 2);
            ctx.lineTo(gx, y + tileSize - pad - 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1.0;
        }

        ctx.fillStyle = eyeletHex;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Creates a high-relief grayscale bump map for woven rattan.
   */
  static createWovenBumpMap(resolution = 512) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, resolution, resolution);

    const tileSize = 32;
    const pad = 3;

    for (let y = 0; y < resolution; y += tileSize) {
      for (let x = 0; x < resolution; x += tileSize) {
        const isHorizontal = ((x / tileSize) + (y / tileSize)) % 2 === 0;

        const grad = isHorizontal
          ? ctx.createLinearGradient(x, y, x, y + tileSize)
          : ctx.createLinearGradient(x, y, x + tileSize, y);

        grad.addColorStop(0, '#222222');
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(1.0, '#222222');

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x + pad, y + pad, tileSize - pad * 2, tileSize - pad * 2, 4);
        } else {
          ctx.rect(x + pad, y + pad, tileSize - pad * 2, tileSize - pad * 2);
        }
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Creates a procedural fabric/textile weave texture.
   */
  static createFabricTexture(baseColor = '#3b4252', threadColor = '#2e3440', resolution = 256) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, resolution, resolution);

    ctx.fillStyle = threadColor;
    ctx.globalAlpha = 0.45;

    for (let x = 0; x < resolution; x += 4) {
      for (let y = 0; y < resolution; y += 4) {
        if ((x + y) % 8 === 0) {
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Creates a procedural marble / organic stone texture.
   */
  static createMarbleTexture(baseColor = '#f5f5f7', veinColor = '#8e8e93', resolution = 512) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, resolution, resolution);

    ctx.strokeStyle = veinColor;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 2.5;

    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      let startX = (resolution / 6) * i;
      let startY = 0;
      ctx.moveTo(startX, startY);

      while (startY < resolution) {
        startX += (Math.random() - 0.5) * 35;
        startY += 20;
        ctx.lineTo(startX, startY);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Creates a cardboard / kraft packaging texture.
   */
  static createCardboardTexture(color = '#c8a679', resolution = 256) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, resolution, resolution);

    // Speckles
    ctx.fillStyle = '#9b7653';
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * resolution;
      const y = Math.random() * resolution;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Returns a ready-to-use Three.js PBR MeshStandardMaterial based on material name and color.
   */
  static getMaterial(type = 'default', color = '#cccccc', options = {}) {
    const normType = (type || '').toLowerCase();

    if (normType.includes('wood') || normType.includes('oak') || normType.includes('walnut') || normType.includes('pine') || normType.includes('timber')) {
      const woodColor = color !== '#cccccc' ? color : (normType.includes('walnut') ? '#4a2e18' : '#a2703f');
      const woodTex = this.createWoodTexture(woodColor);
      return new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.55,
        metalness: 0.05,
        ...options
      });
    }

    if (normType.includes('metal') || normType.includes('steel') || normType.includes('aluminum') || normType.includes('iron') || normType.includes('chrome')) {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(color !== '#cccccc' ? color : '#333333'),
        roughness: 0.25,
        metalness: 0.85,
        ...options
      });
    }

    if (normType.includes('gold') || normType.includes('brass') || normType.includes('bronze')) {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(color !== '#cccccc' ? color : '#d4af37'),
        roughness: 0.2,
        metalness: 0.9,
        ...options
      });
    }

    if (normType.includes('bulb') || normType.includes('glow')) {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(color !== '#cccccc' ? color : '#fffdfa'),
        emissive: new THREE.Color(color !== '#cccccc' ? color : '#ffe6c4'),
        emissiveIntensity: 0.42,
        roughness: 0.22,
        metalness: 0.05,
        ...options
      });
    }

    if (
      normType.includes('burlap') ||
      normType.includes('woven') ||
      normType.includes('rattan') ||
      normType.includes('wicker') ||
      normType.includes('weave') ||
      normType.includes('straw') ||
      normType.includes('jute') ||
      normType.includes('cane') ||
      normType.includes('lampshade') ||
      normType.includes('shade') ||
      (normType.includes('fabric') && (
        color.startsWith('#0') || color.startsWith('#1') || color.startsWith('#2') ||
        color.startsWith('#3') || color.includes('black') || normType.includes('woven')
      ))
    ) {
      const wovenColor = (color && color !== '#cccccc') ? color : '#d1a877';
      const wovenTex = this.createWovenTexture(wovenColor);
      const bumpTex = this.createWovenBumpMap();
      return new THREE.MeshStandardMaterial({
        map: wovenTex,
        bumpMap: bumpTex,
        bumpScale: 0.055,
        roughness: 0.78,
        metalness: 0.0,
        side: THREE.DoubleSide,
        ...options
      });
    }

    if (normType.includes('liner') || normType.includes('reflector') || normType.includes('interior')) {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(color !== '#cccccc' ? color : '#fcfbf7'),
        roughness: 0.55,
        metalness: 0.0,
        side: THREE.BackSide,
        ...options
      });
    }

    if (normType.includes('fabric') || normType.includes('cloth') || normType.includes('linen') || normType.includes('cushion') || normType.includes('velvet')) {
      const fabricColor = color !== '#cccccc' ? color : '#3a4454';
      const fabricTex = this.createFabricTexture(fabricColor);
      return new THREE.MeshStandardMaterial({
        map: fabricTex,
        roughness: 0.85,
        metalness: 0.02,
        side: THREE.DoubleSide,
        ...options
      });
    }

    if (normType.includes('marble') || normType.includes('stone') || normType.includes('granite')) {
      const marbleTex = this.createMarbleTexture(color !== '#cccccc' ? color : '#f0f0f2');
      return new THREE.MeshStandardMaterial({
        map: marbleTex,
        roughness: 0.2,
        metalness: 0.1,
        ...options
      });
    }

    if (normType.includes('glass') || normType.includes('transparent')) {
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color !== '#cccccc' ? color : '#ffffff'),
        roughness: 0.05,
        metalness: 0.0,
        transmission: 0.9,
        transparent: true,
        opacity: 0.85,
        ior: 1.5,
        ...options
      });
    }

    if (normType.includes('cardboard') || normType.includes('paper') || normType.includes('box')) {
      const cardTex = this.createCardboardTexture(color !== '#cccccc' ? color : '#c49e6f');
      return new THREE.MeshStandardMaterial({
        map: cardTex,
        roughness: 0.85,
        metalness: 0.0,
        ...options
      });
    }

    if (normType.includes('leather')) {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(color !== '#cccccc' ? color : '#3d2516'),
        roughness: 0.45,
        metalness: 0.05,
        ...options
      });
    }

    // Default clean matte/satin material
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.4,
      metalness: 0.1,
      ...options
    });
  }
}

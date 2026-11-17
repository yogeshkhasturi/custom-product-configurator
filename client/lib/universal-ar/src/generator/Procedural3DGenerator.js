import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

/**
 * Procedural 3D Model Generator
 * Creates realistic, fully textured 3D models with exact real-world dimensions
 * directly from natural language prompts using Three.js geometries and procedural PBR materials.
 */
export class Procedural3DGenerator {
  /**
   * Generates a Three.js model from prompt and dimensions.
   * @param {object} params
   * @param {string} params.prompt - Natural language description (e.g. "modern walnut coffee table with black metal legs")
   * @param {object} params.dimensions - Target physical dimensions in meters { width, height, depth }
   * @returns {THREE.Group}
   */
  generate({ prompt = 'wooden table', dimensions = { width: 1.0, height: 0.75, depth: 0.6 } }) {
    const p = prompt.toLowerCase();
    const parsed = this.parsePrompt(p);

    const group = new THREE.Group();
    group.name = 'ProceduralModel';

    // Route to appropriate procedural builder based on detected category
    if (parsed.category === 'table' || parsed.category === 'desk') {
      this.buildTable(group, parsed);
    } else if (parsed.category === 'chair' || parsed.category === 'stool') {
      this.buildChair(group, parsed);
    } else if (parsed.category === 'sofa' || parsed.category === 'couch') {
      this.buildSofa(group, parsed);
    } else if (parsed.category === 'shelf' || parsed.category === 'bookcase') {
      this.buildShelf(group, parsed);
    } else if (parsed.category === 'cabinet' || parsed.category === 'dresser' || parsed.category === 'nightstand') {
      this.buildCabinet(group, parsed);
    } else if (parsed.category === 'bed') {
      this.buildBed(group, parsed);
    } else if (parsed.category === 'bottle' || parsed.category === 'vase' || parsed.category === 'glass' || parsed.category === 'can') {
      this.buildVessel(group, parsed);
    } else if (parsed.category === 'mug' || parsed.category === 'cup') {
      this.buildMug(group, parsed);
    } else if (parsed.category === 'box' || parsed.category === 'package' || parsed.category === 'carton') {
      this.buildBox(group, parsed);
    } else if (parsed.category === 'lampshade' || parsed.category === 'shade') {
      this.buildLampshade(group, parsed);
    } else if (parsed.category === 'lamp' || parsed.category === 'light') {
      this.buildLamp(group, parsed);
    } else if (parsed.category === 'laptop' || parsed.category === 'monitor' || parsed.category === 'phone') {
      this.buildElectronics(group, parsed);
    } else if (parsed.category === 'plant' || parsed.category === 'pot') {
      this.buildPlantPot(group, parsed);
    } else if (parsed.category === 'duck') {
      this.buildDuck(group, parsed);
    } else if (parsed.category === 'penguin') {
      this.buildPenguin(group, parsed);
    } else {
      // General procedural builder for any object
      this.buildGeneralObject(group, parsed);
    }

    // Calibrate and normalize to the exact specified dimensions
    this.normalizeDimensions(group, dimensions);

    return group;
  }

  /**
   * Extracts category, materials, styles, and colors from prompt text.
   */
  parsePrompt(prompt) {
    const info = {
      raw: prompt,
      category: 'general',
      shape: 'rectangular',
      primaryMaterial: 'wood',
      secondaryMaterial: 'metal',
      primaryColor: '#8b5a2b',
      secondaryColor: '#222222',
      isRound: prompt.includes('round') || prompt.includes('circular') || prompt.includes('cylinder') || prompt.includes('curved'),
      isMinimal: prompt.includes('minimal') || prompt.includes('modern') || prompt.includes('scandinavian')
    };

    // Category detection
    const categories = [
      'table', 'desk', 'chair', 'stool', 'sofa', 'couch', 'armchair',
      'shelf', 'bookshelf', 'bookcase', 'cabinet', 'dresser', 'nightstand', 'sideboard',
      'bed', 'bottle', 'vase', 'glass', 'mug', 'cup', 'can',
      'box', 'package', 'carton', 'lampshade', 'shade', 'lamp', 'light', 'laptop', 'monitor', 'phone', 'plant', 'pot', 'duck', 'penguin'
    ];

    for (const cat of categories) {
      const regex = new RegExp(`\\b${cat}s?\\b`, 'i');
      if (regex.test(prompt)) {
        info.category = (cat === 'bookshelf' || cat === 'bookcase') ? 'shelf'
          : (cat === 'couch' || cat === 'armchair') ? 'sofa'
          : (cat === 'shade' || cat === 'lampshade') ? 'lampshade'
          : cat;
        break;
      }
    }

    // Material detection
    if (prompt.includes('walnut')) {
      info.primaryMaterial = 'wood';
      info.primaryColor = '#4a2e18';
    } else if (prompt.includes('oak') || prompt.includes('pine') || prompt.includes('timber') || prompt.includes('wooden') || prompt.includes('wood')) {
      info.primaryMaterial = 'wood';
      info.primaryColor = '#9a6b3f';
    } else if (prompt.includes('metal') || prompt.includes('steel') || prompt.includes('iron')) {
      info.primaryMaterial = 'metal';
      info.primaryColor = '#2b2b2b';
    } else if (prompt.includes('marble') || prompt.includes('stone')) {
      info.primaryMaterial = 'marble';
      info.primaryColor = '#ececee';
    } else if (prompt.includes('glass')) {
      info.primaryMaterial = 'glass';
      info.primaryColor = '#e0f2fe';
    } else if (prompt.includes('leather')) {
      info.primaryMaterial = 'leather';
      info.primaryColor = '#3a2012';
    } else if (prompt.includes('burlap') || prompt.includes('rattan') || prompt.includes('wicker') || prompt.includes('woven') || prompt.includes('straw') || prompt.includes('cane') || prompt.includes('jute')) {
      info.primaryMaterial = 'burlap';
      info.primaryColor = '#cbb084';
    } else if (prompt.includes('fabric') || prompt.includes('velvet') || prompt.includes('linen')) {
      info.primaryMaterial = 'fabric';
      info.primaryColor = '#3b4252';
    } else if (prompt.includes('gold') || prompt.includes('brass')) {
      info.primaryMaterial = 'gold';
      info.primaryColor = '#d4af37';
    }

    // Color overrides
    const colors = {
      'black': '#1a1a1a',
      'white': '#f8fafc',
      'red': '#b91c1c',
      'blue': '#1d4ed8',
      'navy': '#0f172a',
      'green': '#15803d',
      'yellow': '#eab308',
      'gray': '#64748b',
      'grey': '#64748b',
      'brown': '#78350f',
      'beige': '#d6c7b2',
      'cream': '#fef3c7',
      'orange': '#ea580c',
      'pink': '#db2777',
      'gold': '#d4af37',
      'silver': '#cbd5e1'
    };

    for (const [name, hex] of Object.entries(colors)) {
      if (prompt.includes(name)) {
        info.primaryColor = hex;
        break;
      }
    }

    return info;
  }

  /* -------------------------------------------------------------
   * PROCEDURAL BUILDERS
   * ------------------------------------------------------------- */

  /**
   * Table / Desk Builder
   */
  buildTable(group, p) {
    const topMat = TextureGenerator.getMaterial(p.primaryMaterial, p.primaryColor);
    const legMat = TextureGenerator.getMaterial(p.secondaryMaterial, p.secondaryColor);

    const isPedestal = p.raw.includes('pedestal') || p.raw.includes('ornate') || (p.isRound && (p.raw.includes('dining') || p.raw.includes('classic')));
    const goldMat = TextureGenerator.getMaterial('gold', '#d4af37');

    if (isPedestal) {
      // 1. Molded Tabletop with Gold Filigree Trim & Apron
      const topGeom = new THREE.CylinderGeometry(0.58, 0.58, 0.035, 64);
      const top = new THREE.Mesh(topGeom, topMat);
      top.position.y = 0.76;
      top.castShadow = true;
      group.add(top);

      const edgeTorus = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.014, 24, 64), topMat);
      edgeTorus.rotation.x = Math.PI / 2;
      edgeTorus.position.y = 0.76;
      group.add(edgeTorus);

      const goldTrim = new THREE.Mesh(new THREE.TorusGeometry(0.582, 0.005, 16, 64), goldMat);
      goldTrim.rotation.x = Math.PI / 2;
      goldTrim.position.y = 0.755;
      group.add(goldTrim);

      const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.52, 0.055, 48), topMat);
      apron.position.y = 0.718;
      group.add(apron);

      const apronGold = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.006, 16, 48), goldMat);
      apronGold.rotation.x = Math.PI / 2;
      apronGold.position.y = 0.69;
      group.add(apronGold);

      // 2. Turned Baluster Pedestal Column
      const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.04, 32), topMat);
      capital.position.y = 0.67;
      group.add(capital);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.10, 32), topMat);
      neck.position.y = 0.60;
      group.add(neck);

      const goldRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.008, 16, 32), goldMat);
      goldRing.rotation.x = Math.PI / 2;
      goldRing.position.y = 0.55;
      group.add(goldRing);

      const urn = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), topMat);
      urn.scale.set(0.095, 0.105, 0.095);
      urn.position.y = 0.46;
      group.add(urn);

      const urnGold = new THREE.Mesh(new THREE.TorusGeometry(0.096, 0.007, 16, 32), goldMat);
      urnGold.rotation.x = Math.PI / 2;
      urnGold.position.y = 0.46;
      group.add(urnGold);

      const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.09, 32), topMat);
      waist.position.y = 0.36;
      group.add(waist);

      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.07, 32), topMat);
      plinth.position.y = 0.28;
      group.add(plinth);

      const plinthGold = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.007, 16, 32), goldMat);
      plinthGold.rotation.x = Math.PI / 2;
      plinthGold.position.y = 0.26;
      group.add(plinthGold);

      // 3. Four Arched Cabriole Scrolled Legs
      const legAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
      legAngles.forEach((theta) => {
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        // Upper Arched Knee
        const kneeGeom = new THREE.CylinderGeometry(0.035, 0.030, 0.20, 16);
        const knee = new THREE.Mesh(kneeGeom, topMat);
        knee.position.set(0.18 * cos, 0.20, 0.18 * sin);
        knee.rotation.set(0.65 * sin, -theta, -0.65 * cos);
        knee.castShadow = true;
        group.add(knee);

        // Lower Scrolled Drop
        const dropGeom = new THREE.CylinderGeometry(0.030, 0.025, 0.14, 16);
        const drop = new THREE.Mesh(dropGeom, topMat);
        drop.position.set(0.28 * cos, 0.08, 0.28 * sin);
        drop.rotation.set(-0.30 * sin, -theta, 0.30 * cos);
        drop.castShadow = true;
        group.add(drop);

        // Scrolled Pad Foot
        const footGeom = new THREE.SphereGeometry(1, 16, 16);
        footGeom.scale(0.036, 0.022, 0.036);
        const foot = new THREE.Mesh(footGeom, topMat);
        foot.position.set(0.33 * cos, 0.015, 0.33 * sin);
        foot.castShadow = true;
        group.add(foot);

        // Gold Scroll Accent
        const scrollGeom = new THREE.TorusGeometry(0.024, 0.005, 12, 24);
        const scroll = new THREE.Mesh(scrollGeom, goldMat);
        scroll.position.set(0.22 * cos, 0.23, 0.22 * sin);
        scroll.rotation.set(0, -theta + Math.PI / 2, 0);
        group.add(scroll);
      });
    } else {
      // Standard Table (Round or Rectangular with vertical legs)
      let topMesh;
      if (p.isRound) {
        const geom = new THREE.CylinderGeometry(0.5, 0.5, 0.04, 32);
        topMesh = new THREE.Mesh(geom, topMat);
        topMesh.position.y = 0.73;
      } else {
        const geom = new THREE.BoxGeometry(1.0, 0.04, 0.6);
        topMesh = new THREE.Mesh(geom, topMat);
        topMesh.position.y = 0.73;
      }
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      group.add(topMesh);

      // Legs
      const legRadius = 0.02;
      const legHeight = 0.71;
      const legGeom = new THREE.CylinderGeometry(legRadius, legRadius * 0.8, legHeight, 16);

      const positions = p.isRound
        ? [
            [0.35, 0],
            [-0.35, 0],
            [0, 0.35],
            [0, -0.35]
          ]
        : [
            [0.44, 0.24],
            [-0.44, 0.24],
            [0.44, -0.24],
            [-0.44, -0.24]
          ];

      positions.forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeom, legMat);
        leg.position.set(x, legHeight / 2, z);
        leg.castShadow = true;
        group.add(leg);
      });
    }

    // 3. Desk drawer (if prompt specifies drawer or desk)
    if (p.raw.includes('drawer') || p.raw.includes('desk')) {
      const drawerGeom = new THREE.BoxGeometry(0.3, 0.1, 0.45);
      const drawer = new THREE.Mesh(drawerGeom, topMat);
      drawer.position.set(0.28, 0.65, 0);
      drawer.castShadow = true;
      group.add(drawer);

      // Handle
      const handleGeom = new THREE.CylinderGeometry(0.006, 0.006, 0.08, 12);
      const handle = new THREE.Mesh(handleGeom, legMat);
      handle.rotation.z = Math.PI / 2;
      handle.position.set(0.28, 0.65, 0.23);
      group.add(handle);
    }
  }

  /**
   * Chair / Stool Builder
   */
  buildChair(group, p) {
    const seatMat = TextureGenerator.getMaterial(p.primaryMaterial, p.primaryColor);
    const legMat = TextureGenerator.getMaterial(p.secondaryMaterial, p.secondaryColor);

    // 1. Seat Cushion
    const seatHeight = 0.45;
    const seatGeom = p.isRound
      ? new THREE.CylinderGeometry(0.22, 0.22, 0.05, 32)
      : new THREE.BoxGeometry(0.44, 0.05, 0.44);
    const seat = new THREE.Mesh(seatGeom, seatMat);
    seat.position.y = seatHeight;
    seat.castShadow = true;
    seat.receiveShadow = true;
    group.add(seat);

    // 2. Chair Backrest
    if (!p.raw.includes('stool')) {
      const backGeom = new THREE.BoxGeometry(0.42, 0.4, 0.03);
      const back = new THREE.Mesh(backGeom, seatMat);
      back.position.set(0, seatHeight + 0.25, -0.2);
      back.rotation.x = -0.05;
      back.castShadow = true;
      group.add(back);

      // Backrest Support Posts
      const postGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.45, 12);
      [-0.15, 0.15].forEach((x) => {
        const post = new THREE.Mesh(postGeom, legMat);
        post.position.set(x, seatHeight + 0.15, -0.2);
        group.add(post);
      });
    }

    // 3. Legs
    const legGeom = new THREE.CylinderGeometry(0.016, 0.012, seatHeight, 16);
    const legOffsets = [
      [0.18, 0.18],
      [-0.18, 0.18],
      [0.18, -0.18],
      [-0.18, -0.18]
    ];
    legOffsets.forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(x, seatHeight / 2, z);
      leg.rotation.z = x > 0 ? -0.05 : 0.05;
      leg.castShadow = true;
      group.add(leg);
    });
  }

  /**
   * Sofa / Couch Builder
   */
  buildSofa(group, p) {
    const fabricMat = TextureGenerator.getMaterial('fabric', p.primaryColor);
    const legMat = TextureGenerator.getMaterial('wood', '#3a2012');

    // 1. Base / Frame
    const baseGeom = new THREE.BoxGeometry(1.6, 0.25, 0.85);
    const base = new THREE.Mesh(baseGeom, fabricMat);
    base.position.y = 0.22;
    base.castShadow = true;
    group.add(base);

    // 2. Seat Cushions (2 pads)
    const padGeom = new THREE.BoxGeometry(0.72, 0.15, 0.65);
    [-0.38, 0.38].forEach((x) => {
      const pad = new THREE.Mesh(padGeom, fabricMat);
      pad.position.set(x, 0.4, 0.05);
      pad.castShadow = true;
      group.add(pad);
    });

    // 3. Backrest
    const backGeom = new THREE.BoxGeometry(1.6, 0.55, 0.22);
    const back = new THREE.Mesh(backGeom, fabricMat);
    back.position.set(0, 0.62, -0.32);
    back.castShadow = true;
    group.add(back);

    // 4. Armrests
    const armGeom = new THREE.BoxGeometry(0.18, 0.35, 0.85);
    [-0.89, 0.89].forEach((x) => {
      const arm = new THREE.Mesh(armGeom, fabricMat);
      arm.position.set(x, 0.52, 0);
      arm.castShadow = true;
      group.add(arm);
    });

    // 5. Wooden Legs
    const legGeom = new THREE.CylinderGeometry(0.025, 0.015, 0.1, 16);
    [
      [-0.7, 0.3], [0.7, 0.3],
      [-0.7, -0.3], [0.7, -0.3]
    ].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(x, 0.05, z);
      leg.castShadow = true;
      group.add(leg);
    });
  }

  /**
   * Shelf / Bookcase Builder
   */
  buildShelf(group, p) {
    const shelfMat = TextureGenerator.getMaterial(p.primaryMaterial, p.primaryColor);
    const frameMat = TextureGenerator.getMaterial(p.secondaryMaterial, p.secondaryColor);

    const height = 1.4;
    const width = 0.8;
    const depth = 0.32;
    const tiers = 4;

    // Side Frames
    const sideGeom = new THREE.BoxGeometry(0.02, height, depth);
    [-width / 2, width / 2].forEach((x) => {
      const side = new THREE.Mesh(sideGeom, frameMat);
      side.position.set(x, height / 2, 0);
      side.castShadow = true;
      group.add(side);
    });

    // Shelf Planks
    const plankGeom = new THREE.BoxGeometry(width, 0.025, depth);
    for (let i = 0; i <= tiers; i++) {
      const y = 0.08 + (i * (height - 0.12)) / tiers;
      const plank = new THREE.Mesh(plankGeom, shelfMat);
      plank.position.set(0, y, 0);
      plank.castShadow = true;
      group.add(plank);

      // Add colorful procedural books on shelves
      if (i < tiers) {
        for (let b = 0; b < 3; b++) {
          const bookGeom = new THREE.BoxGeometry(0.035, 0.18 + Math.random() * 0.06, 0.2);
          const bookMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(['#1e3a8a', '#991b1b', '#065f46', '#78350f'][b % 4]),
            roughness: 0.6
          });
          const book = new THREE.Mesh(bookGeom, bookMat);
          book.position.set(-0.25 + b * 0.045, y + 0.1, 0);
          book.castShadow = true;
          group.add(book);
        }
      }
    }
  }

  /**
   * Cabinet / Nightstand Builder
   */
  buildCabinet(group, p) {
    const bodyMat = TextureGenerator.getMaterial(p.primaryMaterial, p.primaryColor);
    const metalMat = TextureGenerator.getMaterial('gold', '#d4af37');

    // Main Box
    const boxGeom = new THREE.BoxGeometry(0.6, 0.55, 0.4);
    const box = new THREE.Mesh(boxGeom, bodyMat);
    box.position.y = 0.42;
    box.castShadow = true;
    group.add(box);

    // Drawer seam lines
    const seamGeom = new THREE.BoxGeometry(0.58, 0.005, 0.402);
    const seamMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const seam = new THREE.Mesh(seamGeom, seamMat);
    seam.position.set(0, 0.42, 0);
    group.add(seam);

    // Brass handles
    const handleGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.08, 16);
    [0.3, 0.54].forEach((y) => {
      const handle = new THREE.Mesh(handleGeom, metalMat);
      handle.rotation.z = Math.PI / 2;
      handle.position.set(0, y, 0.21);
      group.add(handle);
    });

    // Legs
    const legGeom = new THREE.CylinderGeometry(0.015, 0.01, 0.15, 12);
    [
      [-0.24, 0.15], [0.24, 0.15],
      [-0.24, -0.15], [0.24, -0.15]
    ].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeom, metalMat);
      leg.position.set(x, 0.075, z);
      leg.castShadow = true;
      group.add(leg);
    });
  }

  /**
   * Bed Builder
   */
  buildBed(group, p) {
    const frameMat = TextureGenerator.getMaterial('wood', p.primaryColor);
    const sheetMat = TextureGenerator.getMaterial('fabric', '#f8fafc');
    const pillowMat = TextureGenerator.getMaterial('fabric', '#e2e8f0');

    // Bed Frame
    const frameGeom = new THREE.BoxGeometry(1.4, 0.2, 1.9);
    const frame = new THREE.Mesh(frameGeom, frameMat);
    frame.position.y = 0.15;
    frame.castShadow = true;
    group.add(frame);

    // Headboard
    const headGeom = new THREE.BoxGeometry(1.4, 0.8, 0.08);
    const headboard = new THREE.Mesh(headGeom, frameMat);
    headboard.position.set(0, 0.55, -0.94);
    headboard.castShadow = true;
    group.add(headboard);

    // Mattress
    const mattGeom = new THREE.BoxGeometry(1.3, 0.2, 1.8);
    const matt = new THREE.Mesh(mattGeom, sheetMat);
    matt.position.set(0, 0.32, 0.02);
    matt.castShadow = true;
    group.add(matt);

    // Pillows
    const pillowGeom = new THREE.BoxGeometry(0.5, 0.1, 0.35);
    [-0.32, 0.32].forEach((x) => {
      const pillow = new THREE.Mesh(pillowGeom, pillowMat);
      pillow.position.set(x, 0.46, -0.65);
      pillow.rotation.x = 0.2;
      group.add(pillow);
    });
  }

  /**
   * Bottle / Vase / Vessel Builder
   */
  buildVessel(group, p) {
    const glassMat = TextureGenerator.getMaterial(p.primaryMaterial || 'glass', p.primaryColor);
    const capMat = TextureGenerator.getMaterial('gold', '#d4af37');

    // Body
    const bodyGeom = new THREE.CylinderGeometry(0.12, 0.14, 0.45, 32);
    const body = new THREE.Mesh(bodyGeom, glassMat);
    body.position.y = 0.23;
    body.castShadow = true;
    group.add(body);

    // Shoulder & Neck
    const neckGeom = new THREE.CylinderGeometry(0.045, 0.12, 0.12, 32);
    const neck = new THREE.Mesh(neckGeom, glassMat);
    neck.position.y = 0.51;
    group.add(neck);

    // Cap / Atomizer
    const capGeom = new THREE.CylinderGeometry(0.048, 0.048, 0.08, 32);
    const cap = new THREE.Mesh(capGeom, capMat);
    cap.position.y = 0.61;
    cap.castShadow = true;
    group.add(cap);
  }

  /**
   * Mug / Cup Builder
   */
  buildMug(group, p) {
    const ceramicMat = TextureGenerator.getMaterial('marble', p.primaryColor);

    // Mug Body (hollow cylinder simulation)
    const bodyGeom = new THREE.CylinderGeometry(0.12, 0.11, 0.24, 32);
    const body = new THREE.Mesh(bodyGeom, ceramicMat);
    body.position.y = 0.12;
    body.castShadow = true;
    group.add(body);

    // Handle
    const handleGeom = new THREE.TorusGeometry(0.07, 0.016, 16, 32, Math.PI);
    const handle = new THREE.Mesh(handleGeom, ceramicMat);
    handle.rotation.z = -Math.PI / 2;
    handle.position.set(0.13, 0.12, 0);
    handle.castShadow = true;
    group.add(handle);
  }

  /**
   * Box / Packaging Builder
   */
  buildBox(group, p) {
    const boxMat = TextureGenerator.getMaterial(p.primaryMaterial || 'cardboard', p.primaryColor);

    const boxGeom = new THREE.BoxGeometry(0.4, 0.25, 0.3);
    const box = new THREE.Mesh(boxGeom, boxMat);
    box.position.y = 0.125;
    box.castShadow = true;
    box.receiveShadow = true;
    group.add(box);

    // Flap tape/seam
    const tapeGeom = new THREE.BoxGeometry(0.04, 0.252, 0.302);
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 });
    const tape = new THREE.Mesh(tapeGeom, tapeMat);
    tape.position.y = 0.125;
    group.add(tape);
  }

  /**
   * Conical Woven Lampshade Builder with white inner liner and 3-arm recessed spider fitting
   */
  buildLampshade(group, p) {
    const shadeMat = TextureGenerator.getMaterial(p.primaryMaterial || 'rattan', p.primaryColor || '#d1a877');
    const linerMat = TextureGenerator.getMaterial('liner', '#faf8f2');
    const brassMat = TextureGenerator.getMaterial('gold', '#d4af37');

    const radiusTop = 0.12;
    const radiusBottom = 0.23;
    const height = 0.24;
    const segments = 64;

    // 1. Outer woven conical shade
    const outerGeom = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, true);
    const outerMesh = new THREE.Mesh(outerGeom, shadeMat);
    outerMesh.position.y = height / 2;
    outerMesh.castShadow = true;
    outerMesh.receiveShadow = true;
    group.add(outerMesh);

    // 2. Inner smooth off-white reflector lining
    const innerGeom = new THREE.CylinderGeometry(radiusTop * 0.995, radiusBottom * 0.995, height * 0.998, segments, 1, true);
    const innerMesh = new THREE.Mesh(innerGeom, linerMat);
    innerMesh.position.y = height / 2;
    innerMesh.receiveShadow = true;
    group.add(innerMesh);

    // 3. Top rolled rim / welt trim
    const topRimGeom = new THREE.TorusGeometry(radiusTop, 0.007, 16, segments);
    const topRim = new THREE.Mesh(topRimGeom, shadeMat);
    topRim.rotation.x = Math.PI / 2;
    topRim.position.y = height;
    topRim.castShadow = true;
    group.add(topRim);

    // 4. Bottom rolled rim / welt trim
    const botRimGeom = new THREE.TorusGeometry(radiusBottom, 0.008, 16, segments);
    const botRim = new THREE.Mesh(botRimGeom, shadeMat);
    botRim.rotation.x = Math.PI / 2;
    botRim.position.y = 0.004;
    botRim.castShadow = true;
    group.add(botRim);

    // 5. Attachment Hardware (Bulb Clip-On Fitter vs Spider Fitter)
    const isClipOn = /bulb|clip/i.test(p.raw);
    const isSpider = (/spider|harp/i.test(p.raw) && !isClipOn) || (!isClipOn && !/bulb|clip/i.test(p.raw));

    if (isSpider) {
      // Recessed 3-arm Spider Fitter (Brass hardware)
      const recessY = height - 0.045; // 4.5 cm drop below top rim

      // Center brass threaded socket ring / washer
      const hubOuterRadius = 0.019;
      const hubGeom = new THREE.CylinderGeometry(hubOuterRadius, hubOuterRadius, 0.016, 24);
      const hub = new THREE.Mesh(hubGeom, brassMat);
      hub.position.y = recessY;
      hub.castShadow = true;
      group.add(hub);

      // Center socket hole effect
      const holeGeom = new THREE.CylinderGeometry(0.009, 0.009, 0.018, 16);
      const holeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
      const hole = new THREE.Mesh(holeGeom, holeMat);
      hole.position.y = recessY;
      group.add(hole);

      // 3 Radial brass spokes extending from center washer to top rim
      const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
      const spokeRadius = 0.0035;

      angles.forEach((angle) => {
        const armLength = radiusTop - hubOuterRadius;
        const spokeGeom = new THREE.CylinderGeometry(spokeRadius, spokeRadius, armLength, 12);
        const spoke = new THREE.Mesh(spokeGeom, brassMat);

        const midDist = hubOuterRadius + armLength / 2;
        spoke.position.set(
          Math.cos(angle) * midDist,
          recessY,
          Math.sin(angle) * midDist
        );
        spoke.rotation.z = Math.PI / 2;
        spoke.rotation.y = -angle;
        spoke.castShadow = true;
        group.add(spoke);

        const tabHeight = height - recessY;
        const tabGeom = new THREE.CylinderGeometry(spokeRadius, spokeRadius, tabHeight, 12);
        const tab = new THREE.Mesh(tabGeom, brassMat);
        tab.position.set(
          Math.cos(angle) * (radiusTop - 0.004),
          recessY + tabHeight / 2,
          Math.sin(angle) * (radiusTop - 0.004)
        );
        tab.castShadow = true;
        group.add(tab);
      });
    } else {
      // ═════════════════════════════════════════════════════════════════════════
      // BULB CLIP-ON FITTER (AUTHENTIC GOLDEN BRASS SPRING WIRE CLIP & LIGHT BULB)
      // ═════════════════════════════════════════════════════════════════════════
      const wireR = 0.0022; // Authentic lampshade wire gauge (10-gauge steel)
      const armDrop = Math.min(0.065, Math.max(0.03, height * 0.16));
      const clipTopY = height - armDrop;
      const saddleRadius = 0.026;

      // 1. Two straight top support struts welded to top wire ring in golden brass
      const armCurve1 = new THREE.LineCurve3(
        new THREE.Vector3(-radiusTop + 0.005, height, 0),
        new THREE.Vector3(-saddleRadius, clipTopY, 0)
      );
      const armTubeGeo1 = new THREE.TubeGeometry(armCurve1, 8, wireR, 8, false);
      const arm1 = new THREE.Mesh(armTubeGeo1, brassMat);
      arm1.name = 'clip_strut_left';
      arm1.castShadow = true;
      group.add(arm1);

      const armCurve2 = new THREE.LineCurve3(
        new THREE.Vector3(radiusTop - 0.005, height, 0),
        new THREE.Vector3(saddleRadius, clipTopY, 0)
      );
      const armTubeGeo2 = new THREE.TubeGeometry(armCurve2, 8, wireR, 8, false);
      const arm2 = new THREE.Mesh(armTubeGeo2, brassMat);
      arm2.name = 'clip_strut_right';
      arm2.castShadow = true;
      group.add(arm2);

      // 2. Central Wire Saddle Ring in golden brass
      const saddleGeo = new THREE.TorusGeometry(saddleRadius, wireR, 12, 32);
      const saddleMesh = new THREE.Mesh(saddleGeo, brassMat);
      saddleMesh.name = 'clip_saddle_ring';
      saddleMesh.rotation.x = Math.PI / 2;
      saddleMesh.position.set(0, clipTopY, 0);
      saddleMesh.castShadow = true;
      group.add(saddleMesh);

      // 3. Two Vertical Spring Steel Clip Loops (Front +Z and Back -Z) in golden brass
      const bulbRadius = Math.min(0.045, Math.max(0.028, radiusTop * 0.32));
      const bulbHeight = bulbRadius * 2.3;
      const bulbCenterY = clipTopY - bulbHeight * 0.42;

      const xHalf = bulbRadius * 0.42;
      const zHug = bulbRadius * 1.08;
      const loopBottomY = bulbCenterY - bulbHeight * 0.18;
      const loopMidY = bulbCenterY + bulbHeight * 0.08;

      const createClipLoop = (zSign, loopName) => {
        const z = zSign * zHug;
        const curvePts = [
          new THREE.Vector3(-0.016, clipTopY, zSign * 0.016),
          new THREE.Vector3(-xHalf, clipTopY - (clipTopY - loopMidY) * 0.45, z * 0.75),
          new THREE.Vector3(-xHalf, loopMidY, z),
          new THREE.Vector3(-xHalf * 0.72, loopBottomY, z * 0.95),
          new THREE.Vector3(0, loopBottomY - 0.012, z * 0.92),
          new THREE.Vector3(xHalf * 0.72, loopBottomY, z * 0.95),
          new THREE.Vector3(xHalf, loopMidY, z),
          new THREE.Vector3(xHalf, clipTopY - (clipTopY - loopMidY) * 0.45, z * 0.75),
          new THREE.Vector3(0.016, clipTopY, zSign * 0.016),
        ];
        const curve = new THREE.CatmullRomCurve3(curvePts, true);
        const tubeGeo = new THREE.TubeGeometry(curve, 36, wireR, 8, true);
        const mesh = new THREE.Mesh(tubeGeo, brassMat);
        mesh.name = loopName;
        mesh.castShadow = true;
        return mesh;
      };

      group.add(createClipLoop(1, 'bulb_clip_loop_front'));
      group.add(createClipLoop(-1, 'bulb_clip_loop_back'));

      // 4. Centered Realistic Light Bulb inside the spring clip loops
      const bulbGroup = new THREE.Group();
      bulbGroup.name = 'light_bulb_assembly';

      // Bulb glass envelope
      const domeSegments = 16;
      const points = [];
      for (let i = 0; i <= domeSegments; i++) {
        const theta = (i / domeSegments) * (Math.PI / 2);
        const x = Math.sin(theta) * bulbRadius;
        const y = bulbHeight * 0.35 + Math.cos(theta) * bulbRadius;
        points.push(new THREE.Vector2(x, y));
      }
      const taperSegments = 10;
      for (let i = 1; i <= taperSegments; i++) {
        const t = i / taperSegments;
        const y = bulbHeight * 0.35 - t * (bulbHeight * 0.60);
        const factor = 1 - 0.55 * (0.5 - 0.5 * Math.cos(t * Math.PI));
        const x = bulbRadius * factor;
        points.push(new THREE.Vector2(x, y));
      }
      points.push(new THREE.Vector2(bulbRadius * 0.42, -bulbHeight * 0.28));
      points.push(new THREE.Vector2(bulbRadius * 0.38, -bulbHeight * 0.42));
      points.push(new THREE.Vector2(0, -bulbHeight * 0.42));

      const bulbGeo = new THREE.LatheGeometry(points, 32);
      const bulbMat = TextureGenerator.getMaterial('bulb', '#fffdfa');
      const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
      bulbMesh.name = 'bulb_glass';
      bulbGroup.add(bulbMesh);

      // Screw socket base in brass
      const baseRadius = bulbRadius * 0.38;
      const baseH = bulbHeight * 0.24;
      const baseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius * 0.95, baseH, 24);
      const baseMesh = new THREE.Mesh(baseGeo, brassMat);
      baseMesh.name = 'bulb_socket_base';
      baseMesh.position.y = -bulbHeight * 0.42 - baseH / 2;
      bulbGroup.add(baseMesh);

      // Tungsten filament wire inside glass
      const filamentRadius = bulbRadius * 0.26;
      const filamentTopY = bulbHeight * 0.22;
      const filamentCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-filamentRadius, -bulbHeight * 0.04, 0),
        new THREE.Vector3(-filamentRadius * 0.5, filamentTopY * 0.75, 0),
        new THREE.Vector3(0, filamentTopY, 0),
        new THREE.Vector3(filamentRadius * 0.5, filamentTopY * 0.75, 0),
        new THREE.Vector3(filamentRadius, -bulbHeight * 0.04, 0),
      ]);
      const filamentGeo = new THREE.TubeGeometry(filamentCurve, 16, 0.0012, 6, false);
      const filamentMat = new THREE.MeshBasicMaterial({ color: 0xffe29a });
      const filamentMesh = new THREE.Mesh(filamentGeo, filamentMat);
      filamentMesh.name = 'tungsten_filament';
      bulbGroup.add(filamentMesh);

      bulbGroup.position.set(0, bulbCenterY, 0);
      group.add(bulbGroup);
    }
  }

  /**
   * Lamp Builder
   */
  buildLamp(group, p) {
    const metalMat = TextureGenerator.getMaterial('metal', p.secondaryColor || '#222222');
    const shadeMat = TextureGenerator.getMaterial(p.primaryMaterial || 'fabric', p.primaryColor || '#f8fafc');

    // Base
    const baseGeom = new THREE.CylinderGeometry(0.15, 0.16, 0.02, 32);
    const base = new THREE.Mesh(baseGeom, metalMat);
    base.position.y = 0.01;
    base.castShadow = true;
    group.add(base);

    // Stem
    const stemGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.9, 16);
    const stem = new THREE.Mesh(stemGeom, metalMat);
    stem.position.y = 0.46;
    stem.castShadow = true;
    group.add(stem);

    // Shade
    const shadeGeom = new THREE.ConeGeometry(0.22, 0.25, 32, 1, true);
    const shade = new THREE.Mesh(shadeGeom, shadeMat);
    shade.position.y = 0.95;
    shade.castShadow = true;
    group.add(shade);

    // Light bulb glow
    const bulbGeom = new THREE.SphereGeometry(0.04, 16, 16);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    const bulb = new THREE.Mesh(bulbGeom, bulbMat);
    bulb.position.y = 0.9;
    group.add(bulb);
  }

  /**
   * Electronics (Laptop / Monitor / Phone) Builder
   */
  buildElectronics(group, p) {
    const metalMat = TextureGenerator.getMaterial('metal', '#334155');
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    if (p.category === 'laptop') {
      // Base / keyboard
      const baseGeom = new THREE.BoxGeometry(0.32, 0.012, 0.22);
      const base = new THREE.Mesh(baseGeom, metalMat);
      base.position.y = 0.006;
      base.castShadow = true;
      group.add(base);

      // Trackpad
      const padGeom = new THREE.BoxGeometry(0.1, 0.001, 0.06);
      const padMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2 });
      const pad = new THREE.Mesh(padGeom, padMat);
      pad.position.set(0, 0.013, 0.06);
      group.add(pad);

      // Screen lid
      const lidGeom = new THREE.BoxGeometry(0.32, 0.22, 0.008);
      const lid = new THREE.Mesh(lidGeom, metalMat);
      lid.position.set(0, 0.11, -0.1);
      lid.rotation.x = -0.15;
      lid.castShadow = true;
      group.add(lid);

      // Display face
      const dispGeom = new THREE.BoxGeometry(0.29, 0.19, 0.001);
      const disp = new THREE.Mesh(dispGeom, screenMat);
      disp.position.set(0, 0.11, -0.095);
      disp.rotation.x = -0.15;
      group.add(disp);
    } else {
      // General Monitor / Smartphone
      const bodyGeom = new THREE.BoxGeometry(0.45, 0.3, 0.015);
      const body = new THREE.Mesh(bodyGeom, metalMat);
      body.position.y = 0.25;
      body.castShadow = true;
      group.add(body);

      // Stand
      const standGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 16);
      const stand = new THREE.Mesh(standGeom, metalMat);
      stand.position.y = 0.075;
      group.add(stand);

      const footGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.01, 24);
      const foot = new THREE.Mesh(footGeom, metalMat);
      foot.position.y = 0.005;
      group.add(foot);
    }
  }

  /**
   * Plant Pot Builder
   */
  buildPlantPot(group, p) {
    const potMat = TextureGenerator.getMaterial('marble', p.primaryColor);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3 });

    // Pot
    const potGeom = new THREE.CylinderGeometry(0.18, 0.12, 0.28, 32);
    const pot = new THREE.Mesh(potGeom, potMat);
    pot.position.y = 0.14;
    pot.castShadow = true;
    group.add(pot);

    // Leaves / Foliage
    for (let i = 0; i < 7; i++) {
      const angle = (i * Math.PI * 2) / 7;
      const leafGeom = new THREE.ConeGeometry(0.05, 0.25, 4);
      const leaf = new THREE.Mesh(leafGeom, leafMat);
      leaf.position.set(Math.sin(angle) * 0.08, 0.32, Math.cos(angle) * 0.08);
      leaf.rotation.z = Math.sin(angle) * 0.45;
      leaf.rotation.x = Math.cos(angle) * 0.45;
      leaf.castShadow = true;
      group.add(leaf);
    }
  }

  /**
   * General / Fallback Object Builder
   */
  buildGeneralObject(group, p) {
    const mat = TextureGenerator.getMaterial(p.primaryMaterial, p.primaryColor);
    const accentMat = TextureGenerator.getMaterial(p.secondaryMaterial, p.secondaryColor);

    if (p.isRound) {
      // Multi-tier elegant curved cylinder pedestal
      const geom = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 32);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = 0.25;
      mesh.castShadow = true;
      group.add(mesh);

      const ringGeom = new THREE.TorusGeometry(0.31, 0.02, 16, 32);
      const ring = new THREE.Mesh(ringGeom, accentMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.25;
      group.add(ring);
    } else {
      // Modern beveled pedestal / product structure
      const geom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = 0.25;
      mesh.castShadow = true;
      group.add(mesh);

      // Decorative top slab
      const topGeom = new THREE.BoxGeometry(0.54, 0.03, 0.54);
      const top = new THREE.Mesh(topGeom, accentMat);
      top.position.y = 0.515;
      group.add(top);
    }
  }

  /**
   * Procedural Rubber Duck Builder
   * Builds an authentic, smooth, classic rubber duck figure with:
   * - Rounded body (scaled ellipsoid)
   * - Upturned tail cone
   * - Rounded head
   * - Distinct orange flat bill / beak
   * - Glossy black eyes with pupil catchlights
   * - Contoured side wings
   */
  buildDuck(group, p) {
    const isWood = p.primaryMaterial === 'wood' || p.raw.includes('wooden') || p.raw.includes('wood');
    const duckColor = isWood ? (p.primaryColor || '#d49b4b') : (p.raw.includes('white') ? '#f8fafc' : '#ffd000');
    const beakColor = isWood ? '#b85c14' : '#ff5500';

    const bodyMat = isWood
      ? TextureGenerator.getMaterial('wood', duckColor)
      : new THREE.MeshStandardMaterial({ color: new THREE.Color(duckColor), roughness: 0.25, metalness: 0.05 });

    const beakMat = isWood
      ? TextureGenerator.getMaterial('wood', beakColor)
      : new THREE.MeshStandardMaterial({ color: new THREE.Color(beakColor), roughness: 0.35, metalness: 0.05 });

    const eyeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#111111'), roughness: 0.1, metalness: 0.1 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff') });

    // 1. Duck Body (Ellipsoid: wide, tall, elongated front-to-back)
    const bodyGeom = new THREE.SphereGeometry(0.18, 32, 24);
    bodyGeom.scale(1.0, 0.88, 1.25);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.set(0, 0.18, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 2. Duck Tail (Pointed cone tilted upwards at the rear)
    const tailGeom = new THREE.ConeGeometry(0.065, 0.14, 24);
    const tail = new THREE.Mesh(tailGeom, bodyMat);
    tail.position.set(0, 0.24, -0.20);
    tail.rotation.x = -Math.PI / 3.2;
    tail.castShadow = true;
    group.add(tail);

    // 3. Duck Head (Perched on front top of body)
    const headGeom = new THREE.SphereGeometry(0.12, 32, 24);
    const head = new THREE.Mesh(headGeom, bodyMat);
    head.position.set(0, 0.34, 0.10);
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);

    // 4. Duck Bill / Beak (Flattened rounded cylinder extending forward from head)
    const beakGeom = new THREE.CylinderGeometry(0.065, 0.075, 0.026, 32);
    beakGeom.scale(1.15, 1.0, 1.55);
    const beak = new THREE.Mesh(beakGeom, beakMat);
    beak.position.set(0, 0.315, 0.235);
    beak.rotation.x = 0.08;
    beak.castShadow = true;
    group.add(beak);

    // 5. Left & Right Eyes
    const eyeGeom = new THREE.SphereGeometry(0.016, 16, 16);
    const pupilGeom = new THREE.SphereGeometry(0.005, 12, 12);

    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(eyeGeom, eyeMat);
      eye.position.set(side * 0.076, 0.375, 0.17);
      eye.castShadow = true;
      group.add(eye);

      // Catchlight reflection in eye
      const pupil = new THREE.Mesh(pupilGeom, pupilMat);
      pupil.position.set(side * 0.082, 0.383, 0.182);
      group.add(pupil);
    });

    // 6. Left & Right Wings (Contoured flattened ellipsoids hugging the body)
    const wingGeom = new THREE.SphereGeometry(0.12, 24, 20);
    wingGeom.scale(0.35, 0.75, 1.15);

    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(wingGeom, bodyMat);
      wing.position.set(side * 0.165, 0.18, 0.01);
      wing.rotation.z = side * -0.16;
      wing.rotation.y = side * 0.08;
      wing.castShadow = true;
      group.add(wing);
    });
  }

  /**
   * High-Fidelity Conical Woven Lampshade Builder with 3-Way Spider Fitter
   */
  buildLampshade(group, p) {
    const shadeMat = TextureGenerator.getMaterial(p.primaryMaterial || 'burlap', p.primaryColor || '#cbb084');
    const rimMat = TextureGenerator.getMaterial('burlap', '#bfa278');
    const brassMat = TextureGenerator.getMaterial('gold', '#d4af37');

    const topRadius = 0.12;
    const bottomRadius = 0.22;
    const height = 0.24;
    const halfH = height / 2;

    // 1. Hollow Conical Shade (Open-ended cylinder, visible both inside and outside)
    const shadeGeom = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 64, 1, true);
    const shade = new THREE.Mesh(shadeGeom, shadeMat);
    shade.position.y = halfH;
    shade.castShadow = true;
    shade.receiveShadow = true;
    group.add(shade);

    // 2. Rolled Top Edge Trim (Piping Torus)
    const topTorusGeom = new THREE.TorusGeometry(topRadius, 0.007, 24, 64);
    const topTorus = new THREE.Mesh(topTorusGeom, rimMat);
    topTorus.rotation.x = Math.PI / 2;
    topTorus.position.y = height;
    topTorus.castShadow = true;
    group.add(topTorus);

    // 3. Rolled Bottom Edge Trim (Piping Torus)
    const botTorusGeom = new THREE.TorusGeometry(bottomRadius, 0.009, 24, 64);
    const botTorus = new THREE.Mesh(botTorusGeom, rimMat);
    botTorus.rotation.x = Math.PI / 2;
    botTorus.position.y = 0.002;
    botTorus.castShadow = true;
    group.add(botTorus);

    // 4. Center Brass Hub / Threaded Washer Fitting
    const hubOuterGeom = new THREE.CylinderGeometry(0.018, 0.018, 0.014, 32);
    const hub = new THREE.Mesh(hubOuterGeom, brassMat);
    const hubY = height - 0.035;
    hub.position.y = hubY;
    hub.castShadow = true;
    group.add(hub);

    // Inner hole of washer
    const hubHoleGeom = new THREE.CylinderGeometry(0.008, 0.008, 0.015, 24);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const hole = new THREE.Mesh(hubHoleGeom, holeMat);
    hole.position.y = hubY;
    group.add(hole);

    // 5. Three-Arm Brass Spider Spokes (120 deg apart)
    const spokeCount = 3;
    const spokeRadius = 0.0035;
    const spokeLength = topRadius - 0.018;

    for (let i = 0; i < spokeCount; i++) {
      const angle = (i * 2 * Math.PI) / spokeCount;

      // Radial spoke rod extending outward
      const spokeGeom = new THREE.CylinderGeometry(spokeRadius, spokeRadius, spokeLength, 16);
      const spoke = new THREE.Mesh(spokeGeom, brassMat);

      const midR = (topRadius - 0.015) / 2;
      spoke.position.set(
        Math.cos(angle) * midR,
        hubY + 0.005,
        Math.sin(angle) * midR
      );
      spoke.rotation.set(0, -angle, Math.PI / 2);
      spoke.castShadow = true;
      group.add(spoke);

      // Downward angled tab that clips to top shade rim
      const tabGeom = new THREE.CylinderGeometry(spokeRadius, spokeRadius, 0.024, 16);
      const tab = new THREE.Mesh(tabGeom, brassMat);
      tab.position.set(
        Math.cos(angle) * (topRadius - 0.008),
        hubY + 0.014,
        Math.sin(angle) * (topRadius - 0.008)
      );
      tab.castShadow = true;
      group.add(tab);
    }
  }

  /**
   * High-Fidelity Cute Plush Penguin Builder
   */
  buildPenguin(group, p) {
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x1e232a, roughness: 0.65, metalness: 0.05 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7, metalness: 0.02 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff7700, roughness: 0.5, metalness: 0.05 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.2 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // 1. Main Black Body (Tapered rounded ellipsoid)
    const bodyGeom = new THREE.SphereGeometry(0.12, 32, 24);
    bodyGeom.scale(1.0, 1.25, 0.95);
    const body = new THREE.Mesh(bodyGeom, blackMat);
    body.position.y = 0.15;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 2. White Belly Patch (Overlapping curved front plate)
    const bellyGeom = new THREE.SphereGeometry(0.10, 32, 24);
    bellyGeom.scale(0.92, 1.15, 0.5);
    const belly = new THREE.Mesh(bellyGeom, whiteMat);
    belly.position.set(0, 0.14, 0.06);
    belly.castShadow = true;
    group.add(belly);

    // 3. Black Head (Smooth sphere seated on shoulders)
    const headGeom = new THREE.SphereGeometry(0.09, 32, 24);
    const head = new THREE.Mesh(headGeom, blackMat);
    head.position.set(0, 0.27, 0.02);
    head.castShadow = true;
    group.add(head);

    // 4. White Face / Eye Mask (Cheek patches)
    const maskGeom = new THREE.SphereGeometry(0.075, 32, 20);
    maskGeom.scale(0.95, 0.85, 0.5);
    const mask = new THREE.Mesh(maskGeom, whiteMat);
    mask.position.set(0, 0.26, 0.07);
    mask.castShadow = true;
    group.add(mask);

    // 5. Two Glossy Black Eyes with White Reflection Pupils
    const eyeGeom = new THREE.SphereGeometry(0.013, 16, 16);
    const pupilGeom = new THREE.SphereGeometry(0.004, 12, 12);

    [-0.034, 0.034].forEach((x) => {
      const eye = new THREE.Mesh(eyeGeom, eyeMat);
      eye.position.set(x, 0.275, 0.095);
      eye.castShadow = true;
      group.add(eye);

      const pupil = new THREE.Mesh(pupilGeom, pupilMat);
      pupil.position.set(x + (x > 0 ? 0.002 : -0.002), 0.279, 0.105);
      group.add(pupil);
    });

    // 6. Orange Beak (Forward pointing triangular cone)
    const beakGeom = new THREE.ConeGeometry(0.022, 0.05, 24);
    const beak = new THREE.Mesh(beakGeom, orangeMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.25, 0.105);
    beak.castShadow = true;
    group.add(beak);

    // 7. Left & Right Flippers (Wings)
    const flipperGeom = new THREE.SphereGeometry(0.11, 24, 16);
    flipperGeom.scale(0.25, 0.9, 0.45);

    [-1, 1].forEach((side) => {
      const flipper = new THREE.Mesh(flipperGeom, blackMat);
      flipper.position.set(side * 0.125, 0.15, 0.01);
      flipper.rotation.z = side * -0.35;
      flipper.rotation.x = 0.2;
      flipper.castShadow = true;
      group.add(flipper);
    });

    // 8. Flat Orange Paddle Feet
    const footGeom = new THREE.CylinderGeometry(0.035, 0.04, 0.015, 24);
    footGeom.scale(1.0, 1.0, 1.5);

    [-1, 1].forEach((side) => {
      const foot = new THREE.Mesh(footGeom, orangeMat);
      foot.position.set(side * 0.05, 0.01, 0.045);
      foot.rotation.y = side * 0.2;
      foot.castShadow = true;
      group.add(foot);
    });
  }

  /**
   * Normalizes the generated model to exact real-world target dimensions (W x H x D in meters)
   * Centers horizontally and grounds base at y = 0.
   */
  normalizeDimensions(group, targetDimensions) {
    const targetW = Math.max(0.01, parseFloat(targetDimensions.width) || 1.0);
    const targetH = Math.max(0.01, parseFloat(targetDimensions.height) || 0.75);
    const targetD = Math.max(0.01, parseFloat(targetDimensions.depth) || 0.6);

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);

    if (size.x > 0 && size.y > 0 && size.z > 0) {
      const scaleX = targetW / size.x;
      const scaleY = targetH / size.y;
      const scaleZ = targetD / size.z;

      const maxScale = Math.max(scaleX, scaleY, scaleZ);
      const minScale = Math.min(scaleX, scaleY, scaleZ);
      const distortion = maxScale / (minScale || 1);

      // If requested dimensions would severely distort proportions (>1.5x mismatch), preserve natural aspect ratio
      if (distortion > 1.5) {
        const uniformScale = Math.min(scaleX, scaleY, scaleZ);
        group.scale.set(uniformScale, uniformScale, uniformScale);
      } else {
        group.scale.set(scaleX, scaleY, scaleZ);
      }
    }

    // Ground on floor y = 0 and center on x = 0, z = 0
    const finalBox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    finalBox.getCenter(center);

    group.position.x -= center.x;
    group.position.y -= finalBox.min.y;
    group.position.z -= center.z;

    // Attach dimension metadata for AR & exporter
    group.userData.dimensions = {
      width: targetW,
      height: targetH,
      depth: targetD
    };
  }
}

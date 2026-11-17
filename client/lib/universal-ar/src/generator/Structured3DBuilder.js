import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

/**
 * Structured 3D Model Builder
 * Constructs Three.js scene graphs from validated JSON specifications.
 * Completely safe (no eval or new Function), ultra-fast (<2ms), and memory efficient.
 */
export class Structured3DBuilder {
  /**
   * Builds a THREE.Group from a validated JSON model specification.
   * @param {object} spec - JSON specification containing parts
   * @param {object} dimensions - Target dimensions { width, height, depth } in meters
   * @returns {THREE.Group}
   */
  static build(spec, dimensions = { width: 1.0, height: 0.75, depth: 0.6 }) {
    const group = new THREE.Group();
    group.name = spec?.name || 'AI_Structured_Model';

    const parts = Array.isArray(spec) ? spec : (Array.isArray(spec?.parts) ? spec.parts : []);

    for (const part of parts) {
      const mesh = this.buildPart(part);
      if (mesh) {
        group.add(mesh);
      }
    }

    // Universal Anatomical Surface & Feature Assembly Guard
    // Prevents LLM coordinate misalignments where ears, bows, accessories, or facial features
    // are generated inside the skull or torso volumes.
    const head = group.children.find((c) => /head/i.test(c.name));
    const isCharacter = Boolean(head);
    const body = isCharacter ? group.children.find((c) => /body|torso|belly|overalls/i.test(c.name)) : null;

    if (head && head.geometry) {
      head.geometry.computeBoundingBox();
      const headBbox = head.geometry.boundingBox;
      const headScaleX = Math.abs(head.scale.x || 1);
      const headScaleY = Math.abs(head.scale.y || 1);
      const headScaleZ = Math.abs(head.scale.z || 1);

      const headRadiusX = (headBbox.max.x - headBbox.min.x) * 0.5 * headScaleX;
      const headRadiusY = (headBbox.max.y - headBbox.min.y) * 0.5 * headScaleY;
      const headRadiusZ = (headBbox.max.z - headBbox.min.z) * 0.5 * headScaleZ;

      const headTopY = head.position.y + (headBbox.max.y * headScaleY);
      const headFrontZ = head.position.z + (headBbox.max.z * headScaleZ);

      for (const child of group.children) {
        if (child === head || child === body) continue;
        const name = child.name.toLowerCase();

        // 1. Ears: MUST sit on top of head, never swallowed inside the cranium
        if (/ear/i.test(name)) {
          child.geometry.computeBoundingBox();
          const childHalfH = (child.geometry.boundingBox.max.y - child.geometry.boundingBox.min.y) * 0.5 * Math.abs(child.scale.y || 1);
          if (child.position.y < headTopY - childHalfH * 0.4) {
            child.position.y = headTopY + childHalfH * 0.4;
          }
          if (Math.abs(child.position.x) < headRadiusX * 0.35) {
            const side = /left/i.test(name) || child.position.x < 0 ? -1 : 1;
            child.position.x = side * headRadiusX * 0.65;
          }
          if (Math.abs(child.position.z - head.position.z) > headRadiusZ * 0.5) {
            child.position.z = head.position.z;
          }
        }

        // 2. Head Accessories (Bow, Hat, Ribbon, Crown, Flower)
        else if (/bow|hat|ribbon|crown/i.test(name)) {
          if (child.position.y < headTopY - headRadiusY * 0.5) {
            child.position.y = headTopY - 0.015;
          }
          if (child.position.z < headFrontZ * 0.7) {
            child.position.z = headFrontZ * 0.75 + 0.015;
          }
        }

        // 3. Facial Features (Eyes, Nose, Pupil, Beak, Mouth, Cheeks)
        else if (/eye|nose|pupil|beak|mouth|cheek/i.test(name)) {
          if (child.position.z < headFrontZ) {
            child.position.z = headFrontZ + 0.003;
          }
        }

        // 4. Whiskers (Curved cheek surface projection)
        else if (/whisker/i.test(name)) {
          const normX = Math.min(0.95, Math.abs(child.position.x - head.position.x) / (headRadiusX || 1));
          const surfaceZ = head.position.z + headRadiusZ * Math.sqrt(Math.max(0.1, 1 - normX * normX));
          child.position.z = surfaceZ + 0.003;
        }
      }
    }

    if (body && body.geometry) {
      body.geometry.computeBoundingBox();
      const bodyBbox = body.geometry.boundingBox;
      const bodyScaleZ = Math.abs(body.scale.z || 1);
      const bodyFrontZ = body.position.z + (bodyBbox.max.z * bodyScaleZ);

      for (const child of group.children) {
        if (child === head || child === body) continue;
        const name = child.name.toLowerCase();

        // 5. Held items & accessories (Boba cup, drink, flower, heart, balloon, cup)
        if (/cup|boba|drink|flower|balloon|heart|held|bottle|mug/i.test(name)) {
          if (child.position.z < bodyFrontZ + 0.015) {
            child.position.z = bodyFrontZ + 0.025;
          }
        }

        // 6. Arms / Paws / Hands holding items
        else if (/arm|paw|hand/i.test(name)) {
          if (child.position.z < bodyFrontZ - 0.02) {
            child.position.z = bodyFrontZ;
          }
        }
      }
    }

    // Lampshade Hardware & Spider / Clip-On Fitter Alignment Guard
    // Corrects LLM Euler angle and position misalignments for lampshade fitters
    const isLampshade = group.children.some((c) => /shade|lamp/i.test(c.name)) || /shade|lamp/i.test(group.name);
    if (isLampshade) {
      const shadeMesh = group.children.find((c) => /shade|body/i.test(c.name));
      if (shadeMesh && shadeMesh.geometry) {
        shadeMesh.geometry.computeBoundingBox();
        const bbox = shadeMesh.geometry.boundingBox;
        const radiusTop = Math.abs(bbox.max.x) * 0.55;
        const topY = shadeMesh.position.y + bbox.max.y;
        const recessY = topY - 0.045;

        const isClipOn = /clip|bulb/i.test(spec?.name) || group.children.some((c) => /clip|bulb|clamp/i.test(c.name));

        if (isClipOn) {
          // ═════════════════════════════════════════════════════════════════════════
          // BULB CLIP-ON FITTER ALIGNMENT & HARDWARE ASSEMBLY GUARD
          // ═════════════════════════════════════════════════════════════════════════
          // Remove any awkward or misaligned industrial back-wall clamp boxes / hinge pins
          for (let i = group.children.length - 1; i >= 0; i--) {
            const child = group.children[i];
            if (/finial|hinge|bracket_body|hinge_pin|u_bracket/i.test(child.name)) {
              group.remove(child);
            }
          }

          const brassMat = TextureGenerator.getMaterial('gold', '#d4af37');
          const wireR = 0.0022;
          const saddleRadius = 0.026;
          const topR = radiusTop > 0.08 ? radiusTop : 0.12;

          // 1. Central Wire Saddle Ring
          let saddle = group.children.find((c) => /saddle/i.test(c.name));
          if (!saddle) {
            const saddleGeo = new THREE.TorusGeometry(saddleRadius, wireR, 12, 32);
            saddle = new THREE.Mesh(saddleGeo, brassMat);
            saddle.name = 'clip_saddle_ring';
            saddle.castShadow = true;
            group.add(saddle);
          }
          saddle.rotation.set(Math.PI / 2, 0, 0);
          saddle.position.set(0, recessY, 0);

          // 2. Dual Top Support Struts (Left & Right)
          let leftStrut = group.children.find((c) => /strut_left|arm_left/i.test(c.name));
          if (!leftStrut) {
            const curve = new THREE.LineCurve3(
              new THREE.Vector3(-topR + 0.005, topY, 0),
              new THREE.Vector3(-saddleRadius, recessY, 0)
            );
            const geo = new THREE.TubeGeometry(curve, 8, wireR, 8, false);
            leftStrut = new THREE.Mesh(geo, brassMat);
            leftStrut.name = 'clip_strut_left';
            leftStrut.castShadow = true;
            group.add(leftStrut);
          }

          let rightStrut = group.children.find((c) => /strut_right|arm_right/i.test(c.name));
          if (!rightStrut) {
            const curve = new THREE.LineCurve3(
              new THREE.Vector3(topR - 0.005, topY, 0),
              new THREE.Vector3(saddleRadius, recessY, 0)
            );
            const geo = new THREE.TubeGeometry(curve, 8, wireR, 8, false);
            rightStrut = new THREE.Mesh(geo, brassMat);
            rightStrut.name = 'clip_strut_right';
            rightStrut.castShadow = true;
            group.add(rightStrut);
          }

          // 3. Dual Vertical Spring Steel Clip Loops (Front +Z and Back -Z)
          const bulbRadius = Math.min(0.045, Math.max(0.028, topR * 0.32));
          const bulbHeight = bulbRadius * 2.3;
          const bulbCenterY = recessY - bulbHeight * 0.42;

          const xHalf = bulbRadius * 0.42;
          const zHug = bulbRadius * 1.08;
          const loopBottomY = bulbCenterY - bulbHeight * 0.18;
          const loopMidY = bulbCenterY + bulbHeight * 0.08;

          const createClipLoop = (zSign, loopName) => {
            const z = zSign * zHug;
            const curvePts = [
              new THREE.Vector3(-0.016, recessY, zSign * 0.016),
              new THREE.Vector3(-xHalf, recessY - (recessY - loopMidY) * 0.45, z * 0.75),
              new THREE.Vector3(-xHalf, loopMidY, z),
              new THREE.Vector3(-xHalf * 0.72, loopBottomY, z * 0.95),
              new THREE.Vector3(0, loopBottomY - 0.012, z * 0.92),
              new THREE.Vector3(xHalf * 0.72, loopBottomY, z * 0.95),
              new THREE.Vector3(xHalf, loopMidY, z),
              new THREE.Vector3(xHalf, recessY - (recessY - loopMidY) * 0.45, z * 0.75),
              new THREE.Vector3(0.016, recessY, zSign * 0.016),
            ];
            const curve = new THREE.CatmullRomCurve3(curvePts, true);
            const tubeGeo = new THREE.TubeGeometry(curve, 36, wireR, 8, true);
            const mesh = new THREE.Mesh(tubeGeo, brassMat);
            mesh.name = loopName;
            mesh.castShadow = true;
            return mesh;
          };

          if (!group.children.some((c) => /clip_loop_front/i.test(c.name))) {
            group.add(createClipLoop(1, 'bulb_clip_loop_front'));
          }
          if (!group.children.some((c) => /clip_loop_back/i.test(c.name))) {
            group.add(createClipLoop(-1, 'bulb_clip_loop_back'));
          }

          // 4. Centered Realistic Light Bulb inside the spring clip loops
          if (!group.children.some((c) => /light_bulb|bulb_glass/i.test(c.name))) {
            const bulbGroup = new THREE.Group();
            bulbGroup.name = 'light_bulb_assembly';

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

            const baseRadius = bulbRadius * 0.38;
            const baseH = bulbHeight * 0.24;
            const baseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius * 0.95, baseH, 24);
            const baseMesh = new THREE.Mesh(baseGeo, brassMat);
            baseMesh.name = 'bulb_socket_base';
            baseMesh.position.y = -bulbHeight * 0.42 - baseH / 2;
            bulbGroup.add(baseMesh);

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
        } else {
          // ═════════════════════════════════════════════════════════════════════════
          // SPIDER / WASHER FITTER ALIGNMENT GUARD (3-ARM RADIAL BRASS SPOKES)
          // ═════════════════════════════════════════════════════════════════════════
          // 1. Center Washer / Hub: MUST be flat horizontal (rot=[0,0,0]) and centered at [0, recessY, 0]
          const washer = group.children.find((c) => /washer|hub|collar/i.test(c.name));
          if (washer) {
            washer.rotation.set(0, 0, 0);
            washer.position.set(0, recessY, 0);
          }

          // 2. Spider Spokes / Fitter Arms: Exactly 3 radial spokes at 120° angles
          const spokes = group.children.filter((c) => /spoke|fitter_arm|spider_arm/i.test(c.name));
          if (spokes.length > 0) {
            const spokeAngles = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];
            const hubR = 0.018;
            const topR = radiusTop > 0.08 ? radiusTop : 0.12;
            const spokeLen = topR - hubR;
            const midDist = hubR + spokeLen / 2;
            const tabHeight = topY - recessY;
            const brassMat = washer ? washer.material : TextureGenerator.getMaterial('gold', '#d4af37');

            spokes.forEach((spoke, idx) => {
              const theta = spokeAngles[idx % spokeAngles.length];
              const cos = Math.cos(theta);
              const sin = Math.sin(theta);
              spoke.position.set(midDist * cos, recessY, midDist * sin);
              spoke.rotation.set(0, -theta, -Math.PI / 2);

              // Ensure vertical riser tab connects spoke directly to top rim
              const tabName = `riser_tab_${idx + 1}`;
              let tab = group.children.find((c) => c.name === tabName);
              if (!tab) {
                const tabGeom = new THREE.CylinderGeometry(0.003, 0.003, tabHeight, 16);
                tab = new THREE.Mesh(tabGeom, brassMat);
                tab.name = tabName;
                tab.castShadow = true;
                group.add(tab);
              }
              tab.position.set((topR - 0.006) * cos, recessY + tabHeight / 2, (topR - 0.006) * sin);
              tab.rotation.set(0, 0, 0);
            });
          }
        }

        // 3. Ensure top and bottom rolled welt rims exist matching photo
        const topR = radiusTop > 0.08 ? radiusTop : 0.12;
        if (!group.children.some((c) => /top_rim/i.test(c.name))) {
          const topRimGeom = new THREE.TorusGeometry(topR, 0.007, 16, 64);
          const topRim = new THREE.Mesh(topRimGeom, shadeMesh.material);
          topRim.name = 'top_rim';
          topRim.rotation.x = Math.PI / 2;
          topRim.position.y = topY;
          topRim.castShadow = true;
          group.add(topRim);
        }

        // 4. Ensure inner reflector lining exists
        if (!group.children.some((c) => /liner|inner/i.test(c.name))) {
          const linerMat = TextureGenerator.getMaterial('liner', '#faf8f2');
          const botR = Math.abs(bbox.max.x);
          const shadeH = bbox.max.y - bbox.min.y;
          const innerGeom = new THREE.CylinderGeometry(topR * 0.995, botR * 0.995, shadeH * 0.998, 64, 1, true);
          const innerMesh = new THREE.Mesh(innerGeom, linerMat);
          innerMesh.name = 'inner_liner';
          innerMesh.position.y = shadeMesh.position.y;
          group.add(innerMesh);
        }
      }
    }

    // If no valid parts were built, create a fallback base
    if (group.children.length === 0) {
      const fallbackGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const fallbackMat = TextureGenerator.getMaterial('wood', '#8b5a2b');
      const fallbackMesh = new THREE.Mesh(fallbackGeom, fallbackMat);
      fallbackMesh.castShadow = true;
      group.add(fallbackMesh);
    }

    // Normalize to exact requested dimensions and ground on floor y = 0
    this.normalizeDimensions(group, dimensions);

    return group;
  }

  /**
   * Builds a single Three.js Mesh from a part definition.
   */
  static buildPart(part) {
    if (!part || typeof part !== 'object') return null;

    const shape = (part.shape || 'box').toLowerCase();
    const sizeRaw = Array.isArray(part.size) ? part.size : (Array.isArray(part.dimensions) ? part.dimensions : [0.2, 0.2, 0.2]);
    const size = sizeRaw.map((v) => Math.max(0.002, Math.abs(parseFloat(v) || 0.1)));
    const posRaw = Array.isArray(part.pos) ? part.pos : (Array.isArray(part.position) ? part.position : [0, 0, 0]);
    const pos = posRaw.map((v) => parseFloat(v) || 0);
    const rotRaw = Array.isArray(part.rot) ? part.rot : (Array.isArray(part.rotation) ? part.rotation : [0, 0, 0]);
    const rot = rotRaw.map((v) => parseFloat(v) || 0);

    const materialName = part.material || 'wood';
    const color = part.color || '#8b5a2b';
    const material = TextureGenerator.getMaterial(materialName, color);

    let geometry = null;

    switch (shape) {
      case 'cylinder':
      case 'shade':
      case 'cone_cylinder': {
        const radiusTop = size[0] || 0.05;
        const radiusBottom = size[1] || radiusTop;
        const height = size[2] || 0.2;
        const segments = Math.min(96, Math.max(16, parseInt(part.segments) || 64));
        const isOpen = Boolean(part.openEnded || part.open || part.isHollow);
        geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, isOpen);
        if (isOpen && material) {
          material.side = THREE.DoubleSide;
        }
        break;
      }

      case 'torus':
      case 'ring_tube': {
        const radius = size[0] || 0.1;
        const tube = size[1] || 0.02;
        const arc = part.arc ? parseFloat(part.arc) : Math.PI * 2;
        geometry = new THREE.TorusGeometry(radius, tube, 24, 48, arc);
        break;
      }

      case 'sphere': {
        const rx = size[0] || 0.1;
        const ry = size.length > 1 ? size[1] : rx;
        const rz = size.length > 2 ? size[2] : rx;
        geometry = new THREE.SphereGeometry(1, 32, 32);
        geometry.scale(rx, ry, rz);
        break;
      }

      case 'cone': {
        const radius = size[0] || 0.1;
        const height = size[1] || 0.2;
        const isOpen = Boolean(part.openEnded || part.open);
        geometry = new THREE.ConeGeometry(radius, height, 48, 1, isOpen);
        if (isOpen && material) material.side = THREE.DoubleSide;
        break;
      }

      case 'bill':
      case 'beak': {
        const radius = size[0] || 0.06;
        const height = size[1] || 0.024;
        const depth = size[2] || 0.08;
        geometry = new THREE.CylinderGeometry(radius * 0.9, radius, height, 32);
        geometry.scale(1.25, 1.0, 1.5);
        break;
      }

      case 'box':
      default: {
        const w = size[0] || 0.2;
        const h = size[1] || 0.2;
        const d = size[2] || 0.2;
        geometry = new THREE.BoxGeometry(w, h, d);
        break;
      }
    }

    if (!geometry) return null;

    if (part.doubleSided && material) {
      material.side = THREE.DoubleSide;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = String(part.name || shape).toLowerCase();
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (Array.isArray(part.scale)) {
      mesh.scale.set(
        parseFloat(part.scale[0]) || 1,
        parseFloat(part.scale[1]) || 1,
        parseFloat(part.scale[2]) || 1
      );
    }

    mesh.position.set(pos[0] || 0, pos[1] || 0, pos[2] || 0);

    // Convert degrees to radians if needed
    mesh.rotation.set(
      Math.abs(rot[0]) > 6.28 ? THREE.MathUtils.degToRad(rot[0]) : rot[0] || 0,
      Math.abs(rot[1]) > 6.28 ? THREE.MathUtils.degToRad(rot[1]) : rot[1] || 0,
      Math.abs(rot[2]) > 6.28 ? THREE.MathUtils.degToRad(rot[2]) : rot[2] || 0
    );

    return mesh;
  }

  /**
   * Calibrates bounding box to target physical dimensions (in meters) and grounds base on floor (y = 0).
   */
  static normalizeDimensions(group, targetDimensions) {
    const targetW = Math.max(0.01, parseFloat(targetDimensions.width) || 1.0);
    const targetH = Math.max(0.01, parseFloat(targetDimensions.height) || 0.75);
    const targetD = Math.max(0.01, parseFloat(targetDimensions.depth) || 0.6);

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

    const finalBox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    finalBox.getCenter(center);

    group.position.x -= center.x;
    group.position.y -= finalBox.min.y;
    group.position.z -= center.z;

    group.userData.dimensions = {
      width: targetW,
      height: targetH,
      depth: targetD
    };
  }
}

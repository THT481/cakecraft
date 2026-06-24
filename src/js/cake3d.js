// ============================================================
// CakeCraft — Realistic 3D Cake (Three.js ES modules)
// Features: shapes (round/square/heart), tiers, frosting color,
// text-on-cake, accessories, PBR materials + soft studio lighting.
// Crash-proof: if THREE fails, palettes & controls still work.
// ============================================================
import { $, formatVND } from './core.js';

// THREE + addons are attached to window by the page via importmap loader (see design.html)
function T() { return window.THREE; }

export const FROSTING_COLORS = [
  { name: 'Kem vani', hex: '#f3e3c8' },
  { name: 'Caramel', hex: '#c98f4f' },
  { name: 'Sô-cô-la', hex: '#6f4426' },
  { name: 'Cà phê sữa', hex: '#a9794f' },
  { name: 'Trà xanh', hex: '#9caf7e' },
  { name: 'Việt quất', hex: '#6b6a8f' },
  { name: 'Hồng trà', hex: '#b07d6a' },
  { name: 'Bạch kim', hex: '#e8e2d6' }
];

export const SHAPES = [
  { id: 'round', name: 'Tròn', icon: 'bi-circle', base: 250000 },
  { id: 'square', name: 'Vuông', icon: 'bi-square', base: 290000 },
  { id: 'heart', name: 'Trái tim', icon: 'bi-heart', base: 320000 }
];

// Pricing rules for a custom-designed cake
export const PRICING = { perExtraTier: 230000, textFee: 30000 };

// Compute the live price of the current design (needs ACCS loaded for accessory prices)
export function computePrice() {
  const shape = SHAPES.find(s => s.id === cakeDesign.shape) || SHAPES[0];
  let total = shape.base;
  total += Math.max(0, cakeDesign.tiers - 1) * PRICING.perExtraTier;
  if (cakeDesign.text && cakeDesign.text.trim()) total += PRICING.textFee;
  const accTotal = cakeDesign.accessories.reduce((sum, name) => {
    const a = ACCS.find(x => x.name === name);
    return sum + (a ? (a.price || 0) : 0);
  }, 0);
  return { base: shape.base, tiers: Math.max(0, cakeDesign.tiers - 1) * PRICING.perExtraTier,
           text: (cakeDesign.text && cakeDesign.text.trim()) ? PRICING.textFee : 0,
           accessories: accTotal, total: total + accTotal };
}

export const cakeDesign = {
  tiers: 2, frosting: '#f3e3c8', shape: 'round', text: '', accessories: []
};

let three = { ready: false };
let ACCS = [];
let font = null;
let changeCb = null;
export function onCakeChange(cb) { changeCb = cb; }
export function setAccessories(list) { ACCS = list; }

const hexToInt = (hex) => parseInt(hex.replace('#', ''), 16);

// ---------- procedural textures ----------
function frostingTexture(hex) {
  const THREE = T();
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = hex; ctx.fillRect(0, 0, 512, 512);
  // subtle spatula swirls
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    const y = Math.random() * 512;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + (Math.random() * 40 - 20), 340, y + (Math.random() * 40 - 20), 512, y);
    ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
    ctx.lineWidth = Math.random() * 8 + 2; ctx.stroke();
  }
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = Math.random() * 2 + 0.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`; ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function frostingBump(hex) {
  const THREE = T();
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = Math.random() * 3 + 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    const v = 128 + (Math.random() * 90 - 45);
    ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1);
  return tex;
}
function spongeTexture() {
  const THREE = T();
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e8c79a'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1100; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = Math.random() * 2.6 + 0.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    const shade = Math.random() > 0.5 ? '220,190,140' : '150,110,70';
    ctx.fillStyle = `rgba(${shade},${Math.random() * 0.4})`; ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 1);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// heart shape (extruded), centered on its visual centroid, sized so its half-width ≈ radius
function heartGeometry(THREE, radius, height) {
  const s = new THREE.Shape();
  // unit heart (built around origin), then scaled
  const k = radius / 1.1;
  s.moveTo(0, 0.5 * k);
  s.bezierCurveTo(0, 0.9 * k, -0.9 * k, 1.1 * k, -1.0 * k, 0.4 * k);
  s.bezierCurveTo(-1.1 * k, -0.1 * k, -0.4 * k, -0.55 * k, 0, -0.95 * k);
  s.bezierCurveTo(0.4 * k, -0.55 * k, 1.1 * k, -0.1 * k, 1.0 * k, 0.4 * k);
  s.bezierCurveTo(0.9 * k, 1.1 * k, 0, 0.9 * k, 0, 0.5 * k);
  const geo = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 48 });
  geo.rotateX(-Math.PI / 2);          // lay flat, height along +Y
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  // center on X/Z centroid, sit base at y=0
  geo.translate(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -(bb.max.z + bb.min.z) / 2);
  return geo;
}

// All tier geometries have their BASE at y=0 and rise +height.
function tierGeometry(THREE, shape, radius, height) {
  if (shape === 'square') {
    const side = radius * 1.75;
    let geo;
    if (THREE.RoundedBoxGeometry) geo = new THREE.RoundedBoxGeometry(side, height, side, 4, 0.1);
    else geo = new THREE.BoxGeometry(side, height, side);
    geo.translate(0, height / 2, 0);
    return geo;
  }
  if (shape === 'heart') return heartGeometry(THREE, radius, height); // already base at 0
  const geo = new THREE.CylinderGeometry(radius, radius * 1.015, height, 96);
  geo.translate(0, height / 2, 0);
  return geo;
}

// Returns true if point (x,z) in tier-local space lies safely inside the top surface,
// with `inset` margin so accessories don't hang off the edge.
function insideTop(shape, radius, x, z, inset = 0.45) {
  if (shape === 'round') return Math.hypot(x, z) <= radius - inset;
  if (shape === 'square') { const h = radius * 1.75 / 2 - inset; return Math.abs(x) <= h && Math.abs(z) <= h; }
  // heart: approximate safe zone as an ellipse around centroid (upper-mid of heart)
  if (shape === 'heart') {
    const rx = radius * 0.85 - inset, rz = radius * 0.7 - inset;
    return (x * x) / (rx * rx) + (z * z) / (rz * rz) <= 1;
  }
  return true;
}

export async function initCake3D() {
  const stage = $('#cakeStage');
  if (!stage) return;
  const THREE = T();
  if (!THREE) {
    stage.innerHTML = '<p style="color:var(--muted);text-align:center;padding:2rem">Không tải được thư viện 3D (kiểm tra kết nối mạng). Các tuỳ chọn bên phải vẫn dùng được.</p>';
    return;
  }

  const W = stage.clientWidth || 460, H = 380;
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
  camera.position.set(0, 2.4, 8.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  if ('toneMapping' in renderer) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; }
  stage.innerHTML = ''; stage.appendChild(renderer.domElement);

  // Environment for realistic reflections (PMREM from RoomEnvironment if available)
  let envMap = null;
  try {
    if (THREE.PMREMGenerator && THREE.RoomEnvironment) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      envMap = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
      scene.environment = envMap;
    }
  } catch (e) { /* ignore */ }

  // Lighting — soft studio
  scene.add(new THREE.AmbientLight(0xfff3e3, 0.5));
  const key = new THREE.DirectionalLight(0xfff1df, 1.5);
  key.position.set(5, 10, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1; key.shadow.camera.far = 40;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe9d9c4, 0.5); fill.position.set(-6, 4, -3); scene.add(fill);
  const rim = new THREE.SpotLight(0xffffff, 0.6, 30, Math.PI / 5, 0.4); rim.position.set(0, 8, -8); scene.add(rim);

  // soft ground shadow catcher
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(7, 64),
    new THREE.ShadowMaterial({ opacity: 0.18 })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
  scene.add(ground);

  // (Cake stand removed per design — cake floats on a soft shadow only)

  const cakeGroup = new THREE.Group(); scene.add(cakeGroup);

  let controls = null;
  if (THREE.OrbitControls) {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minDistance = 6; controls.maxDistance = 16;
    controls.maxPolarAngle = Math.PI / 1.9;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.9;
    controls.target.set(0, 1.2, 0);
  }

  three = { THREE, scene, camera, renderer, controls, cakeGroup, stage, H, ready: true,
            spongeTex: spongeTexture(), frostCache: {}, flames: [] };

  addEventListener('resize', () => {
    if (!three.ready) return;
    const w = stage.clientWidth || W;
    camera.aspect = w / H; camera.updateProjectionMatrix(); renderer.setSize(w, H);
  });

  // load font for text-on-cake (non-blocking)
  if (THREE.FontLoader) {
    try {
      new THREE.FontLoader().load(
        'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json',
        (f) => { font = f; updateCake3D(); }
      );
    } catch (e) { /* ignore */ }
  }

  (function loop() {
    requestAnimationFrame(loop);
    controls && controls.update();
    const t = Date.now();
    three.flames?.forEach(f => {
      f.material.emissiveIntensity = 1.1 + Math.sin(t / 90 + f.userData.seed) * 0.4;
      f.scale.y = 1.4 + Math.sin(t / 110 + f.userData.seed) * 0.18;
    });
    renderer.render(scene, camera);
  })();

  updateCake3D();
}

function frostMaterial(hex) {
  const THREE = three.THREE;
  if (!three.frostCache[hex]) {
    three.frostCache[hex] = new THREE.MeshPhysicalMaterial({
      color: hexToInt(hex),
      map: frostingTexture(hex),
      bumpMap: frostingBump(hex), bumpScale: 0.04,
      roughness: 0.5, metalness: 0.0,
      clearcoat: 0.35, clearcoatRoughness: 0.45,
      sheen: 0.4, sheenColor: new THREE.Color(0xffffff)
    });
  }
  return three.frostCache[hex];
}

export function updateCake3D() {
  if (!three.ready) return;
  const THREE = three.THREE;
  const g = three.cakeGroup;
  while (g.children.length) { const c = g.children.pop(); c.geometry?.dispose?.(); }
  three.flames = [];

  const tiers = cakeDesign.tiers;
  const shape = cakeDesign.shape;
  const frost = frostMaterial(cakeDesign.frosting);
  const spongeMat = new THREE.MeshStandardMaterial({ map: three.spongeTex, roughness: 0.9, metalness: 0 });
  const tierH = 1.0, gap = 0.02;

  let y = 0;
  let topRadius = 2.6;
  for (let i = 0; i < tiers; i++) {
    const radius = 2.7 - i * (1.8 / Math.max(tiers, 1));
    topRadius = radius;

    // frosted body (base at this tier's y)
    const geo = tierGeometry(THREE, shape, radius, tierH);
    const body = new THREE.Mesh(geo, frost);
    body.position.y = y; body.castShadow = true; body.receiveShadow = true;
    g.add(body);

    // round-only finishing: sponge cross-section band + piped beads
    if (shape === 'round') {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.004, radius * 1.004, tierH * 0.26, 96), spongeMat);
      band.position.y = y + tierH * 0.5; g.add(band);
      const reFrost = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.012, radius * 1.012, tierH * 0.34, 96), frost);
      reFrost.position.y = y + tierH * 0.78; g.add(reFrost);

      const beads = Math.max(16, Math.floor(radius * 11));
      for (let b = 0; b < beads; b++) {
        const a = (b / beads) * Math.PI * 2;
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), frost);
        bead.position.set(Math.cos(a) * radius, y + 0.11, Math.sin(a) * radius);
        bead.scale.set(1, 0.85, 1); bead.castShadow = true; g.add(bead);
        const sh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), frost);
        sh.position.set(Math.cos(a) * radius * 0.97, y + tierH - 0.02, Math.sin(a) * radius * 0.97);
        sh.scale.set(1, 0.7, 1); g.add(sh);
      }
    }

    y += tierH + gap;
  }
  const surfaceY = y;          // top surface height
  const topShape = shape;      // shape of the top surface (same for all tiers here)

  // ----- TEXT: laid flat on the top surface, front area, sized to footprint -----
  let textDepth = 0; // how much front space the text occupies (to keep accessories behind it)
  if (cakeDesign.text && cakeDesign.text.trim() && font && THREE.TextGeometry) {
    try {
      const txt = cakeDesign.text.slice(0, 18);
      const chars = Math.max(txt.length, 3);
      const targetW = topRadius * 1.55;
      let size = Math.min(0.4, targetW / (chars * 0.62));
      size = Math.max(size, 0.13);
      const tg = new THREE.TextGeometry(txt, {
        font, size, height: 0.04, curveSegments: 6,
        bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2
      });
      tg.computeBoundingBox();
      const tw = tg.boundingBox.max.x - tg.boundingBox.min.x;
      const textMat = new THREE.MeshPhysicalMaterial({ color: 0x5a3618, roughness: 0.3, metalness: 0.15, clearcoat: 0.7 });
      const mesh = new THREE.Mesh(tg, textMat);
      // flat on surface, reading toward the front (camera), placed in the front half
      const frontZ = topRadius * 0.42;
      mesh.geometry.translate(-tw / 2, 0, 0);
      mesh.rotation.x = -Math.PI / 2;          // lay flat
      mesh.position.set(0, surfaceY + 0.03, frontZ);
      mesh.castShadow = true;
      g.add(mesh);
      textDepth = size + 0.25;
    } catch (e) { /* skip */ }
  }

  // ----- ACCESSORIES: deliberate composition on the top surface -----
  placeAccessories(g, topShape, topRadius, surfaceY, textDepth);

  // auto-fit: frame the whole cake regardless of height
  const totalH = surfaceY;
  if (three.controls) {
    three.controls.target.set(0, totalH * 0.5, 0);
    const dist = 6.2 + totalH * 1.5;
    const dir = three.camera.position.clone().sub(three.controls.target).normalize();
    three.camera.position.copy(three.controls.target).add(dir.multiplyScalar(dist));
    three.camera.updateProjectionMatrix();
  }
  const tn = $('#tierNum'); if (tn) tn.textContent = tiers;
  if (changeCb) { try { changeCb(); } catch (e) {} }
}

// ---- Plan accessory positions so they sit ON the surface, grouped by type, never overlapping ----
function placeAccessories(g, shape, topRadius, surfaceY, textDepth) {
  const items = cakeDesign.accessories
    .map(name => ({ name, acc: ACCS.find(a => a.name === name) }))
    .filter(x => x.acc);
  if (!items.length) return;

  // group by type for a tidy composition
  const byType = { 'nến': [], 'topping': [], 'hoa decor': [], topper: [] };
  items.forEach(it => { (byType[it.acc.type] || (byType[it.acc.type] = [])).push(it); });

  // usable back-half center for tall items; ring radius scaled to top
  const ringR = (shape === 'square' ? topRadius * 0.95 : topRadius) * 0.62;
  const backZ = -topRadius * 0.18; // shift composition slightly back, leaving front for text

  // 1) Candles: neat row across the back-center
  const candles = byType['nến'] || [];
  candles.forEach((it, i) => {
    const n = candles.length;
    const span = Math.min(ringR * 1.4, (n - 1) * 0.5);
    const x = n === 1 ? 0 : (-span / 2 + (span * i) / (n - 1));
    let z = backZ - ringR * 0.35;
    if (!insideTop(shape, topRadius, x, z)) z = clampZ(shape, topRadius, x, z);
    g.add(buildAccessoryAt(it.acc.type, x, z, surfaceY, i));
  });

  // 2) Flowers: focal point — center/back
  const flowers = byType['hoa decor'] || [];
  flowers.forEach((it, i) => {
    const n = flowers.length;
    const a = (i / Math.max(n, 1)) * Math.PI - Math.PI / 2;
    let x = Math.cos(a) * ringR * 0.4, z = backZ + Math.sin(a) * ringR * 0.3;
    if (!insideTop(shape, topRadius, x, z)) { x *= 0.7; z *= 0.7; }
    g.add(buildAccessoryAt(it.acc.type, x, z, surfaceY, i));
  });

  // 3) Toppings (berries/macarons): tidy arc in the mid area
  const toppings = byType['topping'] || [];
  toppings.forEach((it, i) => {
    const n = toppings.length;
    const a = Math.PI + (n === 1 ? 0 : (i / (n - 1) - 0.5)) * Math.PI * 0.9; // arc across the back
    let x = Math.cos(a) * ringR, z = backZ + Math.sin(a) * ringR * 0.7;
    if (!insideTop(shape, topRadius, x, z)) { const f = 0.8; x *= f; z = clampZ(shape, topRadius, x, z); }
    g.add(buildAccessoryAt(it.acc.type, x, z, surfaceY, i));
  });

  // 4) Toppers (signs): stand at the very back-center
  const toppers = byType['topper'] || [];
  toppers.forEach((it, i) => {
    const n = toppers.length;
    const x = n === 1 ? 0 : (-0.5 + i / (n - 1)) * ringR;
    let z = backZ - ringR * 0.5;
    if (!insideTop(shape, topRadius, x, z)) z = clampZ(shape, topRadius, x, z);
    g.add(buildAccessoryAt(it.acc.type, x, z, surfaceY, i));
  });
}

function clampZ(shape, topRadius, x, z) {
  // pull z toward center until inside
  let zz = z;
  for (let k = 0; k < 12 && !insideTop(shape, topRadius, x, zz); k++) zz *= 0.85;
  return zz;
}

// Build ONE accessory positioned at (x, z) sitting on the given surface height.
function buildAccessoryAt(type, x, z, surfaceY, seed = 0) {
  const THREE = three.THREE;
  const grp = new THREE.Group();
  const baseY = surfaceY;

  if (type === 'nến') {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.85, 20),
      new THREE.MeshPhysicalMaterial({ color: 0xeae0cf, roughness: 0.4, clearcoat: 0.3 }));
    candle.position.set(x, baseY + 0.42, z); candle.castShadow = true; grp.add(candle);
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2018 }));
    wick.position.set(x, baseY + 0.88, z); grp.add(wick);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xff9a3c, emissiveIntensity: 1.2 }));
    flame.scale.y = 1.6; flame.position.set(x, baseY + 0.97, z); flame.userData.seed = seed * 3 + 1;
    grp.add(flame); three.flames.push(flame);
    const light = new THREE.PointLight(0xffb86b, 0.35, 2.5); light.position.set(x, baseY + 1.0, z); grp.add(light);
  } else if (type === 'hoa decor') {
    const petalMat = new THREE.MeshPhysicalMaterial({ color: 0xcf9b6a, roughness: 0.45, clearcoat: 0.3 });
    for (let p = 0; p < 6; p++) {
      const pe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), petalMat);
      const a = (p / 6) * Math.PI * 2;
      pe.scale.set(1, 0.4, 1.5);
      pe.position.set(x + Math.cos(a) * 0.15, baseY + 0.1, z + Math.sin(a) * 0.15);
      pe.rotation.y = a; pe.castShadow = true; grp.add(pe);
    }
    const ctr = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xc9a24b }));
    ctr.position.set(x, baseY + 0.13, z); grp.add(ctr);
  } else if (type === 'topping') {
    const berryMat = new THREE.MeshPhysicalMaterial({ color: 0x7a2438, roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.2 });
    // a small tidy cluster of 3 berries
    const offs = [[-0.16, 0], [0.16, 0], [0, 0.16]];
    offs.forEach(o => {
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 18), berryMat);
      berry.position.set(x + o[0], baseY + 0.15, z + o[1]); berry.castShadow = true; grp.add(berry);
    });
  } else { // topper sign
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.65, 10),
      new THREE.MeshStandardMaterial({ color: 0xf3ece0 }));
    stick.position.set(x, baseY + 0.32, z); grp.add(stick);
    const sign = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32),
      new THREE.MeshPhysicalMaterial({ color: 0xc9a24b, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.3, clearcoat: 0.5 }));
    sign.position.set(x, baseY + 0.72, z); grp.add(sign);
  }
  return grp;
}

// ---------- palettes / chips ----------
function accIcon(t) { return ({ topper: 'bi-bookmark-star', 'nến': 'bi-fire', 'hoa decor': 'bi-flower1', topping: 'bi-droplet-half' })[t] || 'bi-stars'; }

export function renderFrostingPalette() {
  const pal = $('#frostingPalette'); if (!pal) return;
  pal.innerHTML = FROSTING_COLORS.map(c =>
    `<button class="swatch ${cakeDesign.frosting === c.hex ? 'active' : ''}" data-hex="${c.hex}" title="${c.name}" style="background:${c.hex}"></button>`
  ).join('');
  pal.querySelectorAll('.swatch').forEach(s => s.addEventListener('click', () => {
    cakeDesign.frosting = s.dataset.hex; renderFrostingPalette(); updateCake3D();
  }));
}

export function renderShapePalette() {
  const pal = $('#shapePalette'); if (!pal) return;
  pal.innerHTML = SHAPES.map(s =>
    `<button class="shape-chip ${cakeDesign.shape === s.id ? 'active' : ''}" data-shape="${s.id}"><i class="bi ${s.icon}"></i> ${s.name}</button>`
  ).join('');
  pal.querySelectorAll('.shape-chip').forEach(ch => ch.addEventListener('click', () => {
    cakeDesign.shape = ch.dataset.shape; renderShapePalette(); updateCake3D();
  }));
}

export function renderAccessoryPalette() {
  const pal = $('#accessoryPalette'); if (!pal) return;
  if (ACCS.length === 0) { pal.innerHTML = `<p style="font-size:.85rem;color:var(--muted);margin:0">Đang tải phụ kiện…</p>`; return; }
  pal.innerHTML = ACCS.map(a => {
    const on = cakeDesign.accessories.includes(a.name);
    return `<button class="acc-chip ${on ? 'selected' : ''}" data-acc="${a.name}"><i class="bi ${accIcon(a.type)}"></i> ${a.name} <span style="opacity:.6">+${formatVND(a.price)}đ</span></button>`;
  }).join('');
  pal.querySelectorAll('.acc-chip').forEach(ch => ch.addEventListener('click', () => {
    const n = ch.dataset.acc, i = cakeDesign.accessories.indexOf(n);
    if (i >= 0) cakeDesign.accessories.splice(i, 1); else cakeDesign.accessories.push(n);
    renderAccessoryPalette(); updateCake3D();
  }));
}

// apply a full design object (used by AI auto-design), then refresh UI
export function applyDesign(d) {
  if (typeof d.tiers === 'number') cakeDesign.tiers = Math.max(1, Math.min(4, d.tiers));
  if (d.shape && SHAPES.some(s => s.id === d.shape)) cakeDesign.shape = d.shape;
  if (d.frosting) {
    const match = FROSTING_COLORS.find(c => c.name === d.frosting || c.hex === d.frosting);
    cakeDesign.frosting = match ? match.hex : (/^#/.test(d.frosting) ? d.frosting : cakeDesign.frosting);
  }
  if (typeof d.text === 'string') cakeDesign.text = d.text.slice(0, 18);
  if (Array.isArray(d.accessories)) {
    cakeDesign.accessories = d.accessories.filter(n => ACCS.some(a => a.name === n));
  }
  renderFrostingPalette(); renderShapePalette(); renderAccessoryPalette();
  const ti = $('#cakeText'); if (ti) ti.value = cakeDesign.text;
  updateCake3D();
}

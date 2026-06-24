// ============================================================
// CakeCraft — 2D Cake renderer (SVG, side view, soft gradients)
// Same API surface as the old 3D module so design.js stays simple.
// ============================================================
import { $, formatVND } from './core.js';

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
  { id: 'round', name: 'Tròn', icon: 'bi-circle' },
  { id: 'square', name: 'Vuông', icon: 'bi-square' },
  { id: 'heart', name: 'Trái tim', icon: 'bi-heart' }
];

// Base sizes: diameter (inch) → servings + base price (VND)
export const SIZES = [
  { id: 6,  label: '6" (12 phần)',  slices: 12, price: 250000 },
  { id: 8,  label: '8" (20 phần)',  slices: 20, price: 350000 },
  { id: 10, label: '10" (30 phần)', slices: 30, price: 470000 },
  { id: 12, label: '12" (40 phần)', slices: 40, price: 600000 }
];

export const FLAVORS = [
  { id: 'vani', name: 'Vani' }, { id: 'socola', name: 'Sô-cô-la' },
  { id: 'redvelvet', name: 'Red Velvet' }, { id: 'chanh', name: 'Chanh' },
  { id: 'carot', name: 'Cà rốt' }, { id: 'funfetti', name: 'Funfetti' },
  { id: 'dau', name: 'Dâu tây' }, { id: 'hanhnhan', name: 'Hạnh nhân' },
  { id: 'marble', name: 'Vân đá' }, { id: 'dua', name: 'Dừa' }
];

export const FROSTING_STYLES = [
  { id: 'buttercream', name: 'Buttercream', hex: '#f3e3c8' },
  { id: 'meringue', name: 'Meringue Thụy Sĩ', hex: '#efe6d2' },
  { id: 'creamcheese', name: 'Cream Cheese', hex: '#f0e2c4' },
  { id: 'fondant', name: 'Fondant', hex: '#e8e2d6' },
  { id: 'ganache', name: 'Ganache Sô-cô-la', hex: '#6f4426' },
  { id: 'naked', name: 'Naked (kem mỏng)', hex: '#e7c79a' }
];

export const PRICING = { textFee: 30000, perTierFlat: 0 };

export const TEXT_FONTS = [
  { id: 'serif', name: 'Cổ điển', css: "'Fraunces', Georgia, serif" },
  { id: 'script', name: 'Viết tay', css: "'Brush Script MT', 'Segoe Script', cursive" },
  { id: 'sans', name: 'Hiện đại', css: "'Quicksand', sans-serif" },
  { id: 'bold', name: 'Đậm vui', css: "'Arial Black', 'Quicksand', sans-serif" }
];
export const TEXT_POSITIONS = [
  { id: 'top', name: 'Trên mặt' },
  { id: 'center', name: 'Chính giữa' },
  { id: 'band', name: 'Trên thân bánh' }
];
export const BORDER_STYLES = [
  { id: 'pearls', name: 'Hạt ngọc' },
  { id: 'scallop', name: 'Vỏ sò' },
  { id: 'dots', name: 'Chấm bi' },
  { id: 'none', name: 'Trơn' }
];
export const TOPPING_COLORS = [
  { name: 'Đỏ mọng', hex: '#8e2c44' },
  { name: 'Hồng đào', hex: '#e08a8a' },
  { name: 'Vàng chanh', hex: '#e8c34a' },
  { name: 'Tím lavender', hex: '#9a86c4' },
  { name: 'Xanh mint', hex: '#7fc4a8' },
  { name: 'Cam', hex: '#e89a4a' },
  { name: 'Trắng ngọc', hex: '#f2ead8' }
];

function defaultTier(size = 8) {
  return { size, flavor: 'vani', style: 'buttercream' };
}

export const cakeDesign = {
  shape: 'round',
  tiers: [ defaultTier(12) ],
  frosting: '#f3e3c8',
  text: '',
  textFont: 'serif',
  textPos: 'top',
  border: 'pearls',
  toppingColor: '#8e2c44',
  candleNumber: 1,
  accessories: []
};

let ACCS = [];
let changeCb = null;
export function setAccessories(list) { ACCS = list; }
export function onCakeChange(cb) { changeCb = cb; }

export function sizeInfo(id) { return SIZES.find(s => s.id === id) || SIZES[1]; }
export function totalServings() { return cakeDesign.tiers.reduce((s, t) => s + sizeInfo(t.size).slices, 0); }
export function totalHeightInch() { return cakeDesign.tiers.length * 4; } // 4" per tier

export function computePrice() {
  let tiersTotal = 0;
  cakeDesign.tiers.forEach(t => { tiersTotal += sizeInfo(t.size).price; });
  // ganache/specialty frosting small surcharge per tier
  let styleTotal = 0;
  cakeDesign.tiers.forEach(t => { if (t.style === 'ganache' || t.style === 'fondant') styleTotal += 40000; });
  const text = (cakeDesign.text && cakeDesign.text.trim()) ? PRICING.textFee : 0;
  const accessories = cakeDesign.accessories.reduce((sum, name) => {
    const a = ACCS.find(x => x.name === name);
    // accessories priced per-tier if their tags say so could be added; flat here
    return sum + (a ? (a.price || 0) : 0);
  }, 0);
  return { tiers: tiersTotal, style: styleTotal, text, accessories,
           total: tiersTotal + styleTotal + text + accessories };
}

// sync the drawing's frosting color from the TOP tier's style
function syncFrosting() {
  const top = cakeDesign.tiers[cakeDesign.tiers.length - 1];
  const st = FROSTING_STYLES.find(s => s.id === top.style);
  if (st) cakeDesign.frosting = st.hex;
}

// ---------- color helpers ----------
function clamp(n){ return Math.max(0, Math.min(255, n)); }
function shade(hex, amt) {
  const h = hex.replace('#',''); const n = parseInt(h, 16);
  let r = (n>>16)&255, g = (n>>8)&255, b = n&255;
  r = clamp(Math.round(r + amt)); g = clamp(Math.round(g + amt)); b = clamp(Math.round(b + amt));
  return `#${((r<<16)|(g<<8)|b).toString(16).padStart(6,'0')}`;
}
function readableInk(hex) {
  const h = hex.replace('#',''); const n = parseInt(h,16);
  const r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  const L = (0.299*r+0.587*g+0.114*b);
  return L > 150 ? '#5a3618' : '#fff4e6';
}

let mounted = false;

export function initCake2D() {
  const stage = $('#cakeStage');
  if (!stage) return;
  mounted = true;
  updateCake2D();
}

// expose current SVG markup for the cart thumbnail (data URL)
export function getCakeSVGDataURL() {
  const svg = $('#cakeStage svg');
  if (!svg) return '';
  try {
    const xml = new XMLSerializer().serializeToString(svg);
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
  } catch (e) { return ''; }
}

// ---------- main render ----------
export function updateCake2D() {
  const stage = $('#cakeStage');
  if (!stage) return;

  syncFrosting();
  const W = 520, H = 420;
  const cx = W / 2;
  const baseY = 330;
  const tierCount = cakeDesign.tiers.length;
  const frost = cakeDesign.frosting;
  const shape = cakeDesign.shape;

  const ink = readableInk(frost);

  const defs = `
    <defs>
      <radialGradient id="plateShadow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="rgba(74,52,30,0.22)"/>
        <stop offset="1" stop-color="rgba(74,52,30,0)"/>
      </radialGradient>
      <linearGradient id="topperShine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="rgba(255,255,255,0.55)"/>
        <stop offset="0.5" stop-color="rgba(255,255,255,0)"/>
        <stop offset="1" stop-color="rgba(120,80,20,0.25)"/>
      </linearGradient>
    </defs>`;

  const ellH = 24;
  const tierH = Math.min(78, 170 / tierCount + 26);

  // width per tier derived from its diameter (bottom widest)
  const maxD = Math.max(...cakeDesign.tiers.map(t => t.size));
  const baseMaxW = shape === 'square' ? 350 : (shape === 'heart' ? 320 : 380);

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${defs}`;

  // ground shadow
  svg += `<ellipse cx="${cx}" cy="${baseY + 16}" rx="${baseMaxW/2 + 8}" ry="20" fill="url(#plateShadow)"/>`;

  // build tiers from bottom up
  const tiersArr = [];
  let curBottom = baseY;
  for (let i = 0; i < tierCount; i++) {
    const t = cakeDesign.tiers[i];
    const w = baseMaxW * (0.5 + 0.5 * (t.size / maxD));  // scale width by diameter
    const rx = w / 2;
    const topY = curBottom - tierH;
    const st = FROSTING_STYLES.find(s => s.id === t.style) || FROSTING_STYLES[0];
    tiersArr.push({ rx, topY, bottomY: curBottom, w, frost: st.hex });
    curBottom = topY;
  }
  for (let i = 0; i < tiersArr.length; i++) {
    const t = tiersArr[i];
    const f = t.frost;
    svg += drawTier(shape, cx, t.rx, t.topY, t.bottomY, ellH, f, f, shade(f,-26), shade(f,14), readableInk(f));
  }
  const topTier = tiersArr[tiersArr.length - 1];
  const topSurfaceY = topTier.topY, topW = topTier.w;

  // ---- text with chosen font + position ----
  if (cakeDesign.text && cakeDesign.text.trim()) {
    const txt = cakeDesign.text.trim().slice(0, 24);
    const fontObj = TEXT_FONTS.find(f => f.id === cakeDesign.textFont) || TEXT_FONTS[0];
    const maxW = topW * 0.82;
    const fontSize = Math.max(12, Math.min(26, maxW / (txt.length * 0.58)));
    let tx = cx, ty;
    if (cakeDesign.textPos === 'center') ty = topSurfaceY + ellH * 0.9;
    else if (cakeDesign.textPos === 'band') ty = topTier.bottomY - (topTier.bottomY - topSurfaceY) * 0.4;
    else ty = topSurfaceY + ellH * 0.15;  // top
    const tInk = readableInk(topTier.frost);
    svg += `<text x="${tx}" y="${ty}" text-anchor="middle"
      font-family="${fontObj.css}" font-weight="700" font-size="${fontSize.toFixed(1)}"
      fill="${tInk}" style="paint-order:stroke" stroke="${shade(topTier.frost,-14)}" stroke-width="0.6">${escapeXML(txt)}</text>`;
  }

  // ---- accessories on top surface (deliberate layout) ----
  svg += renderAccessories2D(cx, topSurfaceY, topW, ellH);

  svg += `</svg>`;
  stage.innerHTML = svg;

  const tn = $('#tierNum'); if (tn) tn.textContent = tierCount;
  if (changeCb) { try { changeCb(); } catch (e) {} }
}

function escapeXML(s){ return s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])); }

// draw one tier with a body+top that matches the chosen shape
function drawTier(shape, cx, rx, topY, bottomY, ellH, frost, side, sideDark, drip, ink) {
  let s = '';
  const left = cx - rx, right = cx + rx;
  const gid = 'g' + Math.round(cx + rx + topY * 7) + Math.round(rx * 3);
  s += `<defs>
    <linearGradient id="side${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(frost,10)}"/><stop offset="1" stop-color="${shade(frost,-26)}"/>
    </linearGradient>
    <linearGradient id="top${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(frost,30)}"/><stop offset="1" stop-color="${shade(frost,6)}"/>
    </linearGradient>
  </defs>`;

  if (shape === 'square') {
    // perspective box: top face is a parallelogram (back edge raised), front face is a rectangle
    const dx = rx * 0.32;            // horizontal skew for depth
    const dy = ellH * 1.1;           // vertical depth of the top face
    // top face (parallelogram)
    const tfl = `${left} ${topY}`, tfr = `${right} ${topY}`;
    const tbl = `${left + dx} ${topY - dy}`, tbr = `${right + dx} ${topY - dy}`;
    // right side face
    s += `<path d="M ${right} ${topY} L ${right + dx} ${topY - dy} L ${right + dx} ${bottomY - dy} L ${right} ${bottomY} Z" fill="${shade(frost,-22)}"/>`;
    // front face
    s += `<path d="M ${left} ${topY} L ${right} ${topY} L ${right} ${bottomY} L ${left} ${bottomY} Z" fill="url(#side${gid})"/>`;
    // front sheen
    s += `<rect x="${left + rx*0.12}" y="${topY + (bottomY-topY)*0.12}" width="${rx*0.34}" height="${(bottomY-topY)*0.7}" rx="6" fill="rgba(255,255,255,0.07)"/>`;
    // top face
    s += `<path d="M ${tfl} L ${tfr} L ${tbr} L ${tbl} Z" fill="url(#top${gid})" stroke="${shade(frost,-10)}" stroke-width="1"/>`;
    s += `<path d="M ${left+rx*0.16} ${topY-dy*0.18} L ${right-rx*0.1} ${topY-dy*0.18} L ${right+dx-rx*0.1} ${topY-dy*0.82} L ${left+dx+rx*0.16} ${topY-dy*0.82} Z" fill="none" stroke="${shade(frost,26)}" stroke-width="1.2" opacity="0.45"/>`;
    // bottom beads along front edge (straight line)
    const nb = Math.max(6, Math.round(rx/16));
    for (let b=0;b<=nb;b++){ const bx=left+(rx*2)*(b/nb); s+=`<circle cx="${bx}" cy="${bottomY}" r="5.5" fill="${shade(frost,18)}" stroke="${shade(frost,-12)}" stroke-width="0.5"/>`; }
    // top front edge beads
    for (let b=0;b<=nb;b++){ const bx=left+(rx*2)*(b/nb); s+=`<circle cx="${bx}" cy="${topY}" r="4.5" fill="${shade(frost,22)}" stroke="${shade(frost,-10)}" stroke-width="0.5"/>`; }
    return s;
  }

  if (shape === 'heart') {
    // heart body: front face is a heart outline extruded downward
    const hw = rx, hh = (bottomY - topY);
    const cy = topY;
    // heart top-face path (around center cx, surface at topY)
    const heartTop = (yy, scaleY=1) =>
      `M ${cx} ${yy + ellH*0.55*scaleY}
       C ${cx} ${yy - ellH*0.15*scaleY} ${cx-hw} ${yy - ellH*0.15*scaleY} ${cx-hw} ${yy + ellH*0.35*scaleY}
       C ${cx-hw} ${yy + ellH*0.9*scaleY} ${cx-hw*0.35} ${yy + ellH*1.1*scaleY} ${cx} ${yy + ellH*1.5*scaleY}
       C ${cx+hw*0.35} ${yy + ellH*1.1*scaleY} ${cx+hw} ${yy + ellH*0.9*scaleY} ${cx+hw} ${yy + ellH*0.35*scaleY}
       C ${cx+hw} ${yy - ellH*0.15*scaleY} ${cx} ${yy - ellH*0.15*scaleY} ${cx} ${yy + ellH*0.55*scaleY} Z`;
    // side wall: connect top heart outline down to bottom heart outline (front-facing band)
    s += `<path d="M ${cx-hw} ${cy + ellH*0.35} 
      C ${cx-hw} ${cy+ellH*0.9} ${cx-hw*0.35} ${cy+ellH*1.1} ${cx} ${cy+ellH*1.5}
      C ${cx+hw*0.35} ${cy+ellH*1.1} ${cx+hw} ${cy+ellH*0.9} ${cx+hw} ${cy+ellH*0.35}
      L ${cx+hw} ${cy+ellH*0.35 + hh}
      C ${cx+hw} ${cy+ellH*0.9+hh} ${cx+hw*0.35} ${cy+ellH*1.1+hh} ${cx} ${cy+ellH*1.5+hh}
      C ${cx-hw*0.35} ${cy+ellH*1.1+hh} ${cx-hw} ${cy+ellH*0.9+hh} ${cx-hw} ${cy+ellH*0.35+hh} Z"
      fill="url(#side${gid})"/>`;
    // top heart face
    s += `<path d="${heartTop(topY)}" fill="url(#top${gid})" stroke="${shade(frost,-10)}" stroke-width="1"/>`;
    s += `<path d="${heartTop(topY+ellH*0.18, 0.7)}" fill="none" stroke="${shade(frost,26)}" stroke-width="1.2" opacity="0.4"/>`;
    // beads along the heart bottom edge
    const npts = 18;
    for (let i=0;i<=npts;i++){
      const tt=i/npts, a=Math.PI*(1-tt);
      // approximate along the two lobes/point
      const bx = cx + Math.cos(a)*hw*0.92;
      const by = cy + hh + ellH*0.5 + Math.sin(a)*ellH*0.7;
      s += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="5" fill="${shade(frost,18)}" stroke="${shade(frost,-12)}" stroke-width="0.5"/>`;
    }
    return s;
  }

  // ---- round (default) ----
  s += `<path d="M ${left} ${topY}
    L ${left} ${bottomY}
    A ${rx} ${ellH} 0 0 0 ${right} ${bottomY}
    L ${right} ${topY} Z" fill="url(#side${gid})"/>`;
  s += `<ellipse cx="${cx - rx*0.35}" cy="${(topY+bottomY)/2}" rx="${rx*0.22}" ry="${(bottomY-topY)/2*0.8}" fill="rgba(255,255,255,0.08)"/>`;
  s += `<ellipse cx="${cx}" cy="${topY}" rx="${rx}" ry="${ellH}" fill="url(#top${gid})" stroke="${shade(frost,-10)}" stroke-width="1"/>`;
  s += `<ellipse cx="${cx}" cy="${topY}" rx="${rx*0.86}" ry="${ellH*0.82}" fill="none" stroke="${shade(frost,26)}" stroke-width="1.5" opacity="0.5"/>`;
  s += scallopDrip(cx, rx, topY, ellH, drip, shade(frost,-8));
  s += borderBeads(shape, cx, rx, topY, bottomY, ellH, frost);
  return s;
}

// border decoration around the tier edges, per chosen style
function borderBeads(shape, cx, rx, topY, bottomY, ellH, frost) {
  const style = cakeDesign.border || 'pearls';
  if (style === 'none') return '';
  let s = '';
  const n = Math.max(10, Math.round(rx / 12));
  const drawAt = (bx, yy, isTop) => {
    const r = isTop ? 4.5 : 6;
    if (style === 'dots') return `<circle cx="${bx}" cy="${yy}" r="${r*0.6}" fill="${shade(frost,-18)}"/>`;
    if (style === 'scallop') return `<path d="M ${bx-r} ${yy} a ${r} ${r} 0 0 1 ${2*r} 0" fill="${shade(frost,16)}" stroke="${shade(frost,-12)}" stroke-width="0.4"/>`;
    return `<circle cx="${bx}" cy="${yy}" r="${r}" fill="${shade(frost, isTop?22:18)}" stroke="${shade(frost,-12)}" stroke-width="0.5"/>`; // pearls
  };
  for (let b = 0; b <= n; b++) {
    const ang = Math.PI * (b / n);
    const bx = cx - rx * Math.cos(ang);
    s += drawAt(bx, bottomY + Math.sin(ang) * ellH, false);
    s += drawAt(bx, topY + Math.sin(ang) * ellH, true);
  }
  return s;
}

function scallopDrip(cx, rx, topY, ellH, drip, edge) {
  const left = cx - rx, n = Math.max(7, Math.round(rx/18));
  let d = `M ${left} ${topY}`;
  for (let i = 0; i < n; i++) {
    const x0 = left + (rx*2)*(i/n);
    const x1 = left + (rx*2)*((i+1)/n);
    const mid = (x0+x1)/2;
    const dep = 14 + (i%2)*10;
    d += ` Q ${mid} ${topY+dep} ${x1} ${topY+ (Math.sin((i+1)/n*Math.PI)*4)}`;
  }
  d += ` Z`;
  return `<path d="${d}" fill="${drip}" opacity="0.9" stroke="${edge}" stroke-width="0.5"/>`;
}

// ---- orderly accessory layout on the top surface ----
function renderAccessories2D(cx, topY, topW, ellH) {
  const items = cakeDesign.accessories.map(n => ACCS.find(a => a.name === n)).filter(Boolean);
  if (!items.length) return '';

  // priority: focal items in the middle, fillers spread symmetrically
  const order = { topper: 0, 'hoa decor': 1, 'nến': 2, topping: 3 };
  items.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));

  const n = items.length;
  const surfaceCenterY = topY + ellH * 0.55;   // visual middle of the top face
  const spread = Math.min(topW * 0.62, 60 + n * 26);
  let s = '';

  // symmetric positions around center: 0, -1, +1, -2, +2 ...
  const slots = [];
  slots.push(0);
  for (let k = 1; slots.length < n; k++) { slots.push(-k); slots.push(k); }
  slots.length = n;

  // pair item i with slot; sort slots so center gets the first (focal) item
  const ordered = slots.slice().sort((a,b)=>Math.abs(a)-Math.abs(b));
  items.forEach((acc, i) => {
    const slot = ordered[i];
    const frac = n === 1 ? 0 : slot / Math.max(1, Math.ceil((n-1)/2)); // -1..1
    const x = cx + frac * (spread / 2);
    // items further from center sit slightly higher (back) for a gentle arc
    const y = surfaceCenterY - Math.abs(frac) * ellH * 0.5;
    const scale = 1.05 - Math.abs(frac) * 0.12;
    s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(2)})">${accArt(acc.type, acc, i)}</g>`;
  });
  return s;
}

// All accessory art is drawn around local origin (0,0) = where it meets the surface.
function accArt(type, acc, idx = 0) {
  if (type === 'nến') {
    const n = (acc?.name || '').toLowerCase();
    if (n.includes('số')) return numberCandleArt(idx);
    if (n.includes('lấp lánh') || n.includes('sparkler')) return sparklerArt(idx);
    return candleArt(idx);
  }
  if (type === 'hoa decor') return flowerArt();
  if (type === 'topping') return berriesArt(cakeDesign.toppingColor || '#8e2c44');
  return topperArt(acc ? acc.name : '');
}

function flameSVG(delay) {
  return `<g class="flame" style="animation:flameFlicker 0.5s ease-in-out ${delay}s infinite alternate">
      <ellipse cx="0" cy="-55" rx="6" ry="12" fill="#ffd86b"/>
      <ellipse cx="0" cy="-53" rx="3.4" ry="8" fill="#ff9a3c"/>
      <ellipse cx="0" cy="-51" rx="1.5" ry="4" fill="#fff2c2"/>
    </g>
    <circle cx="0" cy="-54" r="16" fill="#ffcf6b" opacity="0.16"><animate attributeName="opacity" values="0.10;0.22;0.10" dur="0.8s" repeatCount="indefinite"/></circle>`;
}

function candleArt(idx = 0) {
  // clean candle with neat horizontal stripes + an animated flickering flame
  const delay = (idx % 4) * 0.18;
  let stripes = '';
  for (let i = 0; i < 4; i++) {
    stripes += `<rect x="-4" y="${-36 + i*10}" width="8" height="4" fill="#e07a8a" opacity="0.65"/>`;
  }
  return `<g>
    <ellipse cx="0" cy="3" rx="7" ry="3" fill="rgba(74,52,30,0.18)"/>
    <rect x="-4" y="-40" width="8" height="44" rx="3" fill="#fbf3e6" stroke="#e3d3ba" stroke-width="0.8"/>
    <clipPath id="cclip${idx}"><rect x="-4" y="-40" width="8" height="44" rx="3"/></clipPath>
    <g clip-path="url(#cclip${idx})">${stripes}</g>
    <line x1="0" y1="-40" x2="0" y2="-46" stroke="#5a4632" stroke-width="1.4"/>
    ${flameSVG(delay)}
  </g>`;
}

// number-shaped candle (e.g. "5" or "25"), from cakeDesign.candleNumber
function numberCandleArt(idx = 0) {
  const delay = (idx % 4) * 0.18;
  const num = String(cakeDesign.candleNumber ?? 1).slice(0, 2);
  const fsz = num.length > 1 ? 38 : 46;
  const topY = -fsz * 0.78;          // approx top of the digits
  const wickX = num.length > 1 ? -9 : 0;
  return `<g>
    <ellipse cx="0" cy="3" rx="${num.length>1?13:9}" ry="3" fill="rgba(74,52,30,0.18)"/>
    <text x="0" y="0" text-anchor="middle"
      font-family="Arial Black, Quicksand, sans-serif" font-weight="900" font-size="${fsz}"
      fill="#ff9ec0" stroke="#e07a8a" stroke-width="1.5" paint-order="stroke"
      style="dominant-baseline:alphabetic">${num}</text>
    <line x1="${wickX}" y1="${topY}" x2="${wickX}" y2="${topY-7}" stroke="#5a4632" stroke-width="1.4"/>
    <g class="flame" style="animation:flameFlicker 0.5s ease-in-out ${delay}s infinite alternate">
      <ellipse cx="${wickX}" cy="${topY-16}" rx="5" ry="10" fill="#ffd86b"/>
      <ellipse cx="${wickX}" cy="${topY-14}" rx="2.8" ry="6.5" fill="#ff9a3c"/>
      <ellipse cx="${wickX}" cy="${topY-12}" rx="1.2" ry="3.2" fill="#fff2c2"/>
    </g>
    <circle cx="${wickX}" cy="${topY-15}" r="13" fill="#ffcf6b" opacity="0.15"><animate attributeName="opacity" values="0.1;0.2;0.1" dur="0.8s" repeatCount="indefinite"/></circle>
  </g>`;
}

// sparkler: thin gold rod with radiating sparks
function sparklerArt(idx = 0) {
  let sparks = '';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const len = 6 + (i % 3) * 4;
    const x2 = Math.cos(a) * len, y2 = -52 + Math.sin(a) * len;
    sparks += `<line x1="0" y1="-52" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${i%2?'#ffd86b':'#fff2c2'}" stroke-width="1.4" stroke-linecap="round"/>`;
    sparks += `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="1.4" fill="#fff6cf"/>`;
  }
  return `<g>
    <ellipse cx="0" cy="3" rx="5" ry="2.5" fill="rgba(74,52,30,0.18)"/>
    <line x1="0" y1="2" x2="0" y2="-50" stroke="#9a8a6a" stroke-width="2"/>
    <g class="flame" style="animation:flameFlicker 0.35s ease-in-out ${(idx%4)*0.1}s infinite alternate">${sparks}</g>
    <circle cx="0" cy="-52" r="18" fill="#ffe9a8" opacity="0.18"><animate attributeName="opacity" values="0.12;0.26;0.12" dur="0.5s" repeatCount="indefinite"/></circle>
  </g>`;
}

function flowerArt() {
  // layered buttercream rose
  let petals = '';
  const outer = '#d99a5b', inner = '#e8b277';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = Math.cos(a) * 13, py = Math.sin(a) * 8 - 6;
    petals += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="9" ry="6" transform="rotate(${(a*180/Math.PI).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})" fill="${outer}" stroke="#b5803f" stroke-width="0.6"/>`;
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const px = Math.cos(a) * 7, py = Math.sin(a) * 4.5 - 6;
    petals += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="6" ry="4" transform="rotate(${(a*180/Math.PI).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})" fill="${inner}"/>`;
  }
  return `<g>
    <ellipse cx="0" cy="2" rx="13" ry="4" fill="rgba(74,52,30,0.15)"/>
    ${petals}
    <circle cx="0" cy="-6" r="4.5" fill="#c9a24b"/>
  </g>`;
}

function berriesArt(color) {
  // glossy cluster of berries in the chosen topping color
  const mid = color || '#8e2c44';
  const dark = shade(mid, -28), light = shade(mid, 18);
  const berry = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r*0.35}" cy="${y - r*0.35}" r="${r*0.28}" fill="rgba(255,255,255,0.55)"/>`;
  return `<g>
    <ellipse cx="0" cy="3" rx="16" ry="4" fill="rgba(74,52,30,0.16)"/>
    ${berry(-9, -2, 7, dark)}
    ${berry(9, -1, 7, light)}
    ${berry(0, -9, 7.5, mid)}
    ${berry(2, 1, 6, dark)}
    <path d="M -2 -15 q 3 -4 7 -2" fill="none" stroke="#5a7d3a" stroke-width="1.5"/>
  </g>`;
}

function topperArt(name = '') {
  const n = name.toLowerCase();
  const stick = `<line x1="0" y1="2" x2="0" y2="-26" stroke="#efe4d2" stroke-width="2.5"/>`;
  // dinosaur topper
  if (n.includes('khủng long') || n.includes('dino')) {
    return `<g>${stick}
      <g transform="translate(0 -42)">
        <ellipse cx="0" cy="6" rx="13" ry="9" fill="#6fae5a"/>
        <path d="M -10 2 q -6 -2 -9 4 q 7 1 9 -1 z" fill="#6fae5a"/>
        <circle cx="8" cy="-2" r="8" fill="#7cbf66"/>
        <path d="M -2 -8 l 3 -5 3 5 z M 4 -9 l 3 -5 3 5 z" fill="#4f8a3f"/>
        <circle cx="10" cy="-3" r="1.8" fill="#243018"/>
      </g></g>`;
  }
  // birthday star topper
  if (n.includes('happy birthday') || n.includes('sinh nh')) {
    return `<g>${stick}
      <path transform="translate(0 -42)" d="M 0 -14 l 4 9 10 1 -7.5 6.6 2 9.8 -8.5-5 -8.5 5 2-9.8 -7.5-6.6 10-1 z"
        fill="#f4c84a" stroke="#c79a2e" stroke-width="1.2"/>
      <text x="0" y="-38" text-anchor="middle" font-family="Quicksand,sans-serif" font-weight="700" font-size="7" fill="#7a4e24">HBD</text>
    </g>`;
  }
  // congrats / chúc mừng — ribbon heart
  if (n.includes('chúc mừng') || n.includes('chuc mung') || n.includes('congrat')) {
    return `<g>${stick}
      <g transform="translate(0 -42)">
        <path d="M 0 4 C -3 -4 -13 -3 -13 4 C -13 10 -5 13 0 18 C 5 13 13 10 13 4 C 13 -3 3 -4 0 4 Z" fill="#d96a8a" stroke="#b54a6a" stroke-width="1"/>
        <path d="M -13 6 l -7 5 5 1 z M 13 6 l 7 5 -5 1 z" fill="#e88aa4"/>
      </g></g>`;
  }
  // default gold medallion
  return `<g>${stick}
    <circle cx="0" cy="-40" r="14" fill="#d9b04e" stroke="#a87f2e" stroke-width="1.4"/>
    <circle cx="0" cy="-40" r="14" fill="url(#topperShine)"/>
    <path d="M 0 -49 l 2.6 5.6 6.2 .7 -4.6 4.3 1.2 6.1 -5.4-3 -5.4 3 1.2-6.1 -4.6-4.3 6.2-.7 z" fill="#fff6e6"/>
  </g>`;
}

// ---------- palettes & helpers ----------
function accIcon(t) { return ({ topper: 'bi-stars', 'nến': 'bi-fire', 'hoa decor': 'bi-flower2', topping: 'bi-circle-fill' })[t] || 'bi-stars'; }

// tier management (used by the stepper UI in design.js)
export function addTier() {
  if (cakeDesign.tiers.length >= 4) return false;
  // new top tier is smaller than current top
  const top = cakeDesign.tiers[cakeDesign.tiers.length - 1];
  const idx = SIZES.findIndex(s => s.id === top.size);
  const smaller = SIZES[Math.max(0, idx - 1)];
  cakeDesign.tiers.push(defaultTier(smaller.id));
  updateCake2D(); return true;
}
export function removeTier(i) {
  if (cakeDesign.tiers.length <= 1) return false;
  cakeDesign.tiers.splice(i, 1); updateCake2D(); return true;
}
export function setTier(i, patch) {
  if (!cakeDesign.tiers[i]) return;
  Object.assign(cakeDesign.tiers[i], patch);
  updateCake2D();
}
export function setShape(id) { if (SHAPES.some(s => s.id === id)) { cakeDesign.shape = id; updateCake2D(); } }
export function setText(t) { cakeDesign.text = (t || '').slice(0, 24); updateCake2D(); }
export function setTextFont(id) { if (TEXT_FONTS.some(f=>f.id===id)) { cakeDesign.textFont = id; updateCake2D(); } }
export function setTextPos(id) { if (TEXT_POSITIONS.some(p=>p.id===id)) { cakeDesign.textPos = id; updateCake2D(); } }
export function setBorder(id) { if (BORDER_STYLES.some(b=>b.id===id)) { cakeDesign.border = id; updateCake2D(); } }
export function setToppingColor(hex) { cakeDesign.toppingColor = hex; updateCake2D(); }
export function setCandleNumber(n) { const v = parseInt(n); if (!isNaN(v)) { cakeDesign.candleNumber = Math.max(0, Math.min(99, v)); updateCake2D(); } }
export function toggleAccessory(name) {
  const i = cakeDesign.accessories.indexOf(name);
  if (i >= 0) cakeDesign.accessories.splice(i, 1); else cakeDesign.accessories.push(name);
  updateCake2D();
}

export function renderShapePalette() {
  const pal = $('#shapePalette'); if (!pal) return;
  pal.innerHTML = SHAPES.map(s =>
    `<button class="shape-tile ${cakeDesign.shape === s.id ? 'active' : ''}" data-shape="${s.id}">
      <i class="bi ${s.icon}"></i><span>${s.name}</span>
    </button>`
  ).join('');
  pal.querySelectorAll('.shape-tile').forEach(ch => ch.addEventListener('click', () => setShape(ch.dataset.shape)));
}

export function renderAccessoryPalette() {
  const pal = $('#accessoryPalette'); if (!pal) return;
  if (ACCS.length === 0) { pal.innerHTML = `<p style="font-size:.85rem;color:var(--muted);margin:0">Đang tải phụ kiện…</p>`; return; }
  pal.innerHTML = ACCS.map(a => {
    const on = cakeDesign.accessories.includes(a.name);
    return `<div class="acc-card ${on ? 'on' : ''}" data-acc="${a.name}">
      <div class="acc-card-ico"><i class="bi ${accIcon(a.type)}"></i></div>
      <div class="acc-card-info">
        <div class="acc-card-name">${a.name}</div>
        <div class="acc-card-desc">${a.tags ? String(a.tags).split(',')[0] : a.type}</div>
        <div class="acc-card-price">+${formatVND(a.price)}đ</div>
      </div>
    </div>`;
  }).join('');
  pal.querySelectorAll('.acc-card').forEach(card => card.addEventListener('click', () => { toggleAccessory(card.dataset.acc); renderAccessoryPalette(); }));
}

export function applyDesign(d) {
  if (d.shape && SHAPES.some(s => s.id === d.shape)) cakeDesign.shape = d.shape;
  // tiers: accept a number (build N tiers) or an array of {size,flavor,style}
  if (Array.isArray(d.tiers) && d.tiers.length) {
    cakeDesign.tiers = d.tiers.slice(0, 4).map(t => ({
      size: SIZES.some(s => s.id === t.size) ? t.size : 8,
      flavor: FLAVORS.some(f => f.id === t.flavor) ? t.flavor : 'vani',
      style: FROSTING_STYLES.some(s => s.id === t.style) ? t.style : 'buttercream'
    }));
  } else if (typeof d.tiers === 'number') {
    const n = Math.max(1, Math.min(4, d.tiers));
    cakeDesign.tiers = Array.from({ length: n }, (_, i) => defaultTier(SIZES[Math.max(0, 3 - i)].id));
    if (d.flavor) cakeDesign.tiers.forEach(t => { if (FLAVORS.some(f => f.id === d.flavor)) t.flavor = d.flavor; });
    if (d.style) cakeDesign.tiers.forEach(t => { if (FROSTING_STYLES.some(s => s.id === d.style)) t.style = d.style; });
  }
  if (typeof d.text === 'string') cakeDesign.text = d.text.slice(0, 24);
  if (d.textFont && TEXT_FONTS.some(f=>f.id===d.textFont)) cakeDesign.textFont = d.textFont;
  if (d.textPos && TEXT_POSITIONS.some(p=>p.id===d.textPos)) cakeDesign.textPos = d.textPos;
  if (d.border && BORDER_STYLES.some(b=>b.id===d.border)) cakeDesign.border = d.border;
  if (d.toppingColor) cakeDesign.toppingColor = d.toppingColor;
  if (Array.isArray(d.accessories)) cakeDesign.accessories = d.accessories.filter(n => ACCS.some(a => a.name === n));
  updateCake2D();
}

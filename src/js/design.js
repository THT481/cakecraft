// ============================================================
// Design Studio — multi-step "Build Your Dream Cake"
// ============================================================
import { injectChrome } from './partials.js';
import { animateCakeIn, stepTransition } from './motion.js';
import { wireShared, loadCatalog, ensureSeed, onAccessories, addCustomCakeToCart, ACCESSORIES, showToast, formatVND, $, $$ } from './core.js';
import {
  initCake2D, updateCake2D, getCakeSVGDataURL,
  renderShapePalette, renderAccessoryPalette,
  setAccessories, applyDesign, computePrice, onCakeChange,
  cakeDesign, SHAPES, SIZES, FLAVORS, FROSTING_STYLES,
  TEXT_FONTS, TEXT_POSITIONS, BORDER_STYLES, TOPPING_COLORS,
  addTier, removeTier, setTier, setShape, setText, toggleAccessory,
  setTextFont, setTextPos, setBorder, setToppingColor, setCandleNumber,
  sizeInfo, totalServings, totalHeightInch
} from './cake2d.js';

injectChrome();
wireShared();
loadCatalog();
ensureSeed();

const GEMINI_API_KEY = 'AIzaSyAz3ElYkrzRW795QaI_Kx1DVqMNFNUqFEw';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt, maxTokens = 600) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: maxTokens, responseMimeType: 'application/json' } })
  });
  if (!res.ok) throw new Error('API ' + res.status);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

const STEPS = ['Tầng bánh', 'Trang trí', 'Giao hàng', 'Xác nhận'];
let step = 0;
let lastStepDir = 1;
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const delivery = { date: '', time: '', name: '', phone: '', address: '', note: '' };

initCake2D();
onCakeChange(refreshPreview);
onAccessories((list) => { setAccessories(list); if (step === 1) renderStep(); });

// ---------- preview (left column) ----------
function refreshPreview() {
  const shapeName = (SHAPES.find(s => s.id === cakeDesign.shape) || {}).name || '';
  $('#previewShape') && ($('#previewShape').textContent = shapeName);
  $('#previewHeight') && ($('#previewHeight').textContent = totalHeightInch() + '"');
  $('#previewYield') && ($('#previewYield').textContent = totalServings() + ' phần');
  $('#previewServe') && ($('#previewServe').textContent = totalServings());
  const p = computePrice();
  $('#previewPrice') && ($('#previewPrice').textContent = formatVND(p.total) + 'đ');
  animateCakeIn('#cakeStage');
}

// ---------- stepper header ----------
function renderStepper() {
  const el = $('#stepper'); if (!el) return;
  el.innerHTML = STEPS.map((s, i) => {
    const state = i < step ? 'done' : (i === step ? 'active' : '');
    const icon = i < step ? 'bi-check-lg' : ['bi-layers','bi-stars','bi-truck','bi-bag-check'][i];
    return `<div class="step-node ${state}" data-step="${i}">
      <div class="step-dot"><i class="bi ${icon}"></i></div>
      <div class="step-label">${s}</div>
    </div>${i < STEPS.length-1 ? '<div class="step-line '+(i<step?'done':'')+'"></div>' : ''}`;
  }).join('');
  el.querySelectorAll('.step-node').forEach(n => n.addEventListener('click', () => {
    const target = +n.dataset.step;
    if (target <= step) { step = target; renderStep(); }   // can go back via header
  }));
}

// ---------- step body (right column) ----------
function renderStep() {
  renderStepper();
  const panel = $('#stepPanel'); if (!panel) return;
  if (step === 0) panel.innerHTML = stepTiers();
  else if (step === 1) panel.innerHTML = stepDecor();
  else if (step === 2) panel.innerHTML = stepDelivery();
  else panel.innerHTML = stepReview();

  // wire after injecting
  if (step === 0) wireTiers();
  else if (step === 1) wireDecor();
  else if (step === 2) wireDelivery();
  else wireReview();

  // nav buttons
  $('#prevBtn').style.visibility = step === 0 ? 'hidden' : 'visible';
  $('#nextBtn').innerHTML = step === STEPS.length - 1
    ? '<i class="bi bi-bag-plus"></i> Thêm vào giỏ'
    : 'Bước tiếp <i class="bi bi-arrow-right"></i>';
  stepTransition(panel, lastStepDir);
  refreshPreview();
}

// ===== STEP 1: TIERS =====
function stepTiers() {
  const shapeTiles = SHAPES.map(s =>
    `<button class="shape-tile ${cakeDesign.shape===s.id?'active':''}" data-shape="${s.id}"><i class="bi ${s.icon}"></i><span>${s.name}</span></button>`
  ).join('');
  const tiersHTML = cakeDesign.tiers.map((t, i) => tierCard(t, i)).join('');
  return `
    <div class="panel-card ai-card">
      <h3 class="panel-title"><i class="bi bi-magic"></i> Để AI dựng giúp</h3>
      <p class="panel-sub">Tả ý tưởng, AI sẽ tự chọn hình, tầng, kích thước, vị, kem, chữ và phụ kiện — bạn tinh chỉnh sau.</p>
      <div class="ai-row">
        <input class="input-c" id="designIdea" placeholder="VD: sinh nhật bé gái 6 tuổi, chủ đề khu vườn cổ tích...">
        <button class="btn-c btn-gold-c" id="aiDesignBtn"><i class="bi bi-stars"></i> Dựng</button>
      </div>
      <p class="ai-note" id="aiNote" style="display:none"></p>
    </div>
    <div class="panel-card">
      <h3 class="panel-title">Nền bánh</h3>
      <label class="field-label">Hình dáng tổng thể</label>
      <div class="shape-row">${shapeTiles}</div>
    </div>
    <div id="tiersWrap">${tiersHTML}</div>
    ${cakeDesign.tiers.length < 4 ? `<button class="add-tier-btn" id="addTierBtn"><i class="bi bi-plus-circle"></i> Thêm tầng (${cakeDesign.tiers.length}/4)</button>` : ''}`;
}
function tierCard(t, i) {
  const sizes = SIZES.map(s => `<button class="pill ${t.size===s.id?'active':''}" data-tier="${i}" data-size="${s.id}">${s.label}</button>`).join('');
  const flavors = FLAVORS.map(f => `<button class="chip-sm ${t.flavor===f.id?'active':''}" data-tier="${i}" data-flavor="${f.id}">${f.name}</button>`).join('');
  const styles = FROSTING_STYLES.map(s => `<button class="chip-sm ${t.style===s.id?'active':''}" data-tier="${i}" data-style="${s.id}">${s.name}</button>`).join('');
  return `
    <div class="panel-card tier-card">
      <div class="tier-head">
        <div class="tier-badge">${i+1}</div>
        <div><div class="tier-name">Tầng ${i+1}</div><div class="tier-sub">${sizeInfo(t.size).id}" đường kính · ${sizeInfo(t.size).slices} phần</div></div>
        ${cakeDesign.tiers.length>1 ? `<button class="tier-remove" data-remove="${i}" title="Xoá tầng"><i class="bi bi-x-lg"></i></button>` : ''}
      </div>
      <label class="field-label">Kích thước</label>
      <div class="pill-row">${sizes}</div>
      <div class="two-col">
        <div><label class="field-label">Vị bánh</label><div class="chip-wrap">${flavors}</div></div>
        <div><label class="field-label">Kiểu kem</label><div class="chip-wrap">${styles}</div></div>
      </div>
    </div>`;
}
function wireTiers() {
  $('#aiDesignBtn')?.addEventListener('click', handleAIDesign);
  $$('#stepPanel .shape-tile').forEach(b => b.addEventListener('click', () => { setShape(b.dataset.shape); renderStep(); }));
  $('#addTierBtn')?.addEventListener('click', () => { addTier(); renderStep(); });
  $$('#stepPanel [data-remove]').forEach(b => b.addEventListener('click', () => { removeTier(+b.dataset.remove); renderStep(); }));
  $$('#stepPanel .pill[data-size]').forEach(b => b.addEventListener('click', () => { setTier(+b.dataset.tier, { size: +b.dataset.size }); renderStep(); }));
  $$('#stepPanel [data-flavor]').forEach(b => b.addEventListener('click', () => { setTier(+b.dataset.tier, { flavor: b.dataset.flavor }); renderStep(); }));
  $$('#stepPanel [data-style]').forEach(b => b.addEventListener('click', () => { setTier(+b.dataset.tier, { style: b.dataset.style }); renderStep(); }));
}

// ===== STEP 2: DECOR =====
function stepDecor() {
  const cards = ACCESSORIES.length ? ACCESSORIES.map(a => {
    const on = cakeDesign.accessories.includes(a.name);
    return `<div class="addon ${on?'on':''}" data-acc="${esc(a.name)}">
      <div class="addon-ico"><i class="bi ${({topper:'bi-stars','nến':'bi-fire','hoa decor':'bi-flower2',topping:'bi-circle-fill'})[a.type]||'bi-stars'}"></i></div>
      <div class="addon-info">
        <div class="addon-name">${esc(a.name)}</div>
        <div class="addon-desc">${a.tags ? String(a.tags).split(',')[0] : a.type}</div>
        <div class="addon-price">+${formatVND(a.price)}đ</div>
      </div>
    </div>`;
  }).join('') : '<p style="color:var(--muted)">Đang tải phụ kiện…</p>';

  const fonts = TEXT_FONTS.map(f => `<button class="chip-sm ${cakeDesign.textFont===f.id?'active':''}" data-font="${f.id}" style="font-family:${f.css}">${f.name}</button>`).join('');
  const positions = TEXT_POSITIONS.map(p => `<button class="chip-sm ${cakeDesign.textPos===p.id?'active':''}" data-pos="${p.id}">${p.name}</button>`).join('');
  const borders = BORDER_STYLES.map(b => `<button class="chip-sm ${cakeDesign.border===b.id?'active':''}" data-border="${b.id}">${b.name}</button>`).join('');
  const topColors = TOPPING_COLORS.map(c => `<button class="swatch ${cakeDesign.toppingColor===c.hex?'active':''}" data-topcolor="${c.hex}" title="${c.name}" style="background:${c.hex}"></button>`).join('');
  const hasNumberCandle = cakeDesign.accessories.some(n => n.toLowerCase().includes('số'));
  const numberField = hasNumberCandle ? `
      <label class="field-label">Số trên nến (tuổi)</label>
      <input class="input-c" id="candleNum" type="number" min="0" max="99" value="${cakeDesign.candleNumber}" style="max-width:140px">` : '';

  return `
    <div class="panel-card">
      <h3 class="panel-title">Trang trí cao cấp</h3>
      <p class="panel-sub">Nâng tầm thiết kế với các phụ kiện thủ công.</p>
      <div class="addon-grid">${cards}</div>
      ${numberField}
      <label class="field-label">Màu trang trí / topping</label>
      <div class="swatch-row">${topColors}</div>
    </div>

    <div class="panel-card">
      <h3 class="panel-title"><i class="bi bi-bordered"></i> Viền &amp; họa tiết</h3>
      <p class="panel-sub">Kiểu viền kem chạy quanh các tầng bánh.</p>
      <div class="chip-wrap">${borders}</div>
    </div>

    <div class="panel-card">
      <h3 class="panel-title"><i class="bi bi-feather"></i> Lời nhắn trên bánh</h3>
      <p class="panel-sub">Thêm dòng chữ (tuỳ chọn, +${formatVND(30000)}đ). Gõ vài chữ rồi nhấn <kbd>Tab</kbd>/<kbd>→</kbd> để AI hoàn thành gợi ý.</p>
      <div class="ghost-wrap">
        <div class="ghost-text" id="ghostText"></div>
        <input class="input-c ghost-input" id="cakeText" maxlength="24" autocomplete="off" placeholder='VD: "Chúc mừng sinh nhật!"' value="${esc(cakeDesign.text||'')}">
      </div>
      <div class="two-col">
        <div><label class="field-label">Kiểu chữ</label><div class="chip-wrap">${fonts}</div></div>
        <div><label class="field-label">Vị trí chữ</label><div class="chip-wrap">${positions}</div></div>
      </div>
    </div>

    <div class="panel-card ai-card">
      <h3 class="panel-title"><i class="bi bi-clipboard-check"></i> AI thẩm định thiết kế</h3>
      <p class="panel-sub">Để AI chấm độ hài hòa và gợi ý phụ kiện phù hợp.</p>
      <button class="btn-c btn-gold-c" id="evalBtn"><i class="bi bi-stars"></i> Thẩm định ngay</button>
      <div class="ai-result" id="aiResult"></div>
    </div>`;
}
function wireDecor() {
  $$('#stepPanel .addon').forEach(c => c.addEventListener('click', () => { toggleAccessory(c.dataset.acc); renderStep(); }));
  const ti = $('#cakeText');
  ti?.addEventListener('input', () => { setText(ti.value); updateGhost(); refreshPreview(); });
  setupMessageAutocomplete(ti);
  $$('#stepPanel [data-font]').forEach(b => b.addEventListener('click', () => { setTextFont(b.dataset.font); renderStep(); }));
  $$('#stepPanel [data-pos]').forEach(b => b.addEventListener('click', () => { setTextPos(b.dataset.pos); renderStep(); }));
  $$('#stepPanel [data-border]').forEach(b => b.addEventListener('click', () => { setBorder(b.dataset.border); renderStep(); }));
  $$('#stepPanel [data-topcolor]').forEach(b => b.addEventListener('click', () => { setToppingColor(b.dataset.topcolor); renderStep(); }));
  const cn = $('#candleNum');
  cn?.addEventListener('input', () => { setCandleNumber(cn.value); });
  $('#evalBtn')?.addEventListener('click', handleEvaluate);
}

// ---------- AI-powered ghost autocomplete for cake message ----------
// Fallback list (used instantly + when offline); AI refines as you type.
const MESSAGE_SUGGESTIONS = [
  'Chúc mừng sinh nhật!', 'Chúc mừng sinh nhật con yêu', 'Happy Birthday',
  'Mừng thọ Bà', 'Mừng thọ Ông', 'Chúc mừng tốt nghiệp',
  'Chúc mừng đám cưới', 'Hạnh phúc trăm năm', 'Kỷ niệm 1 năm yêu nhau',
  'Chúc mừng năm mới', 'Mừng đầy tháng bé', 'Mừng thôi nôi',
  'Yêu em nhiều', 'Tặng Mẹ yêu', 'Tặng Bố', 'Chúc mừng khai trương',
  'Cảm ơn Thầy Cô', 'Mừng ngày 8/3', 'Chúc bình an'
];
let currentGhost = '';
let aiSuggestCache = {};   // prefix -> AI completion
let aiSuggestTimer = null;

function staticSuggestion(val) {
  if (!val || !val.trim()) return '';
  const low = val.toLowerCase();
  const hit = MESSAGE_SUGGESTIONS.find(s => s.toLowerCase().startsWith(low) && s.length > val.length);
  return hit || '';
}
function setGhost(val, full) {
  const ghost = $('#ghostText');
  currentGhost = (full && full.length > val.length && full.toLowerCase().startsWith(val.toLowerCase())) ? full : '';
  if (ghost) ghost.innerHTML = currentGhost
    ? `<span class="ghost-typed">${esc(val)}</span><span class="ghost-rest">${esc(currentGhost.slice(val.length))}</span>`
    : '';
}
function updateGhost() {
  const ti = $('#cakeText'); if (!ti) return;
  const val = ti.value;
  if (!val.trim()) { setGhost(val, ''); return; }
  // 1) instant static suggestion
  const stat = staticSuggestion(val);
  // 2) cached AI suggestion for this prefix wins if present
  const cached = aiSuggestCache[val.toLowerCase()];
  setGhost(val, cached || stat);
  // 3) debounce an AI refine
  scheduleAISuggest(val);
}
function scheduleAISuggest(val) {
  clearTimeout(aiSuggestTimer);
  if (val.trim().length < 2) return;
  if (aiSuggestCache[val.toLowerCase()]) return;       // already have it
  aiSuggestTimer = setTimeout(async () => {
    try {
      const shapeName = (SHAPES.find(s=>s.id===cakeDesign.shape)||{}).name;
      const prompt = `Hoàn thành lời nhắn ngắn trên bánh kem (tiếng Việt, có dấu), bắt đầu bằng: "${val}".
Bối cảnh: bánh ${shapeName} ${cakeDesign.tiers.length} tầng. Lời nhắn hoàn chỉnh tối đa 24 ký tự, PHẢI bắt đầu đúng bằng chuỗi đã cho.
CHỈ trả JSON: {"completion":"<lời nhắn đầy đủ>"}`;
      const r = await callGemini(prompt, 80);
      const full = (r.completion || '').trim().slice(0, 24);
      if (full && full.toLowerCase().startsWith(val.toLowerCase()) && full.length > val.length) {
        aiSuggestCache[val.toLowerCase()] = full;
        const ti = $('#cakeText');
        if (ti && ti.value === val) setGhost(val, full);   // only if user hasn't moved on
      }
    } catch (e) { /* keep static ghost on failure */ }
  }, 450);
}
function setupMessageAutocomplete(ti) {
  if (!ti) return;
  updateGhost();
  ti.addEventListener('keydown', (e) => {
    if ((e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'Enter') && currentGhost) {
      if (e.key === 'ArrowRight' && ti.selectionStart !== ti.value.length) return;
      e.preventDefault();
      ti.value = currentGhost;
      setText(ti.value); setGhost(ti.value, ''); refreshPreview();
    }
  });
  ti.addEventListener('blur', () => { const g = $('#ghostText'); if (g) g.innerHTML=''; });
  ti.addEventListener('focus', updateGhost);
}

// ===== STEP 3: DELIVERY =====
function stepDelivery() {
  const today = new Date(); today.setDate(today.getDate() + 2);
  const min = today.toISOString().split('T')[0];
  return `
    <div class="panel-card">
      <h3 class="panel-title">Thông tin giao hàng</h3>
      <div class="two-col">
        <div><label class="field-label">Ngày nhận</label><input type="date" class="input-c" id="dDate" min="${min}" value="${delivery.date}"></div>
        <div><label class="field-label">Khung giờ</label>
          <select class="input-c" id="dTime">
            <option value="">Chọn giờ</option>
            <option ${delivery.time==='Sáng (8-11h)'?'selected':''}>Sáng (8-11h)</option>
            <option ${delivery.time==='Trưa (11-14h)'?'selected':''}>Trưa (11-14h)</option>
            <option ${delivery.time==='Chiều (14-18h)'?'selected':''}>Chiều (14-18h)</option>
            <option ${delivery.time==='Tối (18-21h)'?'selected':''}>Tối (18-21h)</option>
          </select>
        </div>
      </div>
      <div class="two-col">
        <div><label class="field-label">Người nhận</label><input class="input-c" id="dName" placeholder="Họ tên" value="${delivery.name}"></div>
        <div><label class="field-label">Số điện thoại</label><input class="input-c" id="dPhone" placeholder="09xx xxx xxx" value="${delivery.phone}"></div>
      </div>
      <label class="field-label">Địa chỉ giao</label>
      <input class="input-c" id="dAddr" placeholder="Số nhà, đường, phường/xã, quận/huyện" value="${delivery.address}">
      <label class="field-label">Ghi chú (tuỳ chọn)</label>
      <textarea class="textarea-c" id="dNote" placeholder="Yêu cầu thêm...">${delivery.note}</textarea>
    </div>`;
}
function wireDelivery() {
  const bind = (id, key) => { const el = $(id); el?.addEventListener('input', () => delivery[key] = el.value); };
  bind('#dDate','date'); bind('#dTime','time'); bind('#dName','name'); bind('#dPhone','phone'); bind('#dAddr','address'); bind('#dNote','note');
  $('#dTime')?.addEventListener('change', () => delivery.time = $('#dTime').value);
}

// ===== STEP 4: REVIEW =====
function stepReview() {
  const p = computePrice();
  const tiersList = cakeDesign.tiers.map((t, i) =>
    `<li>Tầng ${i+1}: ${sizeInfo(t.size).id}" · ${(FLAVORS.find(f=>f.id===t.flavor)||{}).name} · ${(FROSTING_STYLES.find(s=>s.id===t.style)||{}).name}</li>`
  ).join('');
  const accList = cakeDesign.accessories.length ? cakeDesign.accessories.join(', ') : 'Không';
  const row = (label, val) => val>0 ? `<div class="sum-row"><span>${label}</span><span>${formatVND(val)}đ</span></div>` : '';
  return `
    <div class="panel-card">
      <h3 class="panel-title">Xác nhận thiết kế</h3>
      <ul class="review-list">
        <li><strong>Hình:</strong> ${(SHAPES.find(s=>s.id===cakeDesign.shape)||{}).name}</li>
        ${tiersList}
        <li><strong>Chữ:</strong> ${cakeDesign.text || 'Không'}</li>
        <li><strong>Phụ kiện:</strong> ${accList}</li>
        <li><strong>Tổng phần ăn:</strong> ${totalServings()} phần</li>
        ${delivery.date ? `<li><strong>Giao:</strong> ${delivery.date} ${delivery.time}</li>`:''}
        ${delivery.address ? `<li><strong>Địa chỉ:</strong> ${delivery.address}</li>`:''}
      </ul>
      <div class="sum-box">
        ${row('Bánh (các tầng)', p.tiers)}
        ${row('Kem đặc biệt', p.style)}
        ${row('Lời nhắn', p.text)}
        ${row('Phụ kiện', p.accessories)}
        <div class="sum-total"><span>Thành tiền</span><span>${formatVND(p.total)}đ</span></div>
      </div>
    </div>`;
}
function wireReview() {}

// ---------- nav ----------
$('#nextBtn')?.addEventListener('click', async () => {
  if (step < STEPS.length - 1) { lastStepDir = 1; step++; renderStep(); window.scrollTo({top:0,behavior:'smooth'}); }
  else { await addToCartFinal(); }
});
$('#prevBtn')?.addEventListener('click', () => { if (step>0){ lastStepDir = -1; step--; renderStep(); } });

async function addToCartFinal() {
  const p = computePrice();
  const shape = (SHAPES.find(s => s.id === cakeDesign.shape) || {}).name || '';
  const parts = [`${cakeDesign.tiers.length} tầng`, shape, `${totalServings()} phần`];
  if (cakeDesign.text) parts.push(`chữ "${cakeDesign.text}"`);
  if (cakeDesign.accessories.length) parts.push(cakeDesign.accessories.join(', '));
  if (delivery.date) parts.push(`giao ${delivery.date} ${delivery.time}`);
  const meta = parts.join(' · ');
  let image = '';
  try { image = getCakeSVGDataURL(); } catch (e) {}
  const ok = await addCustomCakeToCart({ name: 'Bánh thiết kế riêng', price: p.total, image, meta });
  if (ok) { step = 0; renderStep(); }
}

// ---------- AI design ----------
async function handleAIDesign() {
  const idea = $('#designIdea').value.trim();
  if (!idea) { showToast('Hãy mô tả ý tưởng trước', 'warning'); return; }
  const btn = $('#aiDesignBtn'); const orig = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i>';
  try {
    const sizes = SIZES.map(s=>s.id).join('/');
    const flavors = FLAVORS.map(f=>`${f.id}(${f.name})`).join(', ');
    const styles = FROSTING_STYLES.map(s=>`${s.id}(${s.name})`).join(', ');
    const accList = ACCESSORIES.map(a=>a.name).join(', ') || 'không có';
    const prompt = `Bạn là nghệ nhân bánh kem CakeCraft. Dựng thiết kế từ ý tưởng: "${idea}".
Ràng buộc:
- shape: round/square/heart
- tiers: mảng 1-4 phần tử, mỗi phần tử {size (một trong ${sizes}), flavor (một trong: ${flavors}), style (một trong: ${styles})}
- text: chữ trên bánh, tối đa 24 ký tự, có thể rỗng
- accessories: mảng tên, chỉ chọn từ [${accList}], 0-3 món
CHỈ trả JSON: {"shape":"...","tiers":[{"size":8,"flavor":"vani","style":"buttercream"}],"text":"...","accessories":[...],"note":"1 câu giải thích"}`;
    const res = await fetch(GEMINI_URL, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.7,maxOutputTokens:700,responseMimeType:'application/json'} }) });
    if (!res.ok) throw new Error('API');
    const data = await res.json();
    const d = JSON.parse((data.candidates?.[0]?.content?.parts?.[0]?.text||'{}').replace(/```json|```/g,'').trim());
    applyDesign(d);
    renderStep();
    showToast('AI đã dựng thiết kế! Tinh chỉnh thoải mái.', 'success');
    if (d.note) { const n=$('#aiNote'); if(n){ n.textContent='AI: '+d.note; n.style.display='block'; } }
  } catch (e) { console.error(e); showToast('Lỗi AI. Kiểm tra API key/kết nối.', 'error'); }
  finally { btn.disabled=false; btn.innerHTML=orig; }
}

// ---------- AI evaluate (thẩm định + gợi ý phụ kiện) ----------
async function handleEvaluate() {
  const btn = $('#evalBtn'); const result = $('#aiResult'); const orig = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Đang thẩm định…';
  result.classList.remove('show');
  try {
    const accCatalog = ACCESSORIES.map(a => `{"name":"${a.name}","type":"${a.type}","price":${a.price}}`).join(',');
    const tierDesc = cakeDesign.tiers.map((t,i)=>`tầng ${i+1}: ${sizeInfo(t.size).id}" ${(FLAVORS.find(f=>f.id===t.flavor)||{}).name} kem ${(FROSTING_STYLES.find(s=>s.id===t.style)||{}).name}`).join('; ');
    const shapeName = (SHAPES.find(s=>s.id===cakeDesign.shape)||{}).name;
    const prompt = `Chuyên gia thẩm định bánh kem CakeCraft. Thiết kế hiện tại:
- Hình: ${shapeName}; ${tierDesc}
- Chữ trên bánh: "${cakeDesign.text||'(không)'}"
- Phụ kiện đang có: ${cakeDesign.accessories.join(', ')||'chưa có'}
KHO PHỤ KIỆN: [${accCatalog}]
Chấm độ hài hòa (0-100) và gợi ý tối đa 3 phụ kiện bán thêm (đúng tên trong kho). CHỈ JSON:
{"suitability_score":<0-100>,"verdict":"<1-2 câu tiếng Việt>","recommended_accessories":[{"name":"<tên>","reason":"<ngắn>"}]}`;
    const res = await fetch(GEMINI_URL, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.6,maxOutputTokens:600,responseMimeType:'application/json'} }) });
    if (!res.ok) throw new Error('API');
    const data = await res.json();
    const r = JSON.parse((data.candidates?.[0]?.content?.parts?.[0]?.text||'{}').replace(/```json|```/g,'').trim());
    result.innerHTML = renderEval(r);
    result.querySelectorAll('.add-upsell-btn').forEach(b => b.addEventListener('click', () => { toggleAccessory(b.dataset.acc); renderStep(); }));
    result.classList.add('show');
    requestAnimationFrame(() => { const bar = result.querySelector('.score-bar'); if (bar) bar.style.width = bar.dataset.w + '%'; });
  } catch (e) { console.error(e); showToast('Lỗi kết nối AI.', 'error'); }
  finally { btn.disabled=false; btn.innerHTML=orig; }
}
function renderEval(r) {
  const score = Math.max(0, Math.min(100, parseInt(r.suitability_score)||0));
  const recs = Array.isArray(r.recommended_accessories) ? r.recommended_accessories : [];
  const recHtml = recs.map(rec => {
    const acc = ACCESSORIES.find(a => a.name === rec.name); if (!acc) return '';
    const on = cakeDesign.accessories.includes(acc.name);
    return `<div class="upsell-item">
      <div class="upsell-info"><strong>${acc.name}</strong><span class="upsell-reason">${rec.reason||''}</span><span class="upsell-price">+${formatVND(acc.price)}đ</span></div>
      <button class="add-upsell-btn" data-acc="${esc(acc.name)}">${on?'<i class="bi bi-check-lg"></i>':'<i class="bi bi-plus-lg"></i>'}</button>
    </div>`;
  }).join('');
  return `<div class="score-wrap"><div class="score-bar" data-w="${score}" style="width:0%"></div><span class="score-label">Độ hài hòa: ${score}/100</span></div>
    <p style="margin:1rem 0;color:var(--cocoa)">${r.verdict||''}</p>
    ${recHtml ? `<div class="upsell-title">Phụ kiện AI gợi ý</div>${recHtml}` : ''}`;
}

renderStep();

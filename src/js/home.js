// Home page
import { injectChrome } from './partials.js';
import { revealNow, homeHero, pinnedFeatures, sectionTransitions } from './motion.js';
import { wireShared, loadCatalog, ensureSeed, onProducts, addToCart, formatVND, $, confettiBurst } from './core.js';
import { DEFAULT_PRODUCTS } from './admin.js';

injectChrome();
wireShared();
// Load catalog right away so products show even if seeding is slow/blocked.
loadCatalog();
ensureSeed();

// Cinematic homepage motion (runs after chrome is injected)
requestAnimationFrame(() => { homeHero(); pinnedFeatures('#features'); sectionTransitions(); });

// Render a few featured products on home
let gotProducts = false;
let demoNote = null;

// Show demo products instantly so the grid is never blank, then upgrade to real data.
renderFeatured(DEFAULT_PRODUCTS.map((p, i) => ({ id: 'demo_' + i, ...p })), true);

onProducts((products) => {
  if (products.length > 0) {
    gotProducts = true;
    if (demoNote) { demoNote.remove(); demoNote = null; }
    renderFeatured(products, false);
  }
});

function renderFeatured(products, isDemo) {
  const grid = $('#featuredGrid');
  if (!grid) return;
  const featured = products.slice(0, 8);
  if (featured.length === 0) return;
  grid.innerHTML = featured.map(p => productCard(p)).join('');
  revealNow(grid.querySelectorAll('.product-card'));
  grid.querySelectorAll('.add-btn').forEach(b => {
    if (b.dataset.add) b.addEventListener('click', () => addToCart(b.dataset.add));
    else b.addEventListener('click', () => location.href = 'menu.html');
  });
  // demo notice (only while showing demo data)
  if (isDemo && !demoNote) {
    demoNote = document.createElement('p');
    demoNote.style.cssText = 'text-align:center;color:var(--muted);font-size:.85rem;margin-top:1rem';
    demoNote.innerHTML = '<i class="bi bi-info-circle"></i> Đang hiển thị bánh mẫu. Để lưu vào hệ thống, hãy bật quyền ghi trong Firestore Rules (xem README).';
    grid.after(demoNote);
  }
}

function productCard(p) {
  const badge = p.badge ? `<span class="product-badge ${p.badgeType === 'gold' ? 'gold' : ''}">${p.badge}</span>` : '';
  const isDemo = String(p.id).startsWith('demo_');
  const btn = isDemo
    ? `<button class="add-btn" title="Xem thực đơn"><i class="bi bi-arrow-right"></i></button>`
    : `<button class="add-btn" data-add="${p.id}" title="Thêm vào giỏ"><i class="bi bi-plus-lg"></i></button>`;
  return `<div class="product-card reveal">
    <div class="product-media">${badge}<img src="${p.image}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=600&q=80'"></div>
    <div class="product-body">
      <span class="product-cat">${p.categoryLabel || ''}</span>
      <h3 class="product-name">${p.name}</h3>
      <p class="product-desc">${p.description || ''}</p>
      <div class="product-foot">
        <span class="product-price">${formatVND(p.price)}đ</span>
        ${btn}
      </div>
    </div>
  </div>`;
}

// Subtle parallax on hero visual
const hero = document.querySelector('.hero-visual');
if (hero) {
  addEventListener('mousemove', (e) => {
    const x = (e.clientX / innerWidth - 0.5) * 12;
    const y = (e.clientY / innerHeight - 0.5) * 12;
    hero.style.transform = `translate(${x}px, ${y}px)`;
  });
}

// ============================================================
// Interactive particle network background (hero)
// ============================================================
(function particleBG() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr, particles = [];
  const mouse = { x: -9999, y: -9999 };
  const COLOR = '193,124,58';   // caramel on light warm bg
  const COUNT = Math.min(70, Math.floor(innerWidth / 22));

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function init() {
    particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1
    }));
  }
  function step() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      // mouse repulsion
      const dx = p.x - mouse.x, dy = p.y - mouse.y, dist = Math.hypot(dx, dy);
      if (dist < 120) { p.x += dx / dist * 1.4; p.y += dy / dist * 1.4; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${COLOR},0.35)`; ctx.fill();
    }
    // links
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 130) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${COLOR},${0.18 * (1 - d / 130)})`; ctx.lineWidth = 1; ctx.stroke();
        }
      }
    }
    requestAnimationFrame(step);
  }
  const setMouse = (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
  canvas.parentElement.addEventListener('mousemove', setMouse);
  canvas.parentElement.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });
  addEventListener('resize', () => { resize(); init(); });
  resize(); init(); step();
})();

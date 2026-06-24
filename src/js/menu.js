// Menu page
import { injectChrome } from './partials.js';
import { wireShared, loadCatalog, ensureSeed, onProducts, addToCart, formatVND, $, $$ } from './core.js';
import { DEFAULT_PRODUCTS } from './admin.js';
import { revealNow } from './motion.js';

injectChrome();
wireShared();
loadCatalog();
ensureSeed();

let allProducts = DEFAULT_PRODUCTS.map((p, i) => ({ id: 'demo_' + i, ...p }));
let usingDemo = true;
let currentCat = 'all';
render(); // show demo instantly

onProducts((products) => {
  if (products.length > 0) { allProducts = products; usingDemo = false; render(); }
});

function render() {
  const grid = $('#menuGrid');
  if (!grid) return;
  const list = currentCat === 'all' ? allProducts : allProducts.filter(p => p.category === currentCat);
  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="ico"><i class="bi bi-search"></i></div><p>Chưa có bánh trong mục này.</p></div>`;
    return;
  }
  grid.innerHTML = list.map((p, i) => {
    const badge = p.badge ? `<span class="product-badge ${p.badgeType === 'gold' ? 'gold' : ''}">${p.badge}</span>` : '';
    const demo = String(p.id).startsWith('demo_');
    const btn = demo ? `<button class="add-btn" title="Xem thực đơn"><i class="bi bi-arrow-right"></i></button>`
                     : `<button class="add-btn" data-add="${p.id}"><i class="bi bi-plus-lg"></i></button>`;
    return `<div class="product-card reveal d${(i % 4) + 1}">
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
  }).join('');
  grid.querySelectorAll('.add-btn').forEach(b => {
    if (b.dataset.add) b.addEventListener('click', () => addToCart(b.dataset.add));
    else b.addEventListener('click', () => { if (usingDemo) location.reload(); });
  });
  revealNow(grid.querySelectorAll('.product-card'));
}

$$('.cat-tab').forEach(tab => tab.addEventListener('click', () => {
  $$('.cat-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  currentCat = tab.dataset.cat;
  render();
}));

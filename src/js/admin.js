// ============================================
// ADMIN PANEL - CAKECRAFT
// ============================================
import {
  db, auth,
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, addDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp, onSnapshot
} from './firebase-config.js';

// ============================================
// ADMIN CONFIGURATION
// ============================================
export const ADMIN_EMAILS = [
  'thaihuutai42@gmail.com',
  'quangctm07@gmail.com,
];

export function isAdmin(user) {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

// ============================================
// HELPERS
// ============================================
const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showAdminToast(msg, type = 'success') {
  const existing = $('.admin-toast');
  if (existing) existing.remove();

  const icons = {
    success: 'bi-check-circle-fill',
    error: 'bi-x-circle-fill',
    warning: 'bi-exclamation-circle-fill',
    info: 'bi-info-circle-fill'
  };

  const toast = document.createElement('div');
  toast.className = `admin-toast toast-luxury ${type}`;
  toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${msg}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 3500);
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ============================================
// PRODUCTS - CRUD
// ============================================
let productsListener = null;

export async function loadAdminProducts() {
  const tbody = $('#adminProductsTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:2rem;color:var(--coffee)">Đang tải...</td></tr>';

  // Realtime listener
  if (productsListener) productsListener();

  productsListener = onSnapshot(
    query(collection(db, 'products'), orderBy('createdAt', 'desc')),
    (snapshot) => {
      const products = [];
      snapshot.forEach(d => products.push({ id: d.id, ...d.data() }));
      renderAdminProductsTable(products);
    },
    (error) => {
      console.error('Products load error:', error);
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:2rem;color:#c0392b">Lỗi: ${error.message}</td></tr>`;
    }
  );
}

function renderAdminProductsTable(products) {
  const tbody = $('#adminProductsTable tbody');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" class="text-center" style="padding:3rem;color:var(--coffee)">
        <i class="bi bi-inbox" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;opacity:0.4"></i>
        Chưa có sản phẩm nào. Bấm "Thêm sản phẩm" để bắt đầu.
      </td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr data-id="${p.id}">
      <td>
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"
             style="width:55px;height:55px;object-fit:cover;border:1px solid var(--cream-200)"
             onerror="this.src='https://via.placeholder.com/55?text=N/A'">
      </td>
      <td>
        <div style="font-family:var(--font-display);font-size:1.05rem;color:var(--dark-coffee);letter-spacing:0.03em">${escapeHtml(p.name)}</div>
        <div style="font-size:0.75rem;color:var(--coffee);margin-top:2px">${escapeHtml(p.categoryLabel || p.category || '—')}</div>
      </td>
      <td>
        <span class="admin-badge">${escapeHtml(p.category || '—')}</span>
      </td>
      <td style="font-family:var(--font-display);color:var(--dark-coffee)">
        ${formatVND(p.price)}đ
      </td>
      <td>
        ${p.badge ? `<span class="admin-badge ${p.badgeType === 'gold' ? 'gold' : ''}">${escapeHtml(p.badge)}</span>` : '<span style="color:var(--cream-300)">—</span>'}
      </td>
      <td>
        <div class="admin-actions">
          <button class="btn-icon edit" data-action="edit" data-id="${p.id}" title="Sửa">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button class="btn-icon delete" data-action="delete" data-id="${p.id}" title="Xóa">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  // Bind actions
  tbody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const product = products.find(p => p.id === id);

      if (action === 'edit' && product) openProductModal(product);
      else if (action === 'delete' && product) confirmDeleteProduct(product);
    });
  });
}

export function openProductModal(product = null) {
  const isEdit = !!product;
  $('#productModalTitle').textContent = isEdit ? 'SỬA SẢN PHẨM' : 'THÊM SẢN PHẨM';
  $('#productId').value = isEdit ? product.id : '';
  $('#prodName').value = isEdit ? product.name || '' : '';
  $('#prodCategory').value = isEdit ? product.category || 'espresso' : 'espresso';
  $('#prodCategoryLabel').value = isEdit ? product.categoryLabel || '' : '';
  $('#prodPrice').value = isEdit ? product.price || '' : '';
  $('#prodDescription').value = isEdit ? product.description || '' : '';
  $('#prodImage').value = isEdit ? product.image || '' : '';
  $('#prodNotes').value = isEdit ? product.notes || '' : '';
  $('#prodBadge').value = isEdit ? product.badge || '' : '';
  $('#prodBadgeType').value = isEdit ? product.badgeType || 'default' : 'default';

  // Auto-fill categoryLabel based on category
  updateCategoryLabel();

  const modal = new bootstrap.Modal($('#productModal'));
  modal.show();
}

function updateCategoryLabel() {
  const map = {
    'kem': 'Bánh Kem',
    'cupcake': 'Cupcake',
    'mousse': 'Bánh Lạnh',
    'special': 'Đặc Biệt'
  };
  const cat = $('#prodCategory').value;
  if (!$('#prodCategoryLabel').value) {
    $('#prodCategoryLabel').value = map[cat] || '';
  }
}

export async function saveProduct(e) {
  e.preventDefault();

  const id = $('#productId').value;
  const data = {
    name: $('#prodName').value.trim(),
    category: $('#prodCategory').value,
    categoryLabel: $('#prodCategoryLabel').value.trim() || $('#prodCategory').value,
    price: parseInt($('#prodPrice').value) || 0,
    description: $('#prodDescription').value.trim(),
    image: $('#prodImage').value.trim(),
    notes: $('#prodNotes').value.trim(),
    badge: $('#prodBadge').value.trim(),
    badgeType: $('#prodBadgeType').value
  };

  if (!data.name || !data.price || !data.image) {
    showAdminToast('Vui lòng điền đủ Tên, Giá và Ảnh', 'warning');
    return;
  }

  const submitBtn = $('#saveProductBtn');
  submitBtn.disabled = true;
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = 'Đang lưu...';

  try {
    if (id) {
      // UPDATE
      await updateDoc(doc(db, 'products', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      showAdminToast(`Đã cập nhật "${data.name}"`, 'success');
    } else {
      // CREATE
      await addDoc(collection(db, 'products'), {
        ...data,
        createdAt: serverTimestamp()
      });
      showAdminToast(`Đã thêm "${data.name}"`, 'success');
    }

    bootstrap.Modal.getInstance($('#productModal'))?.hide();
  } catch (err) {
    console.error(err);
    showAdminToast('Lỗi: ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

async function confirmDeleteProduct(product) {
  if (!confirm(`Xóa sản phẩm "${product.name}"?\n\nHành động này không thể hoàn tác.`)) return;

  try {
    await deleteDoc(doc(db, 'products', product.id));
    showAdminToast(`Đã xóa "${product.name}"`, 'success');
  } catch (err) {
    showAdminToast('Lỗi xóa: ' + err.message, 'error');
  }
}

// ============================================
// USERS - List & Delete
// ============================================
let usersListener = null;

export async function loadAdminUsers() {
  const tbody = $('#adminUsersTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:2rem;color:var(--coffee)">Đang tải...</td></tr>';

  if (usersListener) usersListener();

  usersListener = onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const users = [];
      snapshot.forEach(d => users.push({ id: d.id, ...d.data() }));
      // Sắp xếp client-side để tránh phải tạo index
      users.sort((a, b) => {
        const aT = a.createdAt?.seconds || 0;
        const bT = b.createdAt?.seconds || 0;
        return bT - aT;
      });
      renderAdminUsersTable(users);
    },
    (error) => {
      console.error('Users load error:', error);
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:2rem;color:#c0392b">Lỗi: ${error.message}</td></tr>`;
    }
  );
}

function renderAdminUsersTable(users) {
  const tbody = $('#adminUsersTable tbody');
  if (!tbody) return;

  $('#totalUsersCount') && ($('#totalUsersCount').textContent = users.length);

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:3rem;color:var(--coffee)">Chưa có user nào</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const isUserAdmin = ADMIN_EMAILS.includes((u.email || '').toLowerCase());
    const createdAt = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('vi-VN') : '—';
    const avatar = u.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || u.email || 'U')}&background=5BAE9B&color=ffffff&bold=true`;

    return `
      <tr data-id="${u.id}">
        <td>
          <div style="display:flex;align-items:center;gap:0.7rem">
            <img src="${avatar}" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover">
            <div>
              <div style="font-family:var(--font-display);color:var(--dark-coffee);font-size:1rem">${escapeHtml(u.displayName || 'Khách')}</div>
              ${isUserAdmin ? '<span class="admin-badge gold" style="font-size:0.6rem">ADMIN</span>' : ''}
            </div>
          </div>
        </td>
        <td style="font-family:var(--font-serif)">${escapeHtml(u.email || '—')}</td>
        <td style="font-family:var(--font-display);color:var(--dark-coffee)">${formatVND(u.walletBalance)}đ</td>
        <td style="font-size:0.85rem;color:var(--coffee)">${createdAt}</td>
        <td style="font-family:'Courier New',monospace;font-size:0.75rem;color:var(--coffee)">${u.id.substring(0,10)}...</td>
        <td>
          <div class="admin-actions">
            <button class="btn-icon edit" data-action="edit-balance" data-id="${u.id}" data-name="${escapeHtml(u.displayName || u.email)}" data-balance="${u.walletBalance || 0}" title="Sửa số dư ví">
              <i class="bi bi-wallet2"></i>
            </button>
            ${isUserAdmin
              ? '<span style="font-size:0.75rem;color:var(--coffee);font-style:italic">Bảo vệ</span>'
              : `<button class="btn-icon delete" data-action="delete-user" data-id="${u.id}" data-name="${escapeHtml(u.displayName || u.email)}" title="Xóa user">
                  <i class="bi bi-trash-fill"></i>
                </button>`
            }
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind delete user
  tbody.querySelectorAll('[data-action="delete-user"]').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteUser(btn.dataset.id, btn.dataset.name));
  });

  // Bind edit wallet balance
  tbody.querySelectorAll('[data-action="edit-balance"]').forEach(btn => {
    btn.addEventListener('click', () => editUserBalance(btn.dataset.id, btn.dataset.name, btn.dataset.balance));
  });
}

async function editUserBalance(userId, userName, current) {
  const input = prompt(`Cập nhật số dư ví cho "${userName}" (VND):`, current);
  if (input === null) return;
  const value = parseInt(String(input).replace(/[^\d]/g, ''), 10);
  if (isNaN(value) || value < 0) {
    showAdminToast('Số tiền không hợp lệ', 'warning');
    return;
  }
  try {
    await updateDoc(doc(db, 'users', userId), { walletBalance: value });
    showAdminToast(`Đã cập nhật số dư của "${userName}"`, 'success');
  } catch (err) {
    showAdminToast('Lỗi cập nhật: ' + err.message, 'error');
  }
}

async function confirmDeleteUser(userId, userName) {
  if (!confirm(`Xóa user "${userName}"?\n\n⚠ Sẽ xóa:\n- Thông tin user (ví, profile)\n- Giỏ hàng của user\n\nLưu ý: Tài khoản Auth không thể xóa từ client - user vẫn có thể đăng nhập nhưng sẽ là user mới.\n\nTiếp tục?`)) return;

  try {
    // Xóa user document
    await deleteDoc(doc(db, 'users', userId));

    // Xóa cart của user (nếu có)
    try {
      await deleteDoc(doc(db, 'carts', userId));
    } catch (e) { /* Cart có thể không tồn tại - bỏ qua */ }

    showAdminToast(`Đã xóa user "${userName}"`, 'success');
  } catch (err) {
    console.error(err);
    showAdminToast('Lỗi xóa: ' + err.message, 'error');
  }
}

// ============================================
// ORDERS - View
// ============================================
let ordersListener = null;

export async function loadAdminOrders() {
  const tbody = $('#adminOrdersTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:2rem;color:var(--coffee)">Đang tải...</td></tr>';

  if (ordersListener) ordersListener();

  ordersListener = onSnapshot(
    collection(db, 'orders'),
    (snapshot) => {
      const orders = [];
      snapshot.forEach(d => orders.push({ id: d.id, ...d.data() }));
      orders.sort((a, b) => {
        const aT = a.createdAt?.seconds || 0;
        const bT = b.createdAt?.seconds || 0;
        return bT - aT;
      });
      renderAdminOrdersTable(orders);
    },
    (error) => {
      console.error('Orders load error:', error);
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:2rem;color:#c0392b">Lỗi: ${error.message}</td></tr>`;
    }
  );
}

function renderAdminOrdersTable(orders) {
  const tbody = $('#adminOrdersTable tbody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:3rem;color:var(--coffee)">Chưa có đơn hàng nào</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const createdAt = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString('vi-VN') : '—';
    const itemsCount = o.items?.length || 0;
    const itemsList = (o.items || []).map(i => `${i.name} ×${i.quantity}`).join(', ');

    return `
      <tr>
        <td style="font-family:'Courier New',monospace;font-size:0.75rem;color:var(--coffee)">${o.id.substring(0,8)}...</td>
        <td style="font-family:'Courier New',monospace;font-size:0.75rem;color:var(--coffee)">${(o.userId || '—').substring(0,10)}...</td>
        <td>
          <div style="font-size:0.9rem">${escapeHtml(itemsList) || '—'}</div>
          <div style="font-size:0.75rem;color:var(--coffee);margin-top:2px">${itemsCount} sản phẩm</div>
        </td>
        <td style="font-family:var(--font-display);color:var(--dark-coffee);font-size:1.05rem">${formatVND(o.total)}đ</td>
        <td>
          <span class="admin-badge ${o.status === 'completed' ? 'gold' : ''}">${escapeHtml(o.status || 'pending')}</span>
        </td>
        <td style="font-size:0.8rem;color:var(--coffee)">${createdAt}</td>
      </tr>
    `;
  }).join('');
}

// ============================================
// DASHBOARD - Statistics
// ============================================
export async function loadAdminDashboard() {
  // Each read is independent: if one collection is denied by rules, the rest still show.
  const [usersR, ordersR, productsR] = await Promise.allSettled([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'orders')),
    getDocs(collection(db, 'products'))
  ]);
  const usersSnap = usersR.status === 'fulfilled' ? usersR.value : null;
  const ordersSnap = ordersR.status === 'fulfilled' ? ordersR.value : null;
  const productsSnap = productsR.status === 'fulfilled' ? productsR.value : null;

  const denied = [usersR, ordersR, productsR].some(r => r.status === 'rejected');
  if (denied) {
    showAdminToast('Một số dữ liệu cần quyền admin trong Firestore Rules (xem README).', 'warning');
  }

  try {
    $('#statUsersCount') && ($('#statUsersCount').textContent = usersSnap ? usersSnap.size : '—');
    $('#statProductsCount') && ($('#statProductsCount').textContent = productsSnap ? productsSnap.size : '—');

    let totalRevenue = 0, totalOrders = 0, totalItemsSold = 0;
    const productSales = {};
    if (ordersSnap) ordersSnap.forEach(d => {
      const order = d.data();
      totalOrders++;
      totalRevenue += order.total || 0;
      (order.items || []).forEach(item => {
        totalItemsSold += item.quantity || 0;
        productSales[item.name] = (productSales[item.name] || 0) + (item.quantity || 0);
      });
    });

    $('#statOrdersCount') && ($('#statOrdersCount').textContent = ordersSnap ? totalOrders : '—');
    $('#statRevenue') && ($('#statRevenue').textContent = ordersSnap ? formatVND(totalRevenue) + 'đ' : '—');

    const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topProductsList = $('#topProductsList');
    if (topProductsList) {
      if (topProducts.length === 0) {
        topProductsList.innerHTML = '<div class="empty-row"><i class="bi bi-graph-up" style="font-size:1.8rem;display:block;margin-bottom:.5rem;opacity:.5"></i>Chưa có dữ liệu bán hàng</div>';
      } else {
        const maxQty = topProducts[0][1];
        const totalTopQty = topProducts.reduce((s, [, q]) => s + q, 0);
        const medals = ['gold', 'silver', 'bronze'];
        topProductsList.innerHTML = topProducts.map(([name, qty], idx) => {
          const pct = (qty / maxQty * 100);
          const share = totalTopQty ? Math.round(qty / totalTopQty * 100) : 0;
          const rankClass = medals[idx] || 'plain';
          return `
          <div class="top-product-item" data-rank="${idx + 1}">
            <div class="top-product-rank rank-${rankClass}">
              ${idx < 3 ? '<i class="bi bi-trophy-fill"></i>' : ''}<span>${idx + 1}</span>
            </div>
            <div class="top-product-info">
              <div class="top-product-head">
                <span class="top-product-name">${escapeHtml(name)}</span>
                <span class="top-product-share">${share}%</span>
              </div>
              <div class="top-product-track">
                <div class="top-product-bar rank-${rankClass}" style="--w:${pct}%"></div>
              </div>
              <div class="top-product-qty"><i class="bi bi-bag-check"></i> ${qty} đã bán</div>
            </div>
          </div>`;
        }).join('');
      }
    }

    const recentOrders = [];
    if (ordersSnap) ordersSnap.forEach(d => recentOrders.push({ id: d.id, ...d.data() }));
    recentOrders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const recent5 = recentOrders.slice(0, 5);
    const recentOrdersList = $('#recentOrdersList');
    if (recentOrdersList) {
      if (recent5.length === 0) {
        recentOrdersList.innerHTML = '<div class="empty-row"><i class="bi bi-inbox" style="font-size:1.8rem;display:block;margin-bottom:.5rem;opacity:.5"></i>Chưa có đơn hàng</div>';
      } else {
        recentOrdersList.innerHTML = recent5.map(o => {
          const time = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString('vi-VN') : '—';
          const itemsBrief = (o.items || []).slice(0, 2).map(i => i.name).join(', ');
          const count = o.items?.length || 0;
          const initial = escapeHtml((itemsBrief || '?').charAt(0).toUpperCase());
          return `
            <div class="recent-order-item">
              <div class="recent-order-avatar">${initial}</div>
              <div class="recent-order-main">
                <div class="recent-order-name">${escapeHtml(itemsBrief)}${count > 2 ? ` +${count - 2}` : ''}</div>
                <div class="recent-order-time"><i class="bi bi-clock"></i> ${time}</div>
              </div>
              <div class="recent-order-total">${formatVND(o.total)}đ</div>
            </div>`;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Dashboard render error:', err);
  }
}

// ============================================
// SEED DATA - Danh mục bánh mặc định
// ============================================
export const DEFAULT_PRODUCTS = [
  { name: 'Red Velvet Classic', category: 'kem', categoryLabel: 'Bánh Kem', price: 320000,
    description: 'Cốt bánh red velvet mềm ẩm phủ kem phô mai béo mịn, sắc đỏ quyến rũ.',
    image: 'https://images.unsplash.com/photo-1586788224331-947f68671cf1?w=600&q=80',
    badge: 'Signature', badgeType: 'gold', notes: 'ngọt dịu, béo, mềm ẩm' },
  { name: 'Tiramisu Cake', category: 'kem', categoryLabel: 'Bánh Kem', price: 350000,
    description: 'Lớp cốt thấm cà phê espresso, kem mascarpone Ý và bột cacao nguyên chất.',
    image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&q=80',
    badge: '', badgeType: 'default', notes: 'cà phê, béo, tinh tế' },
  { name: 'Black Forest', category: 'kem', categoryLabel: 'Bánh Kem', price: 360000,
    description: 'Bánh sô-cô-la Đức xen kem tươi và cherry ngâm rượu kirsch.',
    image: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=600&q=80',
    badge: '', badgeType: 'default', notes: 'sô-cô-la, cherry, đậm đà' },
  { name: 'Rainbow Cake', category: 'kem', categoryLabel: 'Bánh Kem', price: 390000,
    description: 'Sáu tầng cốt bánh sắc cầu vồng, kem bơ vani ngọt ngào - rực rỡ cho tiệc.',
    image: 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=600&q=80',
    badge: 'Hot', badgeType: 'gold', notes: 'ngọt, sặc sỡ, vui tươi' },
  { name: 'Vanilla Cupcake', category: 'cupcake', categoryLabel: 'Cupcake', price: 45000,
    description: 'Cupcake vanilla Madagascar mềm xốp, phủ kem bơ tươi mịn màng.',
    image: 'https://images.unsplash.com/photo-1426869981800-95ebf51ce900?w=600&q=80',
    badge: 'Hot', badgeType: 'default', notes: 'ngọt, thơm, êm dịu' },
  { name: 'Chocolate Cupcake', category: 'cupcake', categoryLabel: 'Cupcake', price: 50000,
    description: 'Cupcake chocolate đậm đà với nhân ganache tan chảy bên trong.',
    image: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=600&q=80',
    badge: '', badgeType: 'default', notes: 'sô-cô-la, đậm, ngọt' },
  { name: 'Red Velvet Cupcake', category: 'cupcake', categoryLabel: 'Cupcake', price: 52000,
    description: 'Phiên bản mini của red velvet, phủ chóp kem phô mai xoắn ốc.',
    image: 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=600&q=80',
    badge: '', badgeType: 'default', notes: 'béo, ngọt dịu, xinh xắn' },
  { name: 'Lemon Cupcake', category: 'cupcake', categoryLabel: 'Cupcake', price: 48000,
    description: 'Cupcake chanh vàng chua nhẹ, tươi mát, phủ kem bơ chanh thanh thanh.',
    image: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=600&q=80',
    badge: '', badgeType: 'default', notes: 'chua nhẹ, tươi, sảng khoái' },
  { name: 'Mango Mousse', category: 'mousse', categoryLabel: 'Bánh Lạnh', price: 280000,
    description: 'Mousse xoài tươi mát lạnh, chua ngọt cân bằng, hoàn hảo cho ngày hè.',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80',
    badge: '', badgeType: 'default', notes: 'tươi mát, chua ngọt, nhẹ' },
  { name: 'Matcha Mousse', category: 'mousse', categoryLabel: 'Bánh Lạnh', price: 300000,
    description: 'Mousse trà xanh Uji Nhật Bản, vị chát nhẹ thanh tao, mát lành.',
    image: 'https://images.unsplash.com/photo-1515037893149-de7f840978e2?w=600&q=80',
    badge: '', badgeType: 'default', notes: 'trà xanh, thanh, mát lạnh' },
  { name: 'Chocolate Mousse', category: 'mousse', categoryLabel: 'Bánh Lạnh', price: 310000,
    description: 'Mousse sô-cô-la Bỉ mịn như nhung, tan ngay trong miệng.',
    image: 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=600&q=80',
    badge: '', badgeType: 'default', notes: 'sô-cô-la, mịn, đậm' },
  { name: 'Blueberry Cheesecake', category: 'mousse', categoryLabel: 'Bánh Lạnh', price: 330000,
    description: 'Cheesecake lạnh béo mịn phủ sốt việt quất chua ngọt tự nhiên.',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80',
    badge: 'Hot', badgeType: 'default', notes: 'béo, chua ngọt, mát' },
  { name: 'Strawberry Shortcake', category: 'special', categoryLabel: 'Đặc Biệt', price: 380000,
    description: 'Bánh bông lan kem tươi xen lớp dâu tây mọng nước - thanh xuân ngọt ngào.',
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80',
    badge: 'Premium', badgeType: 'gold', notes: 'ngọt ngào, tươi mát, sang trọng' },
  { name: 'Opera Cake', category: 'special', categoryLabel: 'Đặc Biệt', price: 420000,
    description: 'Bánh Opera Pháp với nhiều lớp almond, ganache và kem bơ cà phê - đẳng cấp quý tộc.',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80',
    badge: 'Mới', badgeType: 'default', notes: 'sô-cô-la, cà phê, cao cấp' },
  { name: 'Naked Wedding Cake', category: 'special', categoryLabel: 'Đặc Biệt', price: 850000,
    description: 'Bánh cưới 3 tầng phong cách "naked", trang trí hoa tươi tinh khôi.',
    image: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=600&q=80',
    badge: 'Premium', badgeType: 'gold', notes: 'sang trọng, tinh khôi, nhiều tầng' },
  { name: 'Macaron Tower', category: 'special', categoryLabel: 'Đặc Biệt', price: 550000,
    description: 'Tháp macaron Pháp nhiều màu pastel, giòn tan và ngọt thanh.',
    image: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=600&q=80',
    badge: '', badgeType: 'default', notes: 'giòn, pastel, tinh tế' }
];

// Dùng cho nút "Tạo dữ liệu mẫu" trong admin (có thông báo)
export async function seedInitialProducts() {
  const productsSnap = await getDocs(collection(db, 'products'));
  if (productsSnap.size > 0) {
    showAdminToast('Đã có sản phẩm rồi, không cần seed', 'info');
    return;
  }
  try {
    for (const p of DEFAULT_PRODUCTS) {
      await addDoc(collection(db, 'products'), { ...p, createdAt: serverTimestamp() });
    }
    showAdminToast(`Đã seed ${DEFAULT_PRODUCTS.length} sản phẩm mặc định`, 'success');
  } catch (err) {
    showAdminToast('Lỗi seed: ' + err.message, 'error');
  }
}

// ============================================
// SEED DATA - Phụ kiện trang trí bánh (topper, nến, hoa decor)
// ============================================
export const DEFAULT_ACCESSORIES = [
  { name: 'Topper "Happy Birthday"', type: 'topper', price: 25000, tags: 'sinh nhật, chữ, vàng',
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=80' },
  { name: 'Nến số (0-9)', type: 'nến', price: 15000, tags: 'sinh nhật, số tuổi',
    image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=400&q=80' },
  { name: 'Hoa hồng kem tươi', type: 'hoa decor', price: 40000, tags: 'lãng mạn, sang trọng, hoa',
    image: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=400&q=80' },
  { name: 'Topper khủng long', type: 'topper', price: 30000, tags: 'trẻ em, bé trai, vui nhộn',
    image: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=400&q=80' },
  { name: 'Nến lấp lánh (sparkler)', type: 'nến', price: 35000, tags: 'sang trọng, tiệc, lễ hội',
    image: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400&q=80' },
  { name: 'Macaron trang trí', type: 'topping', price: 20000, tags: 'ngọt, pháp, màu pastel',
    image: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=400&q=80' },
  { name: 'Quả mọng tươi (mix berry)', type: 'topping', price: 45000, tags: 'tươi mát, healthy, chua ngọt',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80' },
  { name: 'Topper "Chúc Mừng"', type: 'topper', price: 25000, tags: 'kỷ niệm, sự kiện, vàng',
    image: 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=400&q=80' }
];

export async function seedInitialAccessories() {
  const accSnap = await getDocs(collection(db, 'accessories'));
  if (accSnap.size > 0) {
    showAdminToast('Đã có phụ kiện rồi, không cần seed', 'info');
    return;
  }
  try {
    for (const a of DEFAULT_ACCESSORIES) {
      await addDoc(collection(db, 'accessories'), { ...a, createdAt: serverTimestamp() });
    }
    showAdminToast(`Đã seed ${DEFAULT_ACCESSORIES.length} phụ kiện mặc định`, 'success');
  } catch (err) {
    showAdminToast('Lỗi seed phụ kiện: ' + err.message, 'error');
  }
}

// ============================================
// AUTO-SEED - Tự động nạp dữ liệu mẫu nếu DB rỗng (gọi từ trang chủ)
// Chạy âm thầm một lần, không hiển thị toast admin.
// ============================================
export async function autoSeedIfEmpty() {
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.size === 0) {
      for (const p of DEFAULT_PRODUCTS) {
        await addDoc(collection(db, 'products'), { ...p, createdAt: serverTimestamp() });
      }
      console.log(`✓ Auto-seed: ${DEFAULT_PRODUCTS.length} sản phẩm`);
    }
    const accSnap = await getDocs(collection(db, 'accessories'));
    if (accSnap.size === 0) {
      for (const a of DEFAULT_ACCESSORIES) {
        await addDoc(collection(db, 'accessories'), { ...a, createdAt: serverTimestamp() });
      }
      console.log(`✓ Auto-seed: ${DEFAULT_ACCESSORIES.length} phụ kiện`);
    }
  } catch (err) {
    console.warn('Auto-seed bỏ qua (có thể do quyền Firestore):', err.message);
  }
}

// ============================================
// CLEANUP - Cleanup listeners khi không ở admin nữa
// ============================================
export function cleanupAdminListeners() {
  if (productsListener) { productsListener(); productsListener = null; }
  if (usersListener) { usersListener(); usersListener = null; }
  if (ordersListener) { ordersListener(); ordersListener = null; }
}

// ============================================
// BIND ADMIN EVENTS
// ============================================
export function bindAdminEvents() {
  // Auto update category label
  const catSelect = $('#prodCategory');
  if (catSelect) {
    catSelect.addEventListener('change', () => {
      $('#prodCategoryLabel').value = '';
      updateCategoryLabel();
    });
  }

  // Product form submit
  $('#productForm')?.addEventListener('submit', saveProduct);

  // Add new product button
  $('#addProductBtn')?.addEventListener('click', () => openProductModal());

  // Admin nav tabs
  $$('.admin-nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      $$('.admin-nav-tab').forEach(t => t.classList.remove('active'));
      $$('.admin-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      $(`#adminTab-${target}`)?.classList.add('active');

      // Load data when switching tab
      if (target === 'dashboard') loadAdminDashboard().then(() => window.__animateDashboardData?.());
      else if (target === 'products') loadAdminProducts();
      else if (target === 'users') loadAdminUsers();
      else if (target === 'orders') loadAdminOrders();
    });
  });
}

export function openAdminPanel() {
  $('#adminPanel')?.classList.remove('d-none');
  document.body.style.overflow = 'hidden';
  // Load dashboard by default
  loadAdminDashboard();
}

export function closeAdminPanel() {
  $('#adminPanel')?.classList.add('d-none');
  document.body.style.overflow = '';
  cleanupAdminListeners();
}

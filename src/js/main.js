// ============================================
// MAIN APPLICATION - LUXURY CAKE (CakeCraft)
// ============================================
import {
  auth, db, googleProvider, authReady,
  signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
  doc, setDoc, getDoc, updateDoc, increment,
  collection, addDoc, getDocs, serverTimestamp, onSnapshot
} from './firebase-config.js';

import {
  isAdmin, autoSeedIfEmpty
} from './admin.js';

// ============================================
// PRODUCT DATA - Load from Firestore
// ============================================
let PRODUCTS = [];  // Sẽ được load từ Firestore
let productsLoaded = false;

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
  user: null,
  userData: null,
  cart: [],
  currentCategory: 'all',
  selectedTopupAmount: 100000,
  isAuthLoading: false,
  authInitialized: false  // Cờ: Firebase đã khởi tạo xong chưa
};

// Gemini API Configuration
const GEMINI_API_KEY = 'AIzaSyAz3ElYkrzRW795QaI_Kx1DVqMNFNUqFEw';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

// Phụ kiện trang trí (load từ Firestore) — dùng cho gợi ý upsell của AI
let ACCESSORIES = [];

// Trạng thái thiết kế bánh trên Canvas 3D
const cakeDesign = {
  tiers: 2,
  frosting: '#ffb89e',   // màu kem phủ (hồng đào)
  accessories: []         // danh sách phụ kiện đã kéo-thả (tên)
};

// ============================================
// UTILITIES
// ============================================
const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(n);

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showToast(message, type = 'success') {
  const existing = $('.toast-luxury');
  if (existing) existing.remove();

  const icons = {
    success: 'bi-check-circle-fill',
    error: 'bi-x-circle-fill',
    warning: 'bi-exclamation-circle-fill',
    info: 'bi-info-circle-fill'
  };

  const toast = document.createElement('div');
  toast.className = `toast-luxury ${type}`;
  toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 3500);
}

// ============================================
// AUTH FUNCTIONS
// ============================================
async function registerWithEmail(email, password, name) {
  state.isAuthLoading = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    // Create user document in Firestore
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: name,
      photoURL: '',
      walletBalance: 0,
      createdAt: serverTimestamp()
    });

    showToast(`Chào mừng ${name} đến với LUMIÈRE`, 'success');
    bootstrap.Modal.getInstance($('#authModal'))?.hide();
  } catch (err) {
    showToast(translateAuthError(err.code), 'error');
  } finally {
    state.isAuthLoading = false;
  }
}

async function loginWithEmail(email, password) {
  state.isAuthLoading = true;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast('Đăng nhập thành công', 'success');
    bootstrap.Modal.getInstance($('#authModal'))?.hide();
  } catch (err) {
    showToast(translateAuthError(err.code), 'error');
  } finally {
    state.isAuthLoading = false;
  }
}

// Helper: tạo user doc trong Firestore nếu chưa có
async function ensureUserDoc(user) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Quý khách',
      photoURL: user.photoURL || '',
      walletBalance: 0,
      createdAt: serverTimestamp()
    });
  }
}

async function loginWithGoogle() {
  if (state.isAuthLoading) return;
  state.isAuthLoading = true;

  // Hiển thị loading trên nút
  const btns = $$('.btn-google');
  btns.forEach(b => {
    b.disabled = true;
    b.style.opacity = '0.6';
  });

  try {
    // THỬ POPUP TRƯỚC
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(result.user);
    showToast(`Chào mừng ${result.user.displayName}`, 'success');
    bootstrap.Modal.getInstance($('#authModal'))?.hide();
  } catch (err) {
    console.error('Popup error:', err.code, err.message);

    // Nếu popup không hoạt động → CHUYỂN SANG REDIRECT
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/cancelled-popup-request' ||
      err.code === 'auth/internal-error' ||
      err.message?.includes('Pending promise')
    ) {
      // Popup bị block hoặc lỗi → dùng redirect
      if (err.code === 'auth/popup-closed-by-user') {
        showToast('Bạn đã đóng popup. Đang chuyển sang chế độ redirect...', 'warning');
      } else {
        showToast('Đang chuyển hướng đến Google...', 'info');
      }

      // Đợi 1 chút để user thấy toast rồi redirect
      setTimeout(async () => {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          console.error('Redirect error:', redirectErr);
          showToast('Lỗi đăng nhập. Vui lòng thử Email/Password.', 'error');
          state.isAuthLoading = false;
          btns.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
        }
      }, 800);
      return; // Không reset state vì sẽ redirect
    }

    // Lỗi domain
    if (err.code === 'auth/unauthorized-domain') {
      showToast('Domain chưa được cấp phép. Hãy dùng localhost thay vì 127.0.0.1', 'error');
    } else {
      showToast(translateAuthError(err.code), 'error');
    }
  } finally {
    state.isAuthLoading = false;
    btns.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
  }
}

// XỬ LÝ KẾT QUẢ TRẢ VỀ TỪ REDIRECT (chạy ngay khi load trang)
async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      await ensureUserDoc(result.user);
      showToast(`Chào mừng ${result.user.displayName}`, 'success');
    }
  } catch (err) {
    console.error('Redirect result error:', err);
    if (err.code === 'auth/unauthorized-domain') {
      showToast('Domain chưa được cấp phép trong Firebase Console', 'error');
    } else if (err.code) {
      showToast(translateAuthError(err.code), 'error');
    }
  }
}

async function logout() {
  try {
    await signOut(auth);
    showToast('Đã đăng xuất', 'info');
  } catch (err) {
    console.error(err);
  }
}

function translateAuthError(code) {
  const map = {
    'auth/email-already-in-use': 'Email đã được sử dụng',
    'auth/invalid-email': 'Email không hợp lệ',
    'auth/weak-password': 'Mật khẩu quá yếu (tối thiểu 6 ký tự)',
    'auth/user-not-found': 'Không tìm thấy tài khoản',
    'auth/wrong-password': 'Sai mật khẩu',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng',
    'auth/too-many-requests': 'Quá nhiều yêu cầu, vui lòng thử lại sau'
  };
  return map[code] || 'Có lỗi xảy ra. Vui lòng thử lại.';
}

// Listen to auth state - CHỜ persistence được set xong rồi mới lắng nghe
// Đây là điểm mấu chốt để F5 không bị mất phiên đăng nhập
authReady.then(() => {
  onAuthStateChanged(auth, async (user) => {
    state.authInitialized = true;

    if (user) {
      state.user = user;
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          state.userData = userSnap.data();
        } else {
          // User đăng nhập nhưng chưa có doc trong Firestore -> tạo mới
          const newData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Quý khách',
            photoURL: user.photoURL || '',
            walletBalance: 0,
            createdAt: serverTimestamp()
          };
          await setDoc(doc(db, 'users', user.uid), newData);
          state.userData = newData;
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        // Vẫn cho phép đăng nhập với data tối thiểu
        state.userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Quý khách',
          photoURL: user.photoURL || '',
          walletBalance: 0
        };
      }
      updateAuthUI();
      loadUserCart();
    } else {
      state.user = null;
      state.userData = null;
      state.cart = [];
      updateAuthUI();
      renderCart();
    }
  });
});

function updateAuthUI() {
  const guestArea = $('#guestArea');
  const userArea = $('#userArea');

  // Đánh dấu auth đã khởi tạo xong → hiển thị UI
  document.body.classList.add('auth-loaded');

  if (state.user && state.userData) {
    guestArea.classList.add('d-none');
    userArea.classList.remove('d-none');

    const avatar = $('#userAvatar');
    avatar.src = state.user.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(state.user.displayName || 'U')}&background=4B2E20&color=F5EFE3&bold=true`;

    $('#walletBalance').textContent = formatVND(state.userData.walletBalance || 0) + 'đ';
    $('#dropdownUserName').textContent = state.user.displayName || 'Quý khách';
    $('#dropdownUserEmail').textContent = state.user.email;

    // === Admin UI ===
    const isUserAdmin = isAdmin(state.user);
    const adminMenuItem = $('#adminMenuItem');
    const adminBadge = $('#adminBadge');
    if (adminMenuItem) {
      if (isUserAdmin) {
        adminMenuItem.classList.remove('d-none');
        adminBadge?.classList.remove('d-none');
      } else {
        adminMenuItem.classList.add('d-none');
        adminBadge?.classList.add('d-none');
      }
    }
  } else {
    guestArea.classList.remove('d-none');
    userArea.classList.add('d-none');
  }
}

// ============================================
// WALLET / TOPUP
// ============================================
async function topupWallet(amount) {
  if (!state.user) {
    showToast('Vui lòng đăng nhập để nạp tiền', 'warning');
    return;
  }
  if (amount < 10000) {
    showToast('Số tiền nạp tối thiểu 10.000đ', 'warning');
    return;
  }

  try {
    const userRef = doc(db, 'users', state.user.uid);
    await updateDoc(userRef, {
      walletBalance: increment(amount)
    });

    // Log transaction
    await addDoc(collection(db, 'transactions'), {
      userId: state.user.uid,
      type: 'topup',
      amount: amount,
      createdAt: serverTimestamp()
    });

    state.userData.walletBalance = (state.userData.walletBalance || 0) + amount;
    updateAuthUI();
    showToast(`Nạp thành công ${formatVND(amount)}đ`, 'success');
    bootstrap.Modal.getInstance($('#walletModal'))?.hide();
  } catch (err) {
    console.error(err);
    showToast('Lỗi nạp tiền. Vui lòng thử lại.', 'error');
  }
}

// ============================================
// CART CRUD - CREATE, READ, UPDATE, DELETE
// ============================================
async function loadUserCart() {
  if (!state.user) return;
  const cartSnap = await getDoc(doc(db, 'carts', state.user.uid));
  if (cartSnap.exists()) {
    state.cart = cartSnap.data().items || [];
  } else {
    state.cart = [];
  }
  renderCart();
}

async function saveCart() {
  if (!state.user) return;
  await setDoc(doc(db, 'carts', state.user.uid), {
    items: state.cart,
    updatedAt: serverTimestamp()
  });
}

// CREATE / UPDATE - Add to cart
async function addToCart(productId) {
  if (!state.user) {
    showToast('Vui lòng đăng nhập để mua hàng', 'warning');
    new bootstrap.Modal($('#authModal')).show();
    return;
  }

  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const existing = state.cart.find(i => i.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    });
  }

  await saveCart();
  renderCart();
  showToast(`Đã thêm ${product.name}`, 'success');
}

// UPDATE - Change quantity
async function updateQuantity(productId, change) {
  const item = state.cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) {
    return removeFromCart(productId);
  }

  await saveCart();
  renderCart();
}

// DELETE - Remove item
async function removeFromCart(productId) {
  const item = state.cart.find(i => i.id === productId);
  state.cart = state.cart.filter(i => i.id !== productId);
  await saveCart();
  renderCart();
  if (item) showToast(`Đã xóa ${item.name}`, 'info');
}

// READ - Render cart
function renderCart() {
  const cartBody = $('#cartBody');
  const cartFooter = $('#cartFooter');
  const cartCount = $('#cartCount');

  const totalQty = state.cart.reduce((s, i) => s + i.quantity, 0);
  cartCount.textContent = totalQty;
  cartCount.style.display = totalQty > 0 ? 'flex' : 'none';

  if (state.cart.length === 0) {
    cartBody.innerHTML = `
      <div class="cart-empty">
        <i class="bi bi-bag"></i>
        <h5>Giỏ hàng trống</h5>
        <p>Hãy chọn món yêu thích của bạn</p>
      </div>
    `;
    cartFooter.innerHTML = '';
    return;
  }

  cartBody.innerHTML = state.cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.image}" alt="${item.name}" class="cart-item-image">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatVND(item.price)}đ</div>
        <div class="cart-quantity-control">
          <button class="cart-qty-btn" data-action="dec" data-id="${item.id}">−</button>
          <span class="cart-qty-display">${item.quantity}</span>
          <button class="cart-qty-btn" data-action="inc" data-id="${item.id}">+</button>
        </div>
      </div>
      <button class="cart-item-remove" data-action="remove" data-id="${item.id}" title="Xóa">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  `).join('');

  const subtotal = state.cart.reduce((s, i) => s + i.price * i.quantity, 0);

  cartFooter.innerHTML = `
    <div class="cart-summary-row">
      <span class="label">Tạm tính</span>
      <span>${formatVND(subtotal)}đ</span>
    </div>
    <div class="cart-summary-row total">
      <span>Tổng cộng</span>
      <span>${formatVND(subtotal)}đ</span>
    </div>
    <button class="btn-luxury-primary mt-3" id="checkoutBtn">
      Thanh Toán Bằng Ví
    </button>
  `;

  // Bind cart events
  cartBody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'inc') updateQuantity(id, 1);
      else if (action === 'dec') updateQuantity(id, -1);
      else if (action === 'remove') removeFromCart(id);
    });
  });

  $('#checkoutBtn').addEventListener('click', checkout);
}

// ============================================
// CHECKOUT - PAY WITH WALLET
// ============================================
async function checkout() {
  if (!state.user) return;
  if (state.cart.length === 0) return;

  const total = state.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const balance = state.userData.walletBalance || 0;

  if (balance < total) {
    showToast(`Số dư không đủ. Cần thêm ${formatVND(total - balance)}đ`, 'error');
    setTimeout(() => {
      bootstrap.Offcanvas.getInstance($('#cartCanvas'))?.hide();
      new bootstrap.Modal($('#walletModal')).show();
    }, 800);
    return;
  }

  if (!confirm(`Xác nhận thanh toán ${formatVND(total)}đ từ ví của bạn?`)) return;

  try {
    // Deduct balance
    await updateDoc(doc(db, 'users', state.user.uid), {
      walletBalance: increment(-total)
    });

    // Save order
    await addDoc(collection(db, 'orders'), {
      userId: state.user.uid,
      items: state.cart,
      total: total,
      status: 'completed',
      createdAt: serverTimestamp()
    });

    // Log transaction
    await addDoc(collection(db, 'transactions'), {
      userId: state.user.uid,
      type: 'order',
      amount: -total,
      createdAt: serverTimestamp()
    });

    // Clear cart
    state.cart = [];
    state.userData.walletBalance = balance - total;
    await saveCart();
    updateAuthUI();
    renderCart();

    bootstrap.Offcanvas.getInstance($('#cartCanvas'))?.hide();
    showToast(`Đặt hàng thành công! Cảm ơn quý khách.`, 'success');
  } catch (err) {
    console.error(err);
    showToast('Lỗi thanh toán. Vui lòng thử lại.', 'error');
  }
}

// ============================================
// PRODUCT RENDERING
// ============================================

// Load products from Firestore with realtime updates
function loadProductsFromFirestore() {
  const grid = $('#productsGrid');
  if (!grid) return;

  // Hiển thị loading skeleton
  if (!productsLoaded) {
    grid.innerHTML = Array(4).fill(0).map(() => `
      <div class="col-lg-3 col-md-6 mb-4">
        <div class="product-card" style="opacity:0.5">
          <div class="product-image-wrap" style="background:var(--cream-200);height:280px;animation:pulse 1.5s ease-in-out infinite"></div>
          <div class="product-info">
            <div style="height:12px;background:var(--cream-200);margin-bottom:8px;width:40%"></div>
            <div style="height:20px;background:var(--cream-200);margin-bottom:8px"></div>
            <div style="height:14px;background:var(--cream-200);margin-bottom:4px"></div>
            <div style="height:14px;background:var(--cream-200);width:80%"></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Realtime listener
  onSnapshot(collection(db, 'products'), (snapshot) => {
    PRODUCTS = [];
    snapshot.forEach(d => PRODUCTS.push({ id: d.id, ...d.data() }));
    productsLoaded = true;

    // Sort theo thứ tự ổn định (theo created date hoặc name)
    PRODUCTS.sort((a, b) => {
      const aT = a.createdAt?.seconds || 0;
      const bT = b.createdAt?.seconds || 0;
      if (aT !== bT) return aT - bT;
      return (a.name || '').localeCompare(b.name || '');
    });

    // Re-render với category hiện tại
    renderProducts(state.currentCategory);
  }, (error) => {
    console.error('Load products error:', error);
    grid.innerHTML = `
      <div class="col-12 text-center" style="padding:4rem 1rem">
        <i class="bi bi-exclamation-triangle" style="font-size:3rem;color:var(--coffee);opacity:0.4"></i>
        <p style="margin-top:1rem;color:var(--coffee);font-family:var(--font-serif)">
          Không thể tải sản phẩm. ${error.message}
        </p>
      </div>
    `;
  });
}

function renderProducts(category = 'all') {
  const grid = $('#productsGrid');
  if (!grid) return;

  state.currentCategory = category;

  // Nếu chưa load xong → để loadProductsFromFirestore gọi lại
  if (!productsLoaded) return;

  const filtered = category === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === category);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center" style="padding:4rem 1rem">
        <i class="bi bi-cake2" style="font-size:3rem;color:var(--coffee);opacity:0.4"></i>
        <p style="margin-top:1rem;color:var(--coffee);font-family:var(--font-serif);font-size:1.1rem">
          ${category === 'all' ? 'Chưa có sản phẩm nào. Admin có thể thêm sản phẩm từ trang quản trị.' : 'Không có sản phẩm trong danh mục này.'}
        </p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map((p, idx) => `
    <div class="col-lg-3 col-md-6 mb-4 fade-in-up stagger-${(idx % 4) + 1}">
      <div class="product-card">
        <div class="product-image-wrap">
          ${p.badge ? `<span class="product-badge ${p.badgeType === 'gold' ? 'gold' : ''}">${p.badge}</span>` : ''}
          <img src="${p.image}" alt="${p.name}" class="product-image" loading="lazy"
               onerror="this.src='https://via.placeholder.com/600x280?text=No+Image'">
        </div>
        <div class="product-info">
          <div class="product-category">${p.categoryLabel || p.category}</div>
          <h4 class="product-name">${p.name}</h4>
          <p class="product-description">${p.description || ''}</p>
          <div class="product-footer">
            <div class="product-price">
              <span class="currency">₫</span>${formatVND(p.price)}
            </div>
            <button class="add-to-cart-btn" data-product="${p.id}" title="Thêm vào giỏ">
              <i class="bi bi-plus-lg"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Bind add to cart
  grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.product));
  });

  // Trigger fade-in observer
  observeFadeIn();
}

// ============================================
// CAKECRAFT - 3D CAKE CUSTOMIZER + GEMINI JSON ANALYZER
// ============================================

// Load phụ kiện từ Firestore (realtime)
function loadAccessoriesFromFirestore() {
  onSnapshot(collection(db, 'accessories'), (snapshot) => {
    ACCESSORIES = [];
    snapshot.forEach(d => ACCESSORIES.push({ id: d.id, ...d.data() }));
    renderAccessoryPalette();
  }, (err) => console.error('Load accessories error:', err));
}

const FROSTING_COLORS = [
  { name: 'Hồng đào', hex: '#ffb89e' },
  { name: 'Xanh mint', hex: '#bce3d6' },
  { name: 'Kem vani', hex: '#f6e9c9' },
  { name: 'Sô-cô-la', hex: '#7b4a2e' },
  { name: 'Hồng phấn', hex: '#ffa7b9' },
  { name: 'Tím lavender', hex: '#cdbce7' }
];

// Emoji cho chip phụ kiện trong bảng chọn
function accIcon(type) {
  const map = { 'topper': '🎀', 'nến': '🕯️', 'hoa decor': '🌹', 'topping': '🍓' };
  return map[type] || '⭐';
}

// ====== THREE.JS 3D CAKE ======
let three = {
  scene: null, camera: null, renderer: null, controls: null,
  cakeGroup: null, ready: false, raf: null
};

function initCake3D() {
  const stage = $('#cakeStage');
  if (!stage) return;

  // Three.js được nạp qua CDN trong index.html (global THREE)
  if (typeof THREE === 'undefined') {
    stage.innerHTML = '<p style="color:var(--coffee);font-family:var(--font-serif);text-align:center">Không tải được thư viện 3D. Kiểm tra kết nối mạng.</p>';
    return;
  }

  const width = stage.clientWidth || 400;
  const height = 360;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 3.2, 7);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  stage.innerHTML = '';
  stage.appendChild(renderer.domElement);

  // Ánh sáng
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(5, 10, 7);
  key.castShadow = true;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffe0ec, 0.5);
  fill.position.set(-5, 4, -3);
  scene.add(fill);

  // Đĩa đặt bánh
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.18, 48),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1 })
  );
  plate.position.y = -0.09;
  plate.receiveShadow = true;
  scene.add(plate);

  const cakeGroup = new THREE.Group();
  scene.add(cakeGroup);

  // OrbitControls (nạp kèm CDN) — xoay & zoom
  let controls = null;
  if (THREE.OrbitControls) {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI / 1.9;
    controls.target.set(0, 1.2, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
  }

  three = { scene, camera, renderer, controls, cakeGroup, ready: true, raf: null };

  // Resize
  window.addEventListener('resize', () => {
    if (!three.ready) return;
    const w = stage.clientWidth || width;
    three.camera.aspect = w / height;
    three.camera.updateProjectionMatrix();
    three.renderer.setSize(w, height);
  });

  // Vòng lặp render
  const animate = () => {
    three.raf = requestAnimationFrame(animate);
    if (three.controls) three.controls.update();
    three.renderer.render(three.scene, three.camera);
  };
  animate();

  updateCake3D();
}

// Chuyển mã màu hex (#rrggbb) sang số cho Three.js
function hexToInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

// Dựng lại mô hình bánh theo trạng thái cakeDesign
function updateCake3D() {
  if (!three.ready || !three.cakeGroup) return;
  const g = three.cakeGroup;
  // Xóa các mesh cũ
  while (g.children.length) {
    const c = g.children.pop();
    c.geometry?.dispose?.();
    c.material?.dispose?.();
  }

  const tiers = cakeDesign.tiers;
  const frostColor = hexToInt(cakeDesign.frosting);
  const spongeColor = 0xf3e4c8;
  const tierHeight = 0.85;
  const gap = 0.04;

  const frostMat = new THREE.MeshStandardMaterial({ color: frostColor, roughness: 0.55, metalness: 0.05 });
  const spongeMat = new THREE.MeshStandardMaterial({ color: spongeColor, roughness: 0.8 });

  let y = 0;
  for (let i = 0; i < tiers; i++) {
    const radius = 2.6 - i * (1.7 / Math.max(tiers, 1));
    // Lớp cốt (sponge) hơi thấp
    const sponge = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, tierHeight, 48),
      [frostMat, spongeMat, frostMat]  // mặt bên kem, mặt trên/dưới khác
    );
    sponge.position.y = y + tierHeight / 2;
    sponge.castShadow = true;
    g.add(sponge);

    // Viền kem chảy quanh mép trên (torus dẹt)
    const drip = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.12, 12, 48),
      frostMat
    );
    drip.rotation.x = Math.PI / 2;
    drip.position.y = y + tierHeight - 0.06;
    g.add(drip);

    y += tierHeight + gap;
  }

  // Phụ kiện trên tầng cao nhất
  const topY = y + 0.05;
  const topRadius = 2.6 - (tiers - 1) * (1.7 / Math.max(tiers, 1));
  cakeDesign.accessories.forEach((name, idx) => {
    const acc = ACCESSORIES.find(a => a.name === name);
    const obj = buildAccessoryMesh(acc?.type, idx, cakeDesign.accessories.length, topRadius);
    obj.position.y += topY;
    g.add(obj);
  });

  // Cập nhật target camera theo chiều cao bánh
  if (three.controls) three.controls.target.set(0, y / 2, 0);
  $('#tierCountLabel') && ($('#tierCountLabel').textContent = tiers);
}

// Tạo mesh đơn giản cho từng loại phụ kiện
function buildAccessoryMesh(type, idx, total, topRadius) {
  const group = new THREE.Group();
  const angle = (idx / Math.max(total, 1)) * Math.PI * 2;
  const r = total > 1 ? topRadius * 0.45 : 0;
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;

  if (type === 'nến') {
    const candle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.6, 12),
      new THREE.MeshStandardMaterial({ color: 0xff8fb3 })
    );
    candle.position.set(x, 0.3, z);
    group.add(candle);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffc107, emissive: 0xff9800, emissiveIntensity: 0.8 })
    );
    flame.position.set(x, 0.68, z);
    group.add(flame);
  } else if (type === 'hoa decor') {
    const petalMat = new THREE.MeshStandardMaterial({ color: 0xff6f91, roughness: 0.5 });
    for (let p = 0; p < 5; p++) {
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), petalMat);
      const a = (p / 5) * Math.PI * 2;
      petal.position.set(x + Math.cos(a) * 0.14, 0.15, z + Math.sin(a) * 0.14);
      group.add(petal);
    }
    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd54f })
    );
    center.position.set(x, 0.18, z);
    group.add(center);
  } else if (type === 'topping') {
    const berry = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xc2185b, roughness: 0.3 })
    );
    berry.position.set(x, 0.14, z);
    group.add(berry);
  } else {
    // topper: tấm tròn cắm que
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    stick.position.set(x, 0.25, z);
    group.add(stick);
    const sign = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 24),
      new THREE.MeshStandardMaterial({ color: 0xffb300, side: THREE.DoubleSide })
    );
    sign.position.set(x, 0.62, z);
    group.add(sign);
  }
  return group;
}

// Bảng phụ kiện để khách "kéo thả" (ở đây là click để thêm/bỏ)
function renderAccessoryPalette() {
  const pal = $('#accessoryPalette');
  if (!pal) return;
  if (ACCESSORIES.length === 0) {
    pal.innerHTML = `<p style="font-size:0.8rem;color:var(--coffee);opacity:0.7;margin:0">
      Chưa có phụ kiện. Admin vào "Tạo dữ liệu mẫu" để khởi tạo.</p>`;
    return;
  }
  pal.innerHTML = ACCESSORIES.map(a => {
    const on = cakeDesign.accessories.includes(a.name);
    return `<button type="button" class="acc-chip ${on ? 'selected' : ''}" data-acc="${a.name}">
      ${accIcon(a.type)} ${a.name} <span style="opacity:0.6">+${formatVND(a.price)}đ</span>
    </button>`;
  }).join('');
  pal.querySelectorAll('.acc-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const name = chip.dataset.acc;
      const i = cakeDesign.accessories.indexOf(name);
      if (i >= 0) cakeDesign.accessories.splice(i, 1);
      else cakeDesign.accessories.push(name);
      renderAccessoryPalette();
      updateCake3D();
    });
  });
}

function renderFrostingPalette() {
  const pal = $('#frostingPalette');
  if (!pal) return;
  pal.innerHTML = FROSTING_COLORS.map(c =>
    `<button type="button" class="frost-dot ${cakeDesign.frosting === c.hex ? 'selected' : ''}"
       data-hex="${c.hex}" title="${c.name}" style="background:${c.hex}"></button>`
  ).join('');
  pal.querySelectorAll('.frost-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      cakeDesign.frosting = dot.dataset.hex;
      renderFrostingPalette();
      updateCake3D();
    });
  });
}

// ====== GEMINI JSON MODE: thẩm định thiết kế + gợi ý upsell ======
async function analyzeCakeDesign(eventContext) {
  const accCatalog = ACCESSORIES.map(a =>
    `{ "name": "${a.name}", "type": "${a.type}", "price": ${a.price}, "tags": "${a.tags}" }`
  ).join(',\n');

  const frostName = (FROSTING_COLORS.find(c => c.hex === cakeDesign.frosting) || {}).name || cakeDesign.frosting;

  const prompt = `Bạn là chuyên gia thẩm định thiết kế bánh kem tại CakeCraft.
Khách đang thiết kế một chiếc bánh với:
- Số tầng: ${cakeDesign.tiers}
- Màu kem phủ: ${frostName}
- Phụ kiện đã chọn: ${cakeDesign.accessories.length ? cakeDesign.accessories.join(', ') : 'chưa có'}
- Ngữ cảnh sự kiện: "${eventContext || 'không nêu rõ'}"

KHO PHỤ KIỆN CÓ SẴN (chỉ được gợi ý từ danh sách này, dùng đúng tên):
[${accCatalog}]

Hãy đánh giá độ phù hợp của thiết kế với sự kiện và gợi ý tối đa 3 phụ kiện bán thêm phù hợp nhất từ kho.
CHỈ trả về JSON hợp lệ theo schema (không markdown, không giải thích ngoài JSON):
{
  "suitability_score": <số nguyên 0-100>,
  "verdict": "<nhận xét ngắn 1-2 câu bằng tiếng Việt>",
  "recommended_accessories": [
    { "name": "<tên đúng trong kho>", "reason": "<lý do ngắn>" }
  ]
}`;

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 600,
        responseMimeType: 'application/json'   // ★ JSON Mode
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'API error');
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

async function handleCakeAnalysis() {
  if (!productsLoaded) { showToast('Đang tải dữ liệu, thử lại sau giây lát', 'info'); return; }

  const eventContext = $('#eventContextInput').value.trim();
  const aiBtn = $('#analyzeCakeBtn');
  const aiResult = $('#aiResult');

  aiBtn.disabled = true;
  aiBtn.innerHTML = '<span class="ai-loading">AI đang thẩm định</span>';
  aiResult.classList.remove('show');

  try {
    let result;
    if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      result = await mockAnalysis(eventContext);
    } else {
      result = await analyzeCakeDesign(eventContext);
    }
    aiResult.innerHTML = renderAnalysisResult(result);
    bindUpsellButtons();
    aiResult.classList.add('show');
    aiResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    console.error('Gemini JSON error:', err);
    showToast('Lỗi kết nối AI. Vui lòng kiểm tra API key.', 'error');
    aiResult.innerHTML = '<p style="color:#c0392b">Không thể phân tích thiết kế. Kiểm tra API key trong main.js.</p>';
    aiResult.classList.add('show');
  } finally {
    aiBtn.disabled = false;
    aiBtn.innerHTML = '<i class="bi bi-stars"></i><span>AI Thẩm Định Thiết Kế</span>';
  }
}

function renderAnalysisResult(r) {
  const score = Math.max(0, Math.min(100, parseInt(r.suitability_score) || 0));
  const recs = Array.isArray(r.recommended_accessories) ? r.recommended_accessories : [];
  const recHtml = recs.map(rec => {
    const acc = ACCESSORIES.find(a => a.name === rec.name);
    if (!acc) return '';
    return `<div class="upsell-item">
      <img src="${acc.image}" alt="${acc.name}" onerror="this.style.display='none'">
      <div class="upsell-info">
        <strong>${acc.name}</strong>
        <span class="upsell-reason">${rec.reason || ''}</span>
        <span class="upsell-price">+${formatVND(acc.price)}đ</span>
      </div>
      <button class="add-upsell-btn" data-acc-id="${acc.id}"><i class="bi bi-plus-lg"></i></button>
    </div>`;
  }).join('');

  return `<h6>Kết Quả Thẩm Định Của AI</h6>
    <div class="score-bar-wrap">
      <div class="score-bar" style="width:${score}%"></div>
      <span class="score-label">Độ phù hợp: ${score}/100</span>
    </div>
    <p style="margin:1rem 0">${r.verdict || ''}</p>
    ${recHtml ? `<div class="upsell-title">Phụ kiện AI gợi ý thêm</div>${recHtml}` : ''}`;
}

// Thêm phụ kiện gợi ý vào giỏ hàng (upsell)
function bindUpsellButtons() {
  $$('.add-upsell-btn').forEach(btn => {
    btn.addEventListener('click', () => addAccessoryToCart(btn.dataset.accId));
  });
}

async function addAccessoryToCart(accId) {
  if (!state.user) {
    showToast('Vui lòng đăng nhập để mua hàng', 'warning');
    new bootstrap.Modal($('#authModal')).show();
    return;
  }
  const acc = ACCESSORIES.find(a => a.id === accId);
  if (!acc) return;
  const cartId = 'acc_' + acc.id;
  const existing = state.cart.find(i => i.id === cartId);
  if (existing) existing.quantity += 1;
  else state.cart.push({ id: cartId, name: acc.name, price: acc.price, image: acc.image, quantity: 1 });
  await saveCart();
  renderCart();
  showToast(`Đã thêm phụ kiện ${acc.name}`, 'success');
}

// Mock khi chưa có API key
async function mockAnalysis(eventContext) {
  await new Promise(r => setTimeout(r, 1200));
  const recs = ACCESSORIES.slice(0, 3).map(a => ({ name: a.name, reason: 'Phù hợp với phong cách thiết kế của bạn.' }));
  return {
    suitability_score: 78,
    verdict: `Thiết kế ${cakeDesign.tiers} tầng của bạn khá hài hòa cho dịp "${eventContext || 'sự kiện'}". ⚠ Đây là chế độ Demo.`,
    recommended_accessories: recs
  };
}

// ============================================
// SCROLL ANIMATIONS
// ============================================
let observer;
function observeFadeIn() {
  if (observer) observer.disconnect();

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  $$('.fade-in-up:not(.visible)').forEach(el => observer.observe(el));
}

// ============================================
// EVENT BINDINGS
// ============================================
function bindEvents() {
  // Preloader - ẩn khi load xong, nhưng luôn ẩn sau tối đa 2.5s
  // (phòng khi CDN Three.js tải chậm/bị chặn khiến 'load' không bắn)
  const hidePreloader = () => $('#preloader')?.classList.add('hidden');
  if (document.readyState === 'complete') {
    setTimeout(hidePreloader, 400);
  } else {
    window.addEventListener('load', () => setTimeout(hidePreloader, 400));
  }
  setTimeout(hidePreloader, 2500); // fallback an toàn

  // Navbar scroll
  window.addEventListener('scroll', () => {
    const nav = $('.navbar-luxury');
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });

  // Auth modal switching
  $('#switchToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    $('#loginPanel').classList.add('d-none');
    $('#registerPanel').classList.remove('d-none');
  });

  $('#switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    $('#registerPanel').classList.add('d-none');
    $('#loginPanel').classList.remove('d-none');
  });

  // Login form
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value;
    const pwd = $('#loginPassword').value;
    await loginWithEmail(email, pwd);
  });

  // Register form
  $('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#regName').value;
    const email = $('#regEmail').value;
    const pwd = $('#regPassword').value;
    await registerWithEmail(email, pwd, name);
  });

  // Google login
  $$('.btn-google').forEach(btn => btn.addEventListener('click', loginWithGoogle));

  // Logout
  $('#logoutBtn').addEventListener('click', logout);

  // Admin Panel - mở trang admin riêng (admin.html)
  $('#openAdminBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!state.user || !isAdmin(state.user)) {
      showToast('Bạn không có quyền truy cập', 'error');
      return;
    }
    window.location.href = 'admin.html';
  });

  // Open auth modal
  $('#openAuthBtn').addEventListener('click', () => {
    new bootstrap.Modal($('#authModal')).show();
  });

  // Open wallet modal
  $$('.open-wallet').forEach(btn => btn.addEventListener('click', () => {
    if (!state.user) {
      showToast('Vui lòng đăng nhập', 'warning');
      return;
    }
    $('#currentBalance').textContent = formatVND(state.userData.walletBalance || 0) + 'đ';
    new bootstrap.Modal($('#walletModal')).show();
  }));

  // Quick amount buttons
  $$('.amount-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.amount-quick').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selectedTopupAmount = parseInt(btn.dataset.amount);
      $('#customAmount').value = '';
    });
  });

  $('#customAmount').addEventListener('input', (e) => {
    $$('.amount-quick').forEach(b => b.classList.remove('selected'));
    const v = parseInt(e.target.value) || 0;
    state.selectedTopupAmount = v;
  });

  // Topup confirm
  $('#confirmTopup').addEventListener('click', () => {
    topupWallet(state.selectedTopupAmount);
  });

  // Category tabs
  $$('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderProducts(tab.dataset.category);
    });
  });

  // CakeCraft 3D Customizer controls
  $('#tierMinus')?.addEventListener('click', () => {
    cakeDesign.tiers = Math.max(1, cakeDesign.tiers - 1);
    updateCake3D();
  });
  $('#tierPlus')?.addEventListener('click', () => {
    cakeDesign.tiers = Math.min(4, cakeDesign.tiers + 1);
    updateCake3D();
  });

  // AI thẩm định thiết kế (Gemini JSON Mode)
  $('#analyzeCakeBtn')?.addEventListener('click', handleCakeAnalysis);

  // Smooth scroll on nav links
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const navHeight = 80;
        window.scrollTo({
          top: target.offsetTop - navHeight,
          behavior: 'smooth'
        });
      }
    });
  });
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  await autoSeedIfEmpty();         // Tự nạp dữ liệu mẫu nếu DB rỗng
  loadProductsFromFirestore();     // Load realtime từ Firestore
  loadAccessoriesFromFirestore();  // Load phụ kiện cho AI upsell
  bindEvents();
  observeFadeIn();
  // Khởi tạo Canvas 3D (Three.js) + bảng màu/phụ kiện
  initCake3D();
  renderFrostingPalette();
  renderAccessoryPalette();
  // QUAN TRỌNG: Xử lý kết quả từ Google Redirect (nếu có)
  handleRedirectResult();
});

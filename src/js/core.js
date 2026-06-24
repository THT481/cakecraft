// ============================================================
// CakeCraft — CORE (shared across all pages)
// ============================================================
import {
  auth, db, googleProvider, authReady,
  signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
  doc, setDoc, getDoc, updateDoc, increment,
  collection, addDoc, getDocs, serverTimestamp, onSnapshot
} from './firebase-config.js';
import { isAdmin, autoSeedIfEmpty } from './admin.js';
import {
  initMotionDefaults, revealOnScroll, heroIntro,
  animatePreloaderOut, animatePreloaderIn, drawerOpen, drawerClose, revealNow
} from './motion.js';

// ---------- shorthands ----------
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

// ---------- shared state ----------
export const state = {
  user: null, userData: null, cart: [],
  isAuthLoading: false
};
export let PRODUCTS = [];
export let ACCESSORIES = [];
const productSubs = [];
const accessorySubs = [];
export function onProducts(cb) { productSubs.push(cb); if (PRODUCTS.length) cb(PRODUCTS); }
export function onAccessories(cb) { accessorySubs.push(cb); if (ACCESSORIES.length) cb(ACCESSORIES); }

// ============================================================
// TOAST
// ============================================================
export function showToast(message, type = 'success') {
  $('.toast-c')?.remove();
  const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', warning: 'bi-exclamation-circle-fill', info: 'bi-info-circle-fill' };
  const t = document.createElement('div');
  t.className = `toast-c ${type}`;
  t.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${message}</span>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 3400);
}

// ============================================================
// CONFETTI
// ============================================================
export function confettiBurst(count = 90) {
  let layer = $('#confetti');
  if (!layer) { layer = document.createElement('div'); layer.id = 'confetti'; document.body.appendChild(layer); }
  const colors = ['#C0894B', '#C9A24B', '#D8B98C', '#7A4E24', '#E2C783', '#8FA98C'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = (2 + Math.random() * 2) + 's';
    p.style.animationDelay = (Math.random() * 0.4) + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    if (Math.random() > 0.5) p.style.borderRadius = '50%';
    layer.appendChild(p);
    setTimeout(() => p.remove(), 4500);
  }
}

// ============================================================
// SCROLL REVEAL
// ============================================================
export function initReveal() {
  initMotionDefaults();
  revealOnScroll();
  heroIntro();
}

// ============================================================
// NAVBAR (scroll style + mobile toggle + active link)
// ============================================================
export function initNav() {
  const nav = $('.nav-c');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  $('.nav-toggle')?.addEventListener('click', () => $('.nav-links')?.classList.toggle('open'));

  // active link by filename
  const page = location.pathname.split('/').pop() || 'index.html';
  $$('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) a.classList.add('active');
  });
}

// ============================================================
// PRELOADER (always hides, even if 'load' never fires)
// ============================================================
export function initPreloader() {
  const el = $('#preloader');
  animatePreloaderIn(el);
  const hide = () => animatePreloaderOut(el);
  if (document.readyState === 'complete') setTimeout(hide, 300);
  else window.addEventListener('load', () => setTimeout(hide, 300));
  setTimeout(hide, 2200);
}

// ============================================================
// PRODUCTS / ACCESSORIES realtime
// ============================================================
export function loadCatalog() {
  onSnapshot(collection(db, 'products'), (snap) => {
    PRODUCTS = []; snap.forEach(d => PRODUCTS.push({ id: d.id, ...d.data() }));
    PRODUCTS.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    productSubs.forEach(cb => cb(PRODUCTS));
  }, (e) => console.error('products', e));

  onSnapshot(collection(db, 'accessories'), (snap) => {
    ACCESSORIES = []; snap.forEach(d => ACCESSORIES.push({ id: d.id, ...d.data() }));
    accessorySubs.forEach(cb => cb(ACCESSORIES));
  }, (e) => console.error('accessories', e));
}

// ============================================================
// AUTH
// ============================================================
function translateAuthError(code) {
  const m = {
    'auth/email-already-in-use': 'Email đã được sử dụng',
    'auth/invalid-email': 'Email không hợp lệ',
    'auth/weak-password': 'Mật khẩu quá yếu (tối thiểu 6 ký tự)',
    'auth/user-not-found': 'Không tìm thấy tài khoản',
    'auth/wrong-password': 'Sai mật khẩu',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng',
    'auth/too-many-requests': 'Quá nhiều yêu cầu, vui lòng thử lại sau'
  };
  return m[code] || 'Có lỗi xảy ra. Vui lòng thử lại.';
}

async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const data = {
      uid: user.uid, email: user.email,
      displayName: user.displayName || 'Quý khách',
      photoURL: user.photoURL || '', walletBalance: 0, createdAt: serverTimestamp()
    };
    await setDoc(ref, data);
    return data;
  }
  return snap.data();
}

export async function registerWithEmail(email, password, name) {
  state.isAuthLoading = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid, email: cred.user.email, displayName: name,
      photoURL: '', walletBalance: 0, createdAt: serverTimestamp()
    });
    showToast(`Chào mừng ${name} đến CakeCraft!`, 'success');
    confettiBurst();
    closeModal('authModal');
  } catch (err) { showToast(translateAuthError(err.code), 'error'); }
  finally { state.isAuthLoading = false; }
}

export async function loginWithEmail(email, password) {
  state.isAuthLoading = true;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast('Đăng nhập thành công!', 'success');
    closeModal('authModal');
  } catch (err) { showToast(translateAuthError(err.code), 'error'); }
  finally { state.isAuthLoading = false; }
}

export async function loginWithGoogle() {
  if (state.isAuthLoading) return;
  state.isAuthLoading = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(result.user);
    showToast(`Chào mừng ${result.user.displayName}`, 'success');
    confettiBurst();
    closeModal('authModal');
  } catch (err) {
    if (['auth/popup-blocked','auth/popup-closed-by-user','auth/cancelled-popup-request','auth/internal-error'].includes(err.code)) {
      showToast('Đang chuyển hướng đến Google...', 'info');
      setTimeout(() => signInWithRedirect(auth, googleProvider).catch(() => showToast('Lỗi đăng nhập, thử Email/Mật khẩu.', 'error')), 700);
      return;
    }
    if (err.code === 'auth/unauthorized-domain') showToast('Domain chưa được cấp phép. Dùng localhost thay vì 127.0.0.1', 'error');
    else showToast(translateAuthError(err.code), 'error');
  } finally { state.isAuthLoading = false; }
}

async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) { await ensureUserDoc(result.user); showToast(`Chào mừng ${result.user.displayName}`, 'success'); }
  } catch (err) { if (err.code) console.warn(err.code); }
}

export async function logout() {
  try { await signOut(auth); showToast('Đã đăng xuất', 'info'); } catch (e) { console.error(e); }
}

// Auth state listener
authReady.then(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      state.user = user;
      try { state.userData = await ensureUserDoc(user); }
      catch { state.userData = { uid: user.uid, email: user.email, displayName: user.displayName || 'Quý khách', walletBalance: 0 }; }
      updateAuthUI();
      loadUserCart();
    } else {
      state.user = null; state.userData = null; state.cart = [];
      updateAuthUI(); renderCart();
    }
  });
});

export function updateAuthUI() {
  document.body.classList.add('auth-loaded');
  const guest = $('#guestArea'), userArea = $('#userArea');
  if (state.user && state.userData) {
    guest?.classList.add('hidden-c');
    userArea?.classList.remove('hidden-c');
    const av = $('#userAvatar');
    if (av) av.src = state.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.user.displayName || 'U')}&background=B5803F&color=fff&bold=true`;
    $('#walletBalance') && ($('#walletBalance').textContent = formatVND(state.userData.walletBalance) + 'đ');
    $('#menuUserName') && ($('#menuUserName').textContent = state.user.displayName || 'Quý khách');
    $('#menuUserEmail') && ($('#menuUserEmail').textContent = state.user.email);
    const adminItem = $('#adminMenuItem');
    if (adminItem) adminItem.classList.toggle('hidden-c', !isAdmin(state.user));
  } else {
    guest?.classList.remove('hidden-c');
    userArea?.classList.add('hidden-c');
  }
}

// ============================================================
// WALLET
// ============================================================
export async function topupWallet(amount) {
  if (!state.user) { showToast('Vui lòng đăng nhập để nạp tiền', 'warning'); return; }
  if (amount < 10000) { showToast('Tối thiểu 10.000đ', 'warning'); return; }
  try {
    await updateDoc(doc(db, 'users', state.user.uid), { walletBalance: increment(amount) });
    await addDoc(collection(db, 'transactions'), { userId: state.user.uid, type: 'topup', amount, createdAt: serverTimestamp() });
    state.userData.walletBalance = (state.userData.walletBalance || 0) + amount;
    updateAuthUI(); confettiBurst(60);
    showToast(`Nạp thành công ${formatVND(amount)}đ`, 'success');
    closeModal('walletModal');
  } catch (e) { console.error(e); showToast('Lỗi nạp tiền.', 'error'); }
}

// ============================================================
// CART
// ============================================================
async function loadUserCart() {
  if (!state.user) return;
  try {
    const snap = await getDoc(doc(db, 'carts', state.user.uid));
    state.cart = snap.exists() ? (snap.data().items || []) : [];
  } catch { state.cart = []; }
  renderCart();
}
async function saveCart() {
  if (!state.user) return;
  await setDoc(doc(db, 'carts', state.user.uid), { items: state.cart, updatedAt: serverTimestamp() });
}
export async function addToCart(productId) {
  if (!state.user) { showToast('Vui lòng đăng nhập để mua hàng', 'warning'); openModal('authModal'); return; }
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return;
  const ex = state.cart.find(i => i.id === productId);
  if (ex) ex.quantity += 1;
  else state.cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, quantity: 1 });
  await saveCart(); renderCart();
  showToast(`Đã thêm ${p.name}`, 'success');
  openDrawer();
}

// Add a custom-designed cake (unique line item each time)
export async function addCustomCakeToCart({ name, price, image, meta }) {
  if (!state.user) { showToast('Vui lòng đăng nhập để đặt bánh', 'warning'); openModal('authModal'); return false; }
  const id = 'custom_' + Date.now();
  state.cart.push({ id, name, price, image: image || '', quantity: 1, custom: true, meta: meta || '' });
  await saveCart(); renderCart();
  showToast('Đã thêm bánh thiết kế vào giỏ', 'success');
  openDrawer();
  return true;
}
export async function addAccessoryToCart(accId) {
  if (!state.user) { showToast('Vui lòng đăng nhập để mua hàng', 'warning'); openModal('authModal'); return; }
  const a = ACCESSORIES.find(x => x.id === accId);
  if (!a) return;
  const cid = 'acc_' + a.id;
  const ex = state.cart.find(i => i.id === cid);
  if (ex) ex.quantity += 1;
  else state.cart.push({ id: cid, name: a.name, price: a.price, image: a.image, quantity: 1 });
  await saveCart(); renderCart();
  showToast(`Đã thêm ${a.name}`, 'success');
}
async function updateQty(id, change) {
  const it = state.cart.find(i => i.id === id);
  if (!it) return;
  it.quantity += change;
  if (it.quantity <= 0) { state.cart = state.cart.filter(i => i.id !== id); }
  await saveCart(); renderCart();
}
async function removeItem(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  await saveCart(); renderCart();
}

export function renderCart() {
  const body = $('#drawerBody'), foot = $('#drawerFoot'), count = $('#cartCount');
  const totalQty = state.cart.reduce((s, i) => s + i.quantity, 0);
  if (count) { count.textContent = totalQty; count.style.display = totalQty > 0 ? 'flex' : 'none'; }
  if (!body) return;
  if (state.cart.length === 0) {
    body.innerHTML = `<div class="empty-state"><div class="ico"><i class="bi bi-bag-x"></i></div><h5 style="font-family:var(--font-display);color:var(--cocoa-deep)">Giỏ hàng trống</h5><p>Hãy chọn chiếc bánh yêu thích nhé!</p></div>`;
    if (foot) foot.innerHTML = ''; return;
  }
  body.innerHTML = state.cart.map(i => `
    <div class="cart-row">
      ${i.image ? `<img src="${i.image}" alt="${i.name}" onerror="this.style.visibility='hidden'">` : `<div class="cart-row-ph"><i class="bi bi-cake2"></i></div>`}
      <div style="flex:1">
        <div class="nm">${i.name}</div>
        ${i.meta ? `<div class="cart-meta">${i.meta}</div>` : ''}
        <div class="pr">${formatVND(i.price)}đ</div>
        <div class="qty-ctrl">
          <button data-act="dec" data-id="${i.id}">−</button>
          <span>${i.quantity}</span>
          <button data-act="inc" data-id="${i.id}">+</button>
          <button data-act="rm" data-id="${i.id}" style="margin-left:auto;background:none;color:var(--muted)"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>`).join('');
  const subtotal = state.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  if (foot) {
    foot.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-family:var(--font-display);font-size:1.3rem;color:var(--cocoa-deep);margin-bottom:1rem">
        <span>Tổng cộng</span><span style="color:var(--berry)">${formatVND(subtotal)}đ</span>
      </div>
      <button class="btn-c btn-primary-c" style="width:100%;justify-content:center" id="checkoutBtn">
        <i class="bi bi-wallet2"></i> Thanh toán bằng ví
      </button>`;
    $('#checkoutBtn')?.addEventListener('click', checkout);
  }
  body.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act, id = b.dataset.id;
    if (a === 'inc') updateQty(id, 1); else if (a === 'dec') updateQty(id, -1); else removeItem(id);
  }));
}

async function checkout() {
  if (!state.user || state.cart.length === 0) return;
  const total = state.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const balance = state.userData.walletBalance || 0;
  if (balance < total) {
    showToast(`Số dư không đủ. Cần thêm ${formatVND(total - balance)}đ`, 'error');
    setTimeout(() => { closeDrawer(); openModal('walletModal'); }, 800);
    return;
  }
  if (!confirm(`Xác nhận thanh toán ${formatVND(total)}đ từ ví?`)) return;
  try {
    await updateDoc(doc(db, 'users', state.user.uid), { walletBalance: increment(-total) });
    await addDoc(collection(db, 'orders'), { userId: state.user.uid, items: state.cart, total, status: 'completed', createdAt: serverTimestamp() });
    state.cart = []; state.userData.walletBalance = balance - total;
    await saveCart(); updateAuthUI(); renderCart();
    closeDrawer(); confettiBurst(120);
    showToast('Đặt hàng thành công! Cảm ơn quý khách.', 'success');
  } catch (e) { console.error(e); showToast('Lỗi thanh toán.', 'error'); }
}

// ============================================================
// MODALS & DRAWER (custom, no Bootstrap)
// ============================================================
export function openModal(id) { $('#' + id)?.classList.add('open'); }
export function closeModal(id) { $('#' + id)?.classList.remove('open'); }
export function openDrawer() { drawerOpen($('#cartDrawer'), $('#drawerBackdrop')); }
export function closeDrawer() { drawerClose($('#cartDrawer'), $('#drawerBackdrop')); }

// ============================================================
// WIRE SHARED UI (call once per page after header injected)
// ============================================================
export function wireShared() {
  initNav();
  initPreloader();
  handleRedirectResult();

  // Modal open/close
  $$('[data-open-modal]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); openModal(b.dataset.openModal); }));
  $$('[data-close-modal]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.closeModal)));
  $$('.modal-backdrop-c').forEach(bd => bd.addEventListener('click', () => bd.closest('.modal-c')?.classList.remove('open')));

  // Cart drawer
  $('#openCart')?.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); });
  $('#closeDrawer')?.addEventListener('click', closeDrawer);
  $('#drawerBackdrop')?.addEventListener('click', closeDrawer);

  // Auth tabs
  $$('.auth-tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const mode = tab.dataset.mode;
    $('#loginForm')?.classList.toggle('hidden-c', mode !== 'login');
    $('#registerForm')?.classList.toggle('hidden-c', mode !== 'register');
  }));

  // Auth submit
  $('#loginSubmit')?.addEventListener('click', () => {
    loginWithEmail($('#loginEmail').value.trim(), $('#loginPassword').value);
  });
  $('#registerSubmit')?.addEventListener('click', () => {
    const name = $('#regName').value.trim(), email = $('#regEmail').value.trim(), pw = $('#regPassword').value;
    if (!name || !email || pw.length < 6) { showToast('Điền đủ thông tin, mật khẩu ≥ 6 ký tự', 'warning'); return; }
    registerWithEmail(email, pw, name);
  });
  $$('.btn-google').forEach(b => b.addEventListener('click', loginWithGoogle));
  $('#logoutBtn')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });

  // User dropdown toggle
  $('#userAvatarBtn')?.addEventListener('click', () => $('#userMenu')?.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    const menu = $('#userMenu'), btn = $('#userAvatarBtn');
    if (menu && !menu.contains(e.target) && !btn?.contains(e.target)) menu.classList.remove('open');
  });

  // Wallet
  $('#openWallet')?.addEventListener('click', (e) => { e.preventDefault(); openModal('walletModal'); });
  $$('.topup-amt').forEach(b => b.addEventListener('click', () => {
    $$('.topup-amt').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  }));
  $('#topupConfirm')?.addEventListener('click', () => {
    const sel = $('.topup-amt.active');
    const amt = sel ? parseInt(sel.dataset.amt) : parseInt($('#topupCustom')?.value || '0');
    topupWallet(amt);
  });

  // Admin link
  $('#adminMenuItem')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (state.user && isAdmin(state.user)) location.href = 'admin.html';
    else showToast('Bạn không có quyền truy cập', 'error');
  });

  initReveal();
}

// Seed-if-empty (safe to call on home)
export async function ensureSeed() { await autoSeedIfEmpty(); }

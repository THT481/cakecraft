// ============================================================
// CakeCraft — Shared HTML partials (nav, footer, modals, drawer)
// No emoji. Icons via Bootstrap Icons. Injected on every page.
// ============================================================

const BRAND = `<a class="brand-c" href="index.html"><span class="brand-mark">C</span><span class="brand-word">CAKECRAFT</span></a>`;

const NAV = `
<nav class="nav-c">
  ${BRAND}
  <ul class="nav-links" id="navLinks">
    <li><a href="index.html">Trang chủ</a></li>
    <li><a href="menu.html">Thực đơn</a></li>
    <li><a href="design.html">Thiết kế</a></li>
    <li><a href="about.html">Giới thiệu</a></li>
    <li><a href="contact.html">Liên hệ</a></li>
  </ul>
  <div class="nav-actions">
    <button class="icon-chip" id="openCart" title="Giỏ hàng" aria-label="Giỏ hàng">
      <i class="bi bi-bag"></i><span class="cart-count" id="cartCount" style="display:none">0</span>
    </button>
    <span id="guestArea" class="hidden-c">
      <button class="btn-c btn-primary-c" data-open-modal="authModal"><i class="bi bi-person"></i> Đăng nhập</button>
    </span>
    <span id="userArea" class="hidden-c" style="position:relative">
      <button class="icon-chip" id="userAvatarBtn" style="padding:0;overflow:hidden" aria-label="Tài khoản">
        <img id="userAvatar" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">
      </button>
      <div id="userMenu" class="user-menu">
        <div class="um-head">
          <div class="um-name" id="menuUserName">Quý khách</div>
          <div class="um-email" id="menuUserEmail"></div>
        </div>
        <div class="um-wallet"><i class="bi bi-wallet2"></i> Số dư: <strong id="walletBalance">0đ</strong></div>
        <a class="um-item" id="openWallet"><i class="bi bi-plus-circle"></i> Nạp tiền</a>
        <a class="um-item" id="openCart2"><i class="bi bi-bag"></i> Giỏ hàng</a>
        <a class="um-item hidden-c" id="adminMenuItem"><i class="bi bi-shield-check"></i> Trang quản trị</a>
        <a class="um-item" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> Đăng xuất</a>
      </div>
    </span>
    <button class="nav-toggle" id="navToggle" aria-label="Menu"><i class="bi bi-list"></i></button>
  </div>
</nav>`;

const FOOTER = `
<footer class="footer-c">
  <div class="container-c">
    <div class="footer-grid">
      <div>
        <div class="footer-brand"><span class="brand-mark dark">C</span> CAKECRAFT</div>
        <p>Tiệm bánh kem thủ công. Tự tay thiết kế chiếc bánh của bạn và để trợ lý AI hoàn thiện từng chi tiết.</p>
        <div class="footer-social">
          <a href="#" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
          <a href="#" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
          <a href="#" aria-label="TikTok"><i class="bi bi-tiktok"></i></a>
          <a href="#" aria-label="YouTube"><i class="bi bi-youtube"></i></a>
        </div>
      </div>
      <div>
        <div class="footer-h">Khám phá</div>
        <ul class="footer-list">
          <li><a href="index.html">Trang chủ</a></li>
          <li><a href="menu.html">Thực đơn</a></li>
          <li><a href="design.html">Thiết kế</a></li>
          <li><a href="about.html">Giới thiệu</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-h">Hỗ trợ</div>
        <ul class="footer-list">
          <li><a href="contact.html">Liên hệ</a></li>
          <li><a href="contact.html">Đặt bánh theo yêu cầu</a></li>
          <li><a href="#">Chính sách giao hàng</a></li>
          <li><a href="#">Câu hỏi thường gặp</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-h">Ghé tiệm</div>
        <ul class="footer-list">
          <li><i class="bi bi-geo-alt"></i> 611/14D Điện Biên Phủ, Bàn Cờ, Hồ Chí Minh</li>
          <li><i class="bi bi-telephone"></i> 0962159860</li>
          <li><i class="bi bi-envelope"></i> hello@cakecraft.vn</li>
          <li><i class="bi bi-clock"></i> 8:00 – 22:00 hằng ngày</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">© 2026 CakeCraft · Thủ công &amp; tỉ mỉ.</div>
  </div>
</footer>`;

const MODALS = `
<div class="modal-c" id="authModal">
  <div class="modal-backdrop-c"></div>
  <div class="modal-box">
    <button class="modal-close" data-close-modal="authModal" aria-label="Đóng"><i class="bi bi-x-lg"></i></button>
    <h3>Chào mừng đến CakeCraft</h3>
    <div class="auth-tabs">
      <button class="auth-tab active" data-mode="login">Đăng nhập</button>
      <button class="auth-tab" data-mode="register">Đăng ký</button>
    </div>
    <div id="loginForm">
      <div class="field-c"><label>Email</label><input class="input-c" type="email" id="loginEmail" placeholder="ban@email.com"></div>
      <div class="field-c"><label>Mật khẩu</label><input class="input-c" type="password" id="loginPassword" placeholder="••••••"></div>
      <button class="btn-c btn-primary-c" id="loginSubmit" style="width:100%;justify-content:center">Đăng nhập</button>
    </div>
    <div id="registerForm" class="hidden-c">
      <div class="field-c"><label>Họ tên</label><input class="input-c" type="text" id="regName" placeholder="Nguyễn Văn A"></div>
      <div class="field-c"><label>Email</label><input class="input-c" type="email" id="regEmail" placeholder="ban@email.com"></div>
      <div class="field-c"><label>Mật khẩu</label><input class="input-c" type="password" id="regPassword" placeholder="Tối thiểu 6 ký tự"></div>
      <button class="btn-c btn-primary-c" id="registerSubmit" style="width:100%;justify-content:center">Tạo tài khoản</button>
    </div>
    <div class="divider-c">— hoặc —</div>
    <button class="btn-google"><i class="bi bi-google"></i> Tiếp tục với Google</button>
  </div>
</div>

<div class="modal-c" id="walletModal">
  <div class="modal-backdrop-c"></div>
  <div class="modal-box">
    <button class="modal-close" data-close-modal="walletModal" aria-label="Đóng"><i class="bi bi-x-lg"></i></button>
    <h3>Nạp tiền vào ví</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.7rem;margin-bottom:1rem">
      <button class="btn-c btn-ghost-c topup-amt active" data-amt="100000" style="justify-content:center">100.000đ</button>
      <button class="btn-c btn-ghost-c topup-amt" data-amt="200000" style="justify-content:center">200.000đ</button>
      <button class="btn-c btn-ghost-c topup-amt" data-amt="500000" style="justify-content:center">500.000đ</button>
      <button class="btn-c btn-ghost-c topup-amt" data-amt="1000000" style="justify-content:center">1.000.000đ</button>
    </div>
    <div class="field-c"><label>Hoặc số khác (VND)</label><input class="input-c" type="number" id="topupCustom" placeholder="VD: 350000"></div>
    <button class="btn-c btn-gold-c" id="topupConfirm" style="width:100%;justify-content:center">Xác nhận nạp</button>
    <p style="font-size:.78rem;color:var(--muted);text-align:center;margin-top:.8rem">Ví demo — nạp ngay, không cần thanh toán thật.</p>
  </div>
</div>

<div class="modal-backdrop-c" id="drawerBackdrop" style="display:none"></div>
<aside class="drawer-c" id="cartDrawer">
  <div class="drawer-head">
    <h3>Giỏ hàng</h3>
    <button class="modal-close" id="closeDrawer" aria-label="Đóng"><i class="bi bi-x-lg"></i></button>
  </div>
  <div class="drawer-body" id="drawerBody"></div>
  <div class="drawer-foot" id="drawerFoot"></div>
</aside>`;

const PRELOADER = `
<div id="preloader">
  <div class="pre-mark">C</div>
  <div class="pre-name">CAKECRAFT</div>
  <div class="pre-bar"></div>
</div>`;

const MENU_CSS = `
<style>
.brand-mark{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--gold),var(--caramel));color:#fff;font-family:var(--font-display);font-weight:700;font-size:1.1rem}
.brand-mark.dark{background:linear-gradient(135deg,var(--gold),var(--caramel))}
.brand-word{font-family:var(--font-display);font-weight:700;letter-spacing:.12em;font-size:1.05rem;color:var(--cocoa-deep)}
.user-menu{position:absolute;top:120%;right:0;width:240px;background:#fff;border-radius:16px;box-shadow:var(--shadow-md);padding:.6rem;opacity:0;visibility:hidden;transform:translateY(10px);transition:all .3s var(--ease);z-index:1100}
.user-menu.open{opacity:1;visibility:visible;transform:none}
.um-head{padding:.7rem .8rem;border-bottom:1px solid var(--cream-200);margin-bottom:.4rem}
.um-name{font-family:var(--font-display);font-weight:700;color:var(--cocoa-deep)}
.um-email{font-size:.78rem;color:var(--muted)}
.um-wallet{padding:.5rem .8rem;font-size:.85rem;color:var(--cocoa);background:var(--cream-100);border-radius:10px;margin-bottom:.4rem}
.um-item{display:flex;align-items:center;gap:.6rem;padding:.6rem .8rem;border-radius:10px;font-weight:600;font-size:.9rem;color:var(--cocoa);cursor:pointer;transition:background .25s}
.um-item:hover{background:var(--cream-100);color:var(--berry)}
.pre-mark{width:64px;height:64px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,var(--gold),var(--caramel));color:#fff;font-family:var(--font-display);font-weight:700;font-size:2rem}
</style>`;

export function injectChrome() {
  document.body.insertAdjacentHTML('afterbegin', PRELOADER + MENU_CSS + NAV);
  document.body.insertAdjacentHTML('beforeend', FOOTER + MODALS);

  document.getElementById('openCart2')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('cartDrawer')?.classList.add('open');
  });
  const drawer = document.getElementById('cartDrawer');
  const bd = document.getElementById('drawerBackdrop');
  if (drawer && bd) {
    const obs = new MutationObserver(() => { bd.style.display = drawer.classList.contains('open') ? 'block' : 'none'; });
    obs.observe(drawer, { attributes: true, attributeFilter: ['class'] });
  }
}
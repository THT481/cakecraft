// ============================================
// ADMIN PAGE ENTRY - CakeCraft
// Trang admin riêng (admin.html). Dùng chung đăng nhập với trang chính:
// chỉ tài khoản có email trong ADMIN_EMAILS mới vào được.
// ============================================
import { auth, authReady, onAuthStateChanged } from './firebase-config.js';
import {
  isAdmin, bindAdminEvents, loadAdminDashboard
} from './admin.js';

const gate = document.getElementById('adminGate');
const gateMsg = document.getElementById('gateMsg');

function showGateError(msg) {
  if (!gate) return;
  gate.innerHTML = `
    <i class="bi bi-shield-lock" style="font-size:3rem;color:var(--gold)"></i>
    <div style="font-family:var(--font-display);font-weight:700;font-size:1.4rem;color:var(--cocoa-deep)">Không có quyền truy cập</div>
    <div style="max-width:420px">${msg}</div>
    <a href="index.html" class="btn-admin btn-admin-primary" style="text-decoration:none;margin-top:.5rem">
      <i class="bi bi-house me-2"></i> Về trang chủ
    </a>`;
}

function unlockAdmin() {
  if (gate) gate.style.display = 'none';
  document.body.style.overflow = '';
  bindAdminEvents();
  loadAdminDashboard().then(animateDashboardData);
  animateAdminEntry();
}

const g = window.gsap;
if (g && window.ScrollTrigger) g.registerPlugin(window.ScrollTrigger);

let entryCtx;

// Initial entry choreography (header → tabs → stats → cards), spring-free smooth easing
function animateAdminEntry() {
  if (!g) return;
  entryCtx?.revert();
  entryCtx = g.context(() => {
    const mm = g.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = g.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.admin-header', { yPercent: -100, autoAlpha: 0, duration: .7 })
        .from('.admin-nav-tab', { y: 14, autoAlpha: 0, duration: .5, stagger: .07 }, '-=0.3')
        .from('.stat-card', { y: 28, autoAlpha: 0, duration: .7, stagger: .09 }, '-=0.25')
        .from('.admin-card', { y: 32, autoAlpha: 0, duration: .8, stagger: .12 }, '-=0.45');
    });
  });
}

// Animate the dashboard data (progress bars grow, count-up numbers) after data loads
function animateDashboardData() {
  if (!g || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Progress bars: grow from 0 with a soft ease, staggered
  g.from('.top-product-bar', {
    scaleX: 0, transformOrigin: 'left center',
    duration: 1, ease: 'power2.out', stagger: .08, delay: .15
  });
  g.from('.top-product-item, .recent-order-item', {
    x: -16, autoAlpha: 0, duration: .6, ease: 'power3.out', stagger: .07
  });

  // Count-up the numeric stat values
  document.querySelectorAll('.stat-value').forEach((el) => {
    const raw = el.textContent.replace(/[^\d]/g, '');
    if (!raw) return;
    const end = parseInt(raw, 10);
    const suffix = /đ/.test(el.textContent) ? 'đ' : '';
    const useGroup = end >= 1000;
    const obj = { v: 0 };
    g.to(obj, {
      v: end, duration: 1.1, ease: 'power2.out',
      onUpdate() {
        const n = Math.round(obj.v);
        el.textContent = (useGroup ? n.toLocaleString('vi-VN') : n) + suffix;
      }
    });
  });
}

// Re-run a gentle entry when switching tabs (cards in the newly active tab)
window.__animateDashboardData = animateDashboardData;
let tabAnimating = false;
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.admin-nav-tab');
  if (!tab || !g || tabAnimating) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  tabAnimating = true;
  requestAnimationFrame(() => {
    const active = document.querySelector('.admin-tab-content.active');
    if (active) {
      const items = active.querySelectorAll('.stat-card, .admin-card, .admin-table tbody tr');
      if (items.length) {
        g.from(items, {
          y: 18, autoAlpha: 0, duration: .55, ease: 'power3.out', stagger: .05,
          onComplete: () => { tabAnimating = false; }
        });
      } else tabAnimating = false;
    } else tabAnimating = false;
  });
});

// Clean up GSAP context on page unload (skill: always revert)
window.addEventListener('beforeunload', () => entryCtx?.revert());

(async () => {
  await authReady;

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      showGateError('Bạn cần đăng nhập bằng tài khoản quản trị viên. Vui lòng đăng nhập ở trang chủ rồi quay lại.');
      return;
    }
    if (!isAdmin(user)) {
      showGateError(`Tài khoản <strong>${user.email}</strong> không phải quản trị viên.`);
      return;
    }
    if (gateMsg) gateMsg.textContent = 'Đang tải bảng điều khiển...';
    unlockAdmin();
  });
})();
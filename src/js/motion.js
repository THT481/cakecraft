// ============================================================
// CakeCraft — GSAP motion layer (graceful no-op if GSAP absent)
// ============================================================
const G = () => window.gsap;
const ST = () => window.ScrollTrigger;
const SPLIT = () => window.SplitText;
export const hasGSAP = () => !!window.gsap;
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let registered = false;
function ensureRegistered() {
  if (!hasGSAP()) return false;
  if (!registered) {
    const plugins = [ST(), SPLIT()].filter(Boolean);
    if (plugins.length) G().registerPlugin(...plugins);
    registered = true;
  }
  return true;
}

// ---- project-wide defaults ----
export function initMotionDefaults() {
  if (!hasGSAP()) return;
  document.documentElement.classList.add('gsap-on');
  ensureRegistered();
  G().defaults({ duration: 0.7, ease: 'power3.out' });
}

// ============================================================
// HOMEPAGE — cinematic hero + scroll storytelling
// ============================================================
export function homeHero() {
  if (!hasGSAP() || reduceMotion()) { revealHeroFallback(); return; }
  ensureRegistered();
  const gsap = G();

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // eyebrow
  const eyebrow = document.querySelector('.hero-eyebrow');
  if (eyebrow) tl.from(eyebrow, { y: -20, opacity: 0, duration: 0.6 }, 0);

  // title — reveal line-by-line with a mask (keeps the gradient-clip intact)
  const title = document.querySelector('.hero-title');
  if (title && SPLIT()) {
    const split = SPLIT().create(title, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    gsap.set(title, { opacity: 1 });
    tl.from(split.lines, {
      yPercent: 120, opacity: 0, rotationX: -28, transformOrigin: '50% 100%',
      stagger: 0.14, duration: 0.9, ease: 'back.out(1.5)'
    }, 0.15);
  } else if (title) {
    tl.from(title, { y: 30, opacity: 0, duration: 0.8 }, 0.15);
  }

  // subtitle + CTAs + stats
  const sub = document.querySelector('.hero-sub');
  const ctas = document.querySelectorAll('.hero-cta-row .btn-c');
  const stats = document.querySelectorAll('.hero-stat');
  if (sub) tl.from(sub, { y: 24, opacity: 0, duration: 0.6 }, '-=0.4');
  if (ctas.length) tl.from(ctas, { y: 20, opacity: 0, stagger: 0.12, duration: 0.5 }, '-=0.3');
  if (stats.length) tl.from(stats, { y: 18, opacity: 0, stagger: 0.1, duration: 0.5 }, '-=0.2');

  // hero visual — frame scales/fades in, then badges pop + float forever
  const frame = document.querySelector('.hero-frame');
  if (frame) tl.from(frame, { scale: 0.86, opacity: 0, rotation: -2, duration: 1, ease: 'power3.out' }, 0.3);

  const badges = document.querySelectorAll('.float-badge');
  badges.forEach((b, i) => {
    tl.from(b, { scale: 0, opacity: 0, duration: 0.6, ease: 'back.out(2)' }, 0.7 + i * 0.15);
    // perpetual float
    gsap.to(b, { y: i % 2 ? 14 : -14, duration: 2.4 + i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1 + i * 0.2 });
  });

  // scroll cue bob
  const cue = document.querySelector('.scroll-cue');
  if (cue) gsap.to(cue, { y: 10, duration: 1, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  countUp();
  heroParallax();
}

function revealHeroFallback() {
  document.querySelectorAll('.hero-title, .hero-sub, .hero-eyebrow, .hero-cta-row, .hero-stats, .hero-frame, .float-badge')
    .forEach(el => { el.style.opacity = '1'; });
}

// ---- parallax layers in the hero (canvas + visual move at different speeds) ----
function heroParallax() {
  if (!ensureRegistered()) return;
  const gsap = G();
  const canvas = document.querySelector('.hero-canvas');
  const visual = document.querySelector('.hero-visual');
  const copy = document.querySelector('.hero-grid > div:first-child');
  const hero = document.querySelector('.hero-c');
  if (!hero) return;
  if (canvas) gsap.to(canvas, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  if (visual) gsap.to(visual, { yPercent: -12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 } });
  if (copy) gsap.to(copy, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 } });
}

// ---- count-up stats (16+, 3D, AI — animate numeric ones) ----
export function countUp() {
  if (!hasGSAP() || reduceMotion()) return;
  ensureRegistered();
  const gsap = G();
  document.querySelectorAll('.hero-stat .n').forEach(el => {
    const raw = el.textContent.trim();
    const m = raw.match(/^(\d+)(\+?)$/);
    if (!m) return;            // skip non-numeric like "3D", "AI"
    const target = parseInt(m[1]); const suffix = m[2] || '';
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 1.4, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; }
    });
  });
}

// ---- pinned feature storytelling (cards advance while section is pinned) ----
export function pinnedFeatures(sel = '#features') {
  if (!hasGSAP() || reduceMotion() || !ensureRegistered()) return;
  const section = document.querySelector(sel);
  const cards = document.querySelectorAll(`${sel} .feature-card`);
  if (!section || cards.length < 2) return;
  const gsap = G();
  gsap.set(cards, { opacity: 0.25, y: 30, scale: 0.96 });
  const tl = gsap.timeline({
    scrollTrigger: { trigger: section, start: 'top 70%', end: 'bottom 80%', scrub: 0.8 }
  });
  cards.forEach((c, i) => {
    tl.to(c, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' }, i * 0.4);
  });
}

// ---- gentle section-to-section reveal (titles rise, content fades) ----
export function sectionTransitions() {
  if (!hasGSAP() || reduceMotion() || !ensureRegistered()) return;
  const gsap = G();
  document.querySelectorAll('.section-c').forEach(sec => {
    const title = sec.querySelector('.title-c');
    if (title) gsap.from(title, {
      y: 40, opacity: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: title, start: 'top 85%', once: true }
    });
  });
}


// ---- reveal on scroll (replaces IntersectionObserver) ----
// Any element with .reveal animates up+fade as it enters; staggered in batches.
export function revealOnScroll() {
  const els = document.querySelectorAll('.reveal:not(.in)');
  if (!els.length) return;
  if (!ensureRegistered() || reduceMotion()) {
    els.forEach(el => el.classList.add('in'));   // fallback: just show
    return;
  }
  G().set(els, { opacity: 0, y: 40 });
  ST().batch('.reveal:not(.in)', {
    start: 'top 88%',
    onEnter: (batch) => G().to(batch, {
      opacity: 1, y: 0, stagger: 0.09, overwrite: true,
      onStart: () => batch.forEach(b => b.classList.add('in'))
    })
  });
  // safety: reveal anything already above the fold next frame
  requestAnimationFrame(() => ST().refresh());
}

// Manually reveal a freshly-injected set (e.g. product cards) with stagger
export function revealNow(selector, opts = {}) {
  const els = typeof selector === 'string' ? document.querySelectorAll(selector) : selector;
  if (!els || !els.length) return;
  if (!hasGSAP() || reduceMotion()) { els.forEach && els.forEach(e => e.classList.add('in')); return; }
  G().fromTo(els, { opacity: 0, y: 36 }, {
    opacity: 1, y: 0, stagger: opts.stagger ?? 0.08, duration: opts.duration ?? 0.6, ease: 'power3.out',
    onStart: () => els.forEach(e => e.classList.add('in'))
  });
}

// ---- hero intro timeline (inner page heroes only; homepage uses homeHero) ----
export function heroIntro() {
  if (!hasGSAP() || reduceMotion()) return;
  ensureRegistered();
  const scope = document.querySelector('.page-hero');
  if (!scope) return;
  const gsap = G();
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  const eyebrow = scope.querySelector('.eyebrow');
  const title = scope.querySelector('.title-c, h1');
  const sub = scope.querySelector('.subtitle-c, p');
  if (eyebrow) tl.from(eyebrow, { y: -16, opacity: 0, duration: 0.5 }, 0);
  if (title && SPLIT()) {
    const split = SPLIT().create(title, { type: 'lines', mask: 'lines' });
    gsap.set(title, { opacity: 1 });
    tl.from(split.lines, { yPercent: 110, opacity: 0, stagger: 0.12, duration: 0.7, ease: 'back.out(1.4)' }, 0.1);
  } else if (title) {
    tl.from(title, { y: 26, opacity: 0, duration: 0.7 }, 0.1);
  }
  if (sub) tl.from(sub, { y: 20, opacity: 0, duration: 0.6 }, '-=0.3');
}

// ---- preloader ----
export function animatePreloaderOut(el, done) {
  if (!el) { done && done(); return; }
  if (!hasGSAP() || reduceMotion()) { el.classList.add('hidden'); done && done(); return; }
  G().to(el, { autoAlpha: 0, duration: 0.5, ease: 'power2.inOut', onComplete: () => { el.classList.add('hidden'); done && done(); } });
}
export function animatePreloaderIn(el) {
  if (!el || !hasGSAP() || reduceMotion()) return;
  const mark = el.querySelector('.pre-mark');
  const name = el.querySelector('.pre-name');
  const tl = G().timeline();
  if (mark) tl.fromTo(mark, { scale: 0.5, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.7)' });
  if (name) tl.fromTo(name, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.2');
}

// ---- cart drawer ----
export function drawerOpen(drawer, backdrop) {
  if (!drawer) return;
  drawer.classList.add('open');
  if (backdrop) backdrop.style.display = 'block';
  if (!hasGSAP() || reduceMotion()) return;
  drawer.style.transition = 'none';                 // let GSAP own the transform
  G().fromTo(drawer, { xPercent: 100 }, { xPercent: 0, duration: 0.5, ease: 'power3.out' });
  if (backdrop) G().fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  const items = drawer.querySelectorAll('.cart-item');
  if (items.length) G().fromTo(items, { opacity: 0, x: 20 }, { opacity: 1, x: 0, stagger: 0.06, duration: 0.4, delay: 0.12, ease: 'power2.out' });
}
export function drawerClose(drawer, backdrop, done) {
  if (!drawer) { done && done(); return; }
  if (!hasGSAP() || reduceMotion()) { drawer.classList.remove('open'); if (backdrop) backdrop.style.display = 'none'; done && done(); return; }
  G().to(drawer, { xPercent: 100, duration: 0.35, ease: 'power2.in', onComplete: () => {
    drawer.classList.remove('open'); G().set(drawer, { clearProps: 'transform' }); drawer.style.transition = '';
    if (backdrop) backdrop.style.display = 'none'; done && done();
  }});
  if (backdrop) G().to(backdrop, { opacity: 0, duration: 0.3 });
}

// ---- build the cake SVG in (called once on first render) ----
let _cakeAnimated = false;
export function animateCakeIn(stageSelector = '#cakeStage') {
  if (_cakeAnimated || !hasGSAP() || reduceMotion()) return;
  const svg = document.querySelector(`${stageSelector} svg`);
  if (!svg) return;
  _cakeAnimated = true;
  G().fromTo(svg, { opacity: 0, scale: 0.9, transformOrigin: '50% 70%' },
    { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.4)' });
}

// ---- stepper transition (design studio) ----
export function stepTransition(panel, dir = 1) {
  if (!panel || !hasGSAP() || reduceMotion()) return;
  G().fromTo(panel, { opacity: 0, x: 30 * dir }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out', clearProps: 'all' });
}

// ---- button / card micro-interactions ----
export function pop(el) {
  if (!el || !hasGSAP() || reduceMotion()) return;
  G().fromTo(el, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' });
}

/* ==========================================================================
   ROLLA — Landing page interactions
   Vanilla JS only. No dependencies.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initMobileNav();
  initScrollAnimations();
  initFaqAccordion();
  initDevelopTimer();
});

/* --------------------------------------------------------------------------
   Icons — small inline SVG set, injected by [data-icon] name.
   Avoids depending on an external icon CDN.
   -------------------------------------------------------------------------- */
function initIcons() {
  const ICONS = {
    'calendar-plus': '<path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M12 14v6M9 17h6"/>',
    'qr-code': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z"/>',
    'camera': '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/>',
    'sparkles': '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
    'smartphone': '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    'images': '<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 2h14v14"/><circle cx="9" cy="12" r="1.5"/><path d="M4 17l3-3 2 2 4-4 4 4"/>',
    'sliders-horizontal': '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h13M21 18h0"/><circle cx="14.5" cy="6" r="2"/><circle cx="7.5" cy="12" r="2"/><circle cx="16.5" cy="18" r="2"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    'zap': '<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/>',
    'layout-grid': '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  };

  document.querySelectorAll('[data-icon]').forEach((el) => {
    const name = el.getAttribute('data-icon');
    const paths = ICONS[name];
    if (!paths) return;
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%">${paths}</svg>`;
  });
}

/* --------------------------------------------------------------------------
   Mobile navbar toggle
   -------------------------------------------------------------------------- */
function initMobileNav() {
  const toggle = document.getElementById('navbarToggle');
  const mobile = document.getElementById('navbarMobile');
  if (!toggle || !mobile) return;

  toggle.addEventListener('click', () => {
    const isOpen = mobile.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close mobile menu when a link is tapped
  mobile.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobile.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* --------------------------------------------------------------------------
   Scroll-triggered fade-up animation via IntersectionObserver
   -------------------------------------------------------------------------- */
function initScrollAnimations() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll('[data-animate="fade-up"]');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  targets.forEach((el) => {
    const delay = el.getAttribute('data-delay');
    if (delay) el.style.transitionDelay = `${delay}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

/* --------------------------------------------------------------------------
   FAQ accordion
   -------------------------------------------------------------------------- */
function initFaqAccordion() {
  const items = document.querySelectorAll('.faq-item');

  items.forEach((item) => {
    const question = item.querySelector('.faq-item__question');
    const answer = item.querySelector('.faq-item__answer');

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      // Close all other items (single-open accordion)
      items.forEach((other) => {
        other.classList.remove('is-open');
        other.querySelector('.faq-item__question').setAttribute('aria-expanded', 'false');
        other.querySelector('.faq-item__answer').style.maxHeight = null;
      });

      if (!isOpen) {
        item.classList.add('is-open');
        question.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = `${answer.scrollHeight}px`;
      }
    });
  });
}

/* --------------------------------------------------------------------------
   Reveal-section countdown display
   Purely decorative front-end demo — not wired to a real event time yet.
   TODO: connect to the actual event's scheduled reveal timestamp.
   -------------------------------------------------------------------------- */
function initDevelopTimer() {
  const timerEl = document.getElementById('developTimer');
  if (!timerEl) return;

  let totalSeconds = 1 * 3600 + 24 * 60 + 36; // 01:24:36 starting point

  setInterval(() => {
    if (totalSeconds <= 0) {
      totalSeconds = 1 * 3600 + 24 * 60 + 36; // loop for demo purposes
    }
    totalSeconds -= 1;

    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');

    timerEl.textContent = `${h} : ${m} : ${s}`;
  }, 1000);
}
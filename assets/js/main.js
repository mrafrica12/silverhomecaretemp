/* ============================================================
   SILVERNEST HOME CARE — Main JS
   ============================================================ */
'use strict';

/* ── NAV ──────────────────────────────────────────────────────── */
(function initNav() {
  const nav       = document.querySelector('.nav');
  const hamburger = document.querySelector('.nav__hamburger');
  const drawer    = document.querySelector('.nav__drawer');
  const overlay   = document.querySelector('.nav__overlay');
  if (!nav) return;

  function updateNav() { nav.classList.toggle('scrolled', window.scrollY > 40); }
  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });

  function openDrawer()  { drawer?.classList.add('open'); overlay?.classList.add('open'); hamburger?.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { drawer?.classList.remove('open'); overlay?.classList.remove('open'); hamburger?.classList.remove('open'); document.body.style.overflow = ''; }

  hamburger?.addEventListener('click', () => drawer?.classList.contains('open') ? closeDrawer() : openDrawer());
  overlay?.addEventListener('click', closeDrawer);
  drawer?.querySelectorAll('.nav__drawer-link').forEach(l => l.addEventListener('click', closeDrawer));
})();

/* ── SCROLL ANIMATIONS ─────────────────────────────────────── */
(function () {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.fade-up').forEach(el => io.observe(el));
})();

/* ── COUNTER ANIMATION ─────────────────────────────────────── */
(function () {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '', prefix = el.dataset.prefix || '';
      const start = performance.now();
      function tick(now) {
        const p = Math.min((now - start) / 1600, 1), eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(el => io.observe(el));
})();

/* ── TOAST ─────────────────────────────────────────────────── */
function showToast(msg, type = 'success') {
  let t = document.getElementById('sn-toast');
  if (!t) { t = document.createElement('div'); t.id = 'sn-toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = `toast toast--${type} visible`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('visible'), 4500);
}

/* ── FORM ──────────────────────────────────────────────────── */
function initForm(formId, scriptUrl) {
  const form = document.getElementById(formId);
  if (!form) return;

  const loadedField = form.querySelector('[name="form_loaded"]');
  if (loadedField) loadedField.value = Date.now();

  form.querySelectorAll('input,select,textarea').forEach(f => {
    f.addEventListener('input', () => f.closest('.form-group')?.classList.remove('has-error'));
    f.addEventListener('change', () => f.closest('.form-group')?.classList.remove('has-error'));
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const orig = btn?.textContent || 'Submit';

    let valid = true;
    const errors = [];

    form.querySelectorAll('[required]').forEach(f => {
      if (!f.value.trim()) {
        valid = false;
        const label = form.querySelector(`label[for="${f.id}"]`)?.textContent || f.name;
        markErr(f, 'This field is required.');
        errors.push(label);
      }
    });

    const ef = form.querySelector('[type="email"]');
    if (ef?.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ef.value.trim())) {
      valid = false;
      markErr(ef, 'Please enter a valid email address.');
      errors.push('Email address');
    }

    const pf = form.querySelector('[type="tel"]');
    if (pf?.value.trim() && pf.value.trim().replace(/\D/g, '').length < 10) {
      valid = false;
      markErr(pf, 'Please enter a valid phone number.');
      errors.push('Phone number');
    }

    if (!valid) {
      const errorCount = errors.length;
      showToast(`Please fix ${errorCount} field${errorCount === 1 ? '' : 's'} above.`, 'error');
      form.querySelector('.has-error input,.has-error select,.has-error textarea')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
    const payload = new URLSearchParams(new FormData(form));
    const url = scriptUrl || form.dataset.scriptUrl || '';

    if (!url || url.includes('YOUR_APPS_SCRIPT_URL')) {
      console.log('[SilverNest intake]', Object.fromEntries(new FormData(form)));
      await new Promise(r => setTimeout(r, 1000));
      done(form, loadedField, btn, orig);
      return;
    }
    try {
      // Google Apps Script returns a cross-origin 302 redirect on POST;
      // mode:'no-cors' lets the request reach the Sheet without CORS blocking.
      await fetch(url, { method: 'POST', mode: 'no-cors', body: payload });
      done(form, loadedField, btn, orig);
    } catch (err) { showToast('Network error — please call us or try again.', 'error'); if (btn) { btn.disabled = false; btn.textContent = orig; } }
  });
}

function markErr(field, msg) {
  const g = field.closest('.form-group'); if (!g) return;
  g.classList.add('has-error');
  let s = g.querySelector('.form-error');
  if (!s) { s = document.createElement('span'); s.className = 'form-error'; g.appendChild(s); }
  s.textContent = msg;
}

function done(form, loadedField, btn, orig) {
  const r = form.dataset.redirect;
  if (r) { window.location.href = r; return; }
  showToast("Thank you! We'll be in touch within 24 hours.", 'success');
  form.reset();
  if (loadedField) loadedField.value = Date.now();
  if (btn) { btn.disabled = false; btn.textContent = orig; }
}

/* ── ACTIVE NAV ─────────────────────────────────────────────── */
(function () {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link,.nav__drawer-link').forEach(l => {
    const href = (l.getAttribute('href') || '').split('/').pop();
    if (href === page) l.style.color = 'var(--sage)';
  });
})();

/* ── STICKY SECTION NAVIGATION ──────────────────────────────── */
(function initSectionNav() {
  const sectionLinks = document.querySelectorAll('.section-nav__link');
  if (sectionLinks.length === 0) return;

  let scrollTimeout;
  function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (!element) return;

    const offset = 220;
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }

  function updateActiveLink() {
    let activeSection = null;
    const offset = 220;

    sectionLinks.forEach(link => {
      const sectionId = link.getAttribute('href').substring(1);
      const section = document.getElementById(sectionId);
      if (!section) return;

      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const nextSection = link.parentElement.nextElementSibling?.querySelector('section');
      const sectionBottom = nextSection ?
        nextSection.getBoundingClientRect().top + window.scrollY :
        sectionTop + section.offsetHeight;

      if (window.scrollY >= sectionTop - offset && window.scrollY < sectionBottom - offset) {
        activeSection = link;
      }
    });

    sectionLinks.forEach(link => link.classList.remove('active'));
    if (activeSection) activeSection.classList.add('active');
  }

  // Debounced scroll handler
  function debouncedUpdateActiveLink() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateActiveLink, 50);
  }

  sectionLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = link.getAttribute('href').substring(1);
      scrollToSection(sectionId);
      setTimeout(updateActiveLink, 800);
    });
  });

  window.addEventListener('scroll', debouncedUpdateActiveLink, { passive: true });
  setTimeout(updateActiveLink, 100);
})();

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

  function openDrawer() {
    drawer?.classList.add('open');
    drawer?.setAttribute('aria-hidden', 'false');
    overlay?.classList.add('open');
    overlay?.setAttribute('aria-hidden', 'false');
    hamburger?.classList.add('open');
    hamburger?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    drawer?.querySelector('a,button')?.focus();
  }
  function closeDrawer() {
    drawer?.classList.remove('open');
    drawer?.setAttribute('aria-hidden', 'true');
    overlay?.classList.remove('open');
    overlay?.setAttribute('aria-hidden', 'true');
    hamburger?.classList.remove('open');
    hamburger?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger?.addEventListener('click', () => drawer?.classList.contains('open') ? closeDrawer() : openDrawer());
  overlay?.addEventListener('click', closeDrawer);
  drawer?.querySelectorAll('.nav__drawer-link, .nav__drawer-close').forEach(l => l.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer?.classList.contains('open')) closeDrawer();
  });
})();

/* ── SCROLL ANIMATIONS ─────────────────────────────────────── */
(function () {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.fade-up').forEach(el => io.observe(el));
})();

/* ── COUNTER ANIMATION ─────────────────────────────────────── */
(function () {
  if (!('IntersectionObserver' in window)) return;
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
  if (form.dataset.formReady === 'true') return;
  form.dataset.formReady = 'true';

  const loadedField = form.querySelector('[name="form_loaded"]');
  if (loadedField) loadedField.value = Date.now();

  form.querySelectorAll('input,select,textarea').forEach(f => {
    const clearError = () => {
      f.closest('.form-group')?.classList.remove('has-error');
      f.removeAttribute('aria-invalid');
    };
    f.addEventListener('input', clearError);
    f.addEventListener('change', clearError);
  });

  async function handleSubmit(e) {
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

    if (!url) {
      showToast('This form is not configured yet. Please call SilverNest.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = orig; }
      return;
    }
    try {
      // Google Apps Script returns a cross-origin 302 redirect on POST;
      // mode:'no-cors' lets the request reach the Sheet without CORS blocking.
      await fetch(url, { method: 'POST', mode: 'no-cors', body: payload, keepalive: true });
      done(form, loadedField, btn, orig);
    } catch (err) {
      showToast('We could not submit the form. Please call us or try again.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = orig; }
    }
  }

  form.addEventListener('submit', handleSubmit);
  form.querySelectorAll('[type="submit"]').forEach(btn => {
    btn.addEventListener('click', handleSubmit);
  });
  form.dataset.submitReady = 'true';
}

function markErr(field, msg) {
  const g = field.closest('.form-group'); if (!g) return;
  g.classList.add('has-error');
  field.setAttribute('aria-invalid', 'true');
  let s = g.querySelector('.form-error');
  if (!s) { s = document.createElement('span'); s.className = 'form-error'; g.appendChild(s); }
  if (!s.id && field.id) s.id = `${field.id}-error`;
  if (s.id) field.setAttribute('aria-describedby', `${field.getAttribute('aria-describedby') || ''} ${s.id}`.trim());
  s.textContent = msg;
}

function done(form, loadedField, btn, orig) {
  const whatsappNumber = (form.dataset.whatsapp || '+16784380539').replace(/\D/g, '');
  const firstName = form.querySelector('[name="first_name"]')?.value?.trim() || '';
  const careNeeds = form.querySelector('[name="care_needs"]')?.value?.trim() || '';
  const whatsappText = encodeURIComponent(`Hello SilverNest, I just submitted a consultation request${firstName ? ` for ${firstName}` : ''}${careNeeds ? ` about ${careNeeds}` : ''}.`);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappText}`;

  const r = form.dataset.redirect;
  if (r) { window.location.href = r; return; }
  showToast("Thank you! We'll be in touch within 24 hours.", 'success');
  if (form.dataset.successMode === 'inline') {
    const panel = document.createElement('div');
    panel.className = 'submission-success';
    panel.setAttribute('role', 'status');
    panel.setAttribute('tabindex', '-1');
    panel.innerHTML = `
      <h2>Request received</h2>
      <p>Thank you. Your consultation request was sent to SilverNest. A care coordinator will follow up within 24 hours.</p>
      <div class="submission-success__actions">
        <a class="btn btn--sage" href="${whatsappUrl}" target="_blank" rel="noopener">Continue on WhatsApp</a>
        <a class="btn btn--outline" href="tel:+14704608253">Call SilverNest</a>
      </div>
    `;
    form.replaceWith(panel);
    panel.focus();
    return;
  }
  form.reset();
  if (loadedField) loadedField.value = Date.now();
  if (btn) { btn.disabled = false; btn.textContent = orig; }
}

window.initForm = initForm;

document.querySelectorAll('form[id][data-script-url]').forEach(form => {
  initForm(form.id);
});

/* ── ACTIVE NAV ─────────────────────────────────────────────── */
(function () {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link,.nav__drawer-link').forEach(l => {
    const href = (l.getAttribute('href') || '').split('/').pop();
    if (href === page) l.style.color = 'var(--sage)';
  });
})();

/* ── BOTTOM NAV ACTIVE STATE ─────────────────────────────────── */
(function () {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.bottom-nav__item[data-match]').forEach(el => {
    if (el.dataset.match === page) el.classList.add('active');
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

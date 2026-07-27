/* ═══════════════════════════════════════════════════
   LUTON MOT CENTRE — script.js
   Interactivity: Navbar, Scroll animations, FAQ, Form
═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // Anti-spam: minimum time-on-page before a submit is sent (bots submit instantly)
  const PAGE_LOADED_AT = Date.now();
  const MIN_TIME_ON_PAGE_MS = 3000;
  const FETCH_TIMEOUT_MS = 8000;
  const PHONE_DISPLAY = '07570 793698';

  /* ══ GOOGLE ADS CONVERSIONS ══════════════════════
     TODO: replace AW-REPLACE_ME with the real Google Ads ID, and the two labels below with the
     conversion labels from Google Ads → Tools → Conversions ("Book form submit" and "Phone call click"). */
  const GTAG_SEND_TO_FORM = 'AW-REPLACE_ME/FORM_SUBMIT_LABEL';
  const GTAG_SEND_TO_CALL = 'AW-REPLACE_ME/PHONE_CALL_LABEL';

  function fireConversion(sendTo) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', { send_to: sendTo });
    }
  }

  // Phone-call leads: every tel: link on the page counts as a conversion click
  document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', () => fireConversion(GTAG_SEND_TO_CALL));
  });


  /* ══ 1. NAVBAR — scroll styling ══════════════════ */
  const navbar   = document.getElementById('navbar');
  const stickyCta = document.getElementById('stickyCta');
  const heroSection = document.getElementById('hero');

  const onScroll = () => {
    const scrollY = window.scrollY;
    // Navbar glass effect
    navbar.classList.toggle('scrolled', scrollY > 60);
    // Sticky CTA — show after the hero section
    if (heroSection) {
      const heroBottom = heroSection.getBoundingClientRect().bottom;
      stickyCta.classList.toggle('show', heroBottom < 0);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });


  /* ══ 2. REVEAL ON SCROLL (Intersection Observer) ═ */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Stagger sibling cards
          const siblings = entry.target.parentElement.querySelectorAll('.reveal');
          let delay = 0;
          siblings.forEach((sib, idx) => { if (sib === entry.target) delay = idx * 80; });
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, Math.min(delay, 300));
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  revealEls.forEach(el => revealObserver.observe(el));


  /* ══ 3. COUNTER ANIMATION ════════════════════════
     The real final value lives in the markup (no-JS fallback). JS animates 0 → data-target
     when scrolled into view; if the observer never fires, the markup value stays visible. */
  const counters = document.querySelectorAll('[data-target]');
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach(el => counterObserver.observe(el));

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    if (!Number.isFinite(target)) return;
    const duration = 1800;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.floor(current) + '+';
    }, 16);
  }


  /* ══ 4. FAQ ACCORDION ════════════════════════════ */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question');
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all
      faqItems.forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      // Toggle this one
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });


  /* ══ 5. BOOKING FORM VALIDATION & SUBMIT ════════ */
  const form          = document.getElementById('bookingForm');
  const successPanel  = document.getElementById('bookingSuccess');
  const fatalBanner   = document.getElementById('formFatal');

  if (form) {
    // Set date min to today
    const prefDate = document.getElementById('prefDate');
    if (prefDate) {
      const today = new Date();
      const iso = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');
      prefDate.setAttribute('min', iso);
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (validateForm()) {
        submitForm();
      }
    });
  }

  // Validation rules (mirrored server-side in book.php — never trust the client alone)
  const UK_PHONE_RE = /^(?:\+44[1-9]\d{8,9}|0[1-9]\d{8,9})$/;
  // UK plates: current (AB12CDE), prefix (A123BCD), suffix (ABC123D), dateless (ABC1234 / 1234ABC)
  const UK_REG_RE = /^(?:[A-Z]{2}\d{2}[A-Z]{3}|[A-Z]\d{1,3}[A-Z]{3}|[A-Z]{3}\d{1,3}[A-Z]|[A-Z]{1,3}\d{1,4}|\d{1,4}[A-Z]{1,3})$/;

  function normalisePhone(v) {
    return v.replace(/[\s\-().]/g, '');
  }
  function normaliseReg(v) {
    return v.replace(/\s+/g, '').toUpperCase();
  }

  function setFieldError(id, errId, msg) {
    const input = document.getElementById(id);
    const err   = document.getElementById(errId);
    if (err) err.textContent = msg || '';
    if (input) input.classList.toggle('error', Boolean(msg));
    return !msg;
  }

  function validateForm() {
    let valid = true;

    // Service (required)
    const service = document.getElementById('service');
    valid = setFieldError('service', 'err-service',
      service && service.value ? '' : 'Please choose a service.') && valid;

    // Name (required)
    const name = document.getElementById('fullName');
    valid = setFieldError('fullName', 'err-name',
      name && name.value.trim() ? '' : 'Please enter your name.') && valid;

    // Phone (required, UK format — accepts 07…, +447…, spaces/dashes)
    const phone = document.getElementById('phone');
    const phoneVal = phone ? normalisePhone(phone.value.trim()) : '';
    let phoneMsg = '';
    if (!phoneVal) phoneMsg = 'Please enter your phone number.';
    else if (!UK_PHONE_RE.test(phoneVal)) phoneMsg = 'Please enter a valid UK phone number (e.g. 07123 456789).';
    valid = setFieldError('phone', 'err-phone', phoneMsg) && valid;

    // Vehicle reg (required, UK plate formats, normalised to uppercase without spaces)
    const reg = document.getElementById('vehicleReg');
    const regVal = reg ? normaliseReg(reg.value) : '';
    let regMsg = '';
    if (!regVal) regMsg = 'Please enter your vehicle registration.';
    else if (!UK_REG_RE.test(regVal)) regMsg = 'Please enter a valid UK registration (e.g. AB12 CDE).';
    valid = setFieldError('vehicleReg', 'err-reg', regMsg) && valid;

    // Date (required, today or future, not a Sunday — we're closed)
    const dateInput = document.getElementById('prefDate');
    const dateVal = dateInput ? dateInput.value : '';
    let dateMsg = '';
    if (!dateVal) {
      dateMsg = 'Please choose a preferred date.';
    } else {
      const chosen = new Date(dateVal + 'T12:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(chosen.getTime())) dateMsg = 'Please choose a valid date.';
      else if (chosen < today) dateMsg = 'Please choose today or a future date.';
      else if (chosen.getDay() === 0) dateMsg = "We're closed on Sundays — please pick another day.";
    }
    valid = setFieldError('prefDate', 'err-date', dateMsg) && valid;

    return valid;
  }

  function setSubmitting(isSubmitting) {
    const btn = document.getElementById('submit-btn');
    if (!btn) return;
    if (isSubmitting) {
      btn.dataset.originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('loading');
      btn.classList.remove('pulse-btn');
      btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Sending…';
    } else {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.classList.add('pulse-btn');
      if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
    }
  }

  async function submitForm() {
    if (fatalBanner) fatalBanner.hidden = true;
    setSubmitting(true);

    // Anti-spam: hold the request until at least 3s have passed since page load.
    // Humans never notice (they take longer to fill the form); instant bot submits get delayed/filtered.
    const elapsed = Date.now() - PAGE_LOADED_AT;
    if (elapsed < MIN_TIME_ON_PAGE_MS) {
      await new Promise(r => setTimeout(r, MIN_TIME_ON_PAGE_MS - elapsed));
    }

    const payload = new FormData(form);
    payload.set('phone', normalisePhone(String(payload.get('phone') || '')));
    payload.set('vehicleReg', normaliseReg(String(payload.get('vehicleReg') || '')));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch('book.php', {
        method: 'POST',
        body: payload,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      let data = null;
      try { data = await res.json(); } catch (_) { /* non-JSON response = failure */ }

      // Success ONLY on a confirmed 2xx + {"ok":true}. Anything else is a failure —
      // never show the success panel for a lead that wasn't actually captured.
      if (res.ok && data && data.ok === true) {
        fireConversion(GTAG_SEND_TO_FORM);
        form.style.display = 'none';
        if (successPanel) {
          successPanel.classList.add('show');
          successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        showFailure(data && data.error);
      }
    } catch (_) {
      // Network error or 8s timeout
      clearTimeout(timeoutId);
      showFailure();
    }
  }

  function showFailure(serverMessage) {
    setSubmitting(false);
    if (fatalBanner) {
      if (serverMessage) {
        fatalBanner.innerHTML = '⚠️ ' + escapeHtml(serverMessage) +
          ' Or call <a href="tel:07570793698"><strong>' + PHONE_DISPLAY + '</strong></a>.';
      }
      fatalBanner.hidden = false;
      fatalBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Clear error on input
  document.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('error');
      const errId = {
        service:    'err-service',
        fullName:   'err-name',
        phone:      'err-phone',
        vehicleReg: 'err-reg',
        prefDate:   'err-date',
      }[input.id];
      if (errId) {
        const err = document.getElementById(errId);
        if (err) err.textContent = '';
      }
    });
  });


  /* ══ 6. SMOOTH SCROLL for anchor links ══════════ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = navbar.offsetHeight + 12;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });


  /* ══ AD DEEP-LINKS (e.g. /#aircon) ══════════════
     Ensure landing on a hash URL scrolls to the section, clear of the fixed navbar */
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) {
      setTimeout(() => {
        const top = target.getBoundingClientRect().top + window.scrollY - navbar.offsetHeight - 12;
        // Jump instantly on landing: bypass the CSS smooth-scroll for initial positioning
        const html = document.documentElement;
        const prev = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        window.scrollTo(0, top);
        html.style.scrollBehavior = prev;
      }, 100);
    }
  }


  /* ══ 7. SERVICE CARD → PRESELECT DROPDOWN ═══════
     "Book This" on a service card lands on the form with that service already chosen */
  document.querySelectorAll('[data-service]').forEach(link => {
    link.addEventListener('click', () => {
      const select = document.getElementById('service');
      if (select) {
        select.value = link.dataset.service;
        select.dispatchEvent(new Event('input'));
      }
    });
  });


  /* ══ 8. VEHICLE REG — auto-uppercase ════════════ */
  const regInput = document.getElementById('vehicleReg');
  if (regInput) {
    regInput.addEventListener('input', () => {
      const pos = regInput.selectionStart;
      regInput.value = regInput.value.toUpperCase();
      regInput.setSelectionRange(pos, pos);
    });
  }

});

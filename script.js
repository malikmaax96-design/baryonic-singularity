/* ═══════════════════════════════════════════════════
   LUTON MOT CENTRE — script.js
   Interactivity: Navbar, Scroll animations, FAQ, Form
═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

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
      entries.forEach((entry, i) => {
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


  /* ══ 3. COUNTER ANIMATION ════════════════════════ */
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

  if (form) {
    // Set date min to today
    const prefDate = document.getElementById('prefDate');
    if (prefDate) {
      const today = new Date().toISOString().split('T')[0];
      prefDate.setAttribute('min', today);
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (validateForm()) {
        submitForm();
      }
    });
  }

  function validateForm() {
    let valid = true;
    const fields = [
      { id: 'fullName',   errId: 'err-name',  msg: 'Please enter your name.' },
      { id: 'phone',      errId: 'err-phone', msg: 'Please enter your phone number.' },
      { id: 'vehicleReg', errId: 'err-reg',   msg: 'Please enter your vehicle registration.' },
      { id: 'prefDate',   errId: 'err-date',  msg: 'Please choose a preferred date.' },
    ];
    fields.forEach(({ id, errId, msg }) => {
      const input = document.getElementById(id);
      const err   = document.getElementById(errId);
      if (!input || !input.value.trim()) {
        if (err) err.textContent = msg;
        if (input) input.classList.add('error');
        valid = false;
      } else {
        if (err) err.textContent = '';
        if (input) input.classList.remove('error');
      }
    });
    return valid;
  }

  function submitForm() {
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    // Simulate submission (replace with real API call / mailto / form service)
    setTimeout(() => {
      form.style.display = 'none';
      if (successPanel) {
        successPanel.classList.add('show');
        successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 1200);
  }

  // Clear error on input
  document.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('error');
      const errId = {
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


  /* ══ 7. VEHICLE REG — auto-uppercase ════════════ */
  const regInput = document.getElementById('vehicleReg');
  if (regInput) {
    regInput.addEventListener('input', () => {
      const pos = regInput.selectionStart;
      regInput.value = regInput.value.toUpperCase();
      regInput.setSelectionRange(pos, pos);
    });
  }

});

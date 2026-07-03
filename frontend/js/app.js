/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */

/* ─────────────────────────────────────────────────────────────────
   ROUTE GUARDS
   Call window.adminOnly() or window.doctorOnly() at the top of
   any protected page's DOMContentLoaded handler to enforce access.
───────────────────────────────────────────────────────────────── */

/**
 * Resolve the correct login URL relative to the current page depth.
 */
function _loginUrl() {
  const isSubDir = window.location.pathname.includes('/doctor/') ||
                   window.location.pathname.includes('/console/');
  return isSubDir ? '../login.html' : 'login.html';
}

/**
 * Returns the current authenticated user or null.
 * Reads from localStorage first (persisted session), then sessionStorage.
 */
window.getAuthUser = function () {
  try {
    const raw = localStorage.getItem('genelab_user') ||
                sessionStorage.getItem('genelab_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

/**
 * Enforce admin-only access. Redirects immediately if the user is not
 * authenticated or does not have the 'admin' role.
 */
window.adminOnly = function () {
  const token = localStorage.getItem('genelab_token') ||
                sessionStorage.getItem('genelab_token');
  const user  = window.getAuthUser();
  if (!token || !user) {
    window.location.replace(_loginUrl());
    return false;
  }
  if (user.role !== 'admin') {
    // Non-admin landed on an admin page — redirect them to their portal
    const dest = user.role === 'doctor' || user.role === 'researcher'
      ? (window.location.pathname.includes('/console/')
          ? '../doctor/dashboard.html'
          : 'doctor/dashboard.html')
      : _loginUrl();
    window.location.replace(dest);
    return false;
  }
  return true;
};

/**
 * Enforce doctor/researcher access. Redirects if not authenticated
 * or not one of: doctor, researcher, admin.
 */
window.doctorOnly = function () {
  const token = localStorage.getItem('genelab_token') ||
                sessionStorage.getItem('genelab_token');
  const user  = window.getAuthUser();
  if (!token || !user) {
    window.location.replace(_loginUrl());
    return false;
  }
  if (!['doctor', 'researcher', 'admin'].includes(user.role)) {
    window.location.replace(_loginUrl());
    return false;
  }
  return true;
};

document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';

  if (!document.body.dataset.theme) {
    const savedTheme = localStorage.getItem('genelab-theme');
    document.body.dataset.theme = savedTheme || 'dark';
  }

  const fadeTargets = document.querySelectorAll("[data-animate='hero'], [data-animate='panel'], .glass-card");
  if (hasGsap && !reducedMotion) {
    gsap.set(fadeTargets, { opacity: 0, y: 15, scale: 0.98 });
    gsap.to(fadeTargets, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.5,
      stagger: 0.04,
      ease: 'power2.out'
    });
  } else {
    fadeTargets.forEach((item) => {
      item.style.opacity = '1';
    });
  }

  const dnaMount = document.querySelector('[data-dna-helix]') || document.getElementById('dna-canvas');
  if (dnaMount && !dnaMount.dataset.ready) {
    buildHelix(dnaMount, hasGsap && !reducedMotion);
    dnaMount.dataset.ready = 'true';
  }

  const particleField = document.getElementById('particle-field');
  if (particleField && !particleField.dataset.ready) {
    buildParticles(particleField, hasGsap && !reducedMotion);
    particleField.dataset.ready = 'true';
  }

  // Dynamic mouse position tracking for hover spotlight glows
  const cards = document.querySelectorAll('.glass-card');
  cards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  setupPointerParallax(hasGsap && !reducedMotion);

  // Populate sidebar / profile user names dynamically
  const userJson = localStorage.getItem('genelab_user') || sessionStorage.getItem('genelab_user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      const sidebarName = document.getElementById('sidebar-user-name') || document.getElementById('admin-name');
      if (sidebarName && user.name) {
        sidebarName.textContent = user.name;
      }
      if (user.role === 'researcher') {
        if (document.title.includes('Doctor')) {
          document.title = document.title.replace('Doctor', 'Researcher');
        }
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
          const parentTag = node.parentElement ? node.parentElement.tagName.toUpperCase() : '';
          if (parentTag === 'SCRIPT' || parentTag === 'STYLE') continue;
          if (node.nodeValue.includes('Doctor')) {
            node.nodeValue = node.nodeValue.replace(/Doctor/g, 'Researcher');
          }
          if (node.nodeValue.includes('doctor')) {
            node.nodeValue = node.nodeValue.replace(/doctor/g, 'researcher');
          }
        }
      }
    } catch (e) {
      console.warn('Could not customize role branding:', e);
    }
  }
});

function buildHelix(mount, animate) {
  mount.innerHTML = '';
  const helix = document.createElement('div');
  helix.className = 'dna-helix';
  const tones = ['tone-cyan', 'tone-violet', 'tone-teal', 'tone-lime', 'tone-coral'];
  const rungCount = 54;
  const rotationDuration = 24;
  const tiltDuration = 5.5;
  const swayDuration = 7.5;

  for (let index = 0; index < rungCount; index += 1) {
    const rung = document.createElement('div');
    rung.className = 'dna-rung';
    rung.style.setProperty('--index', index.toString());
    const left = document.createElement('span');
    left.className = `dna-node ${tones[index % tones.length]}`;
    const bridge = document.createElement('span');
    bridge.className = 'dna-link';
    const right = document.createElement('span');
    right.className = `dna-node ${tones[(index + 2) % tones.length]}`;
    rung.append(left, bridge, right);
    helix.appendChild(rung);
  }
  mount.appendChild(helix);

  if (animate) {
    gsap.to(helix, { rotationY: 360, duration: rotationDuration, repeat: -1, ease: 'none', transformOrigin: 'center center' });
    gsap.to(helix, { rotationX: 12, duration: tiltDuration, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to(helix, { rotationZ: 3, duration: swayDuration, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to(helix, { y: -16, duration: 3.6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }
}

function buildParticles(field, animate) {
  const count = window.innerWidth < 768 ? 18 : 34;
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    const size = Math.random() * 4 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.opacity = `${0.16 + Math.random() * 0.28}`;
    field.appendChild(particle);
    if (animate) {
      gsap.to(particle, {
        x: `+=${Math.random() * 120 - 60}`,
        y: `+=${Math.random() * 140 - 70}`,
        scale: 0.7 + Math.random() * 0.8,
        opacity: 0.08 + Math.random() * 0.32,
        duration: 12 + Math.random() * 10,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: Math.random() * 2
      });
    }
  }
}

function setupPointerParallax(animate) {
  if (!animate || typeof window.gsap === 'undefined') return;
  const glowLayers = document.querySelectorAll('.bg-glow');
  const cards = document.querySelectorAll('.glass-card');
  const dnaCanvas = document.getElementById('dna-canvas');
  document.addEventListener('pointermove', (event) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const moveX = (event.clientX - centerX) / 90;
    const moveY = (event.clientY - centerY) / 90;
    glowLayers.forEach((layer) => { gsap.to(layer, { x: moveX * 18, y: moveY * 12, duration: 1.4, ease: 'power2.out' }); });
    if (dnaCanvas) { gsap.to(dnaCanvas, { rotateY: moveX * 0.5, rotateX: -moveY * 0.35, duration: 1.5, ease: 'power2.out' }); }
    cards.forEach((card) => { gsap.to(card, { rotateY: moveX * 0.18, rotateX: -moveY * 0.12, duration: 0.8, ease: 'power2.out' }); });
  }, { passive: true });
}

/**
 * Global Toast Notification System
 * Accessible as window.showToast(message, type)
 */
window.showToast = function(message, type = 'success') {
    // 1. Ensure container exists
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // 2. Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'check_circle',
        error:   'error',
        info:    'info',
        warning: 'warning'
    };

    // Build DOM safely to avoid stored-XSS via toast message content
    const iconWrap = document.createElement('div');
    iconWrap.className = 'toast-icon';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'material-symbols-outlined';
    iconSpan.textContent = icons[type] || 'info';
    iconWrap.appendChild(iconSpan);

    const msgDiv = document.createElement('div');
    msgDiv.className = 'toast-message';
    msgDiv.textContent = message; // textContent is XSS-safe

    toast.appendChild(iconWrap);
    toast.appendChild(msgDiv);

    // 3. Add to container
    container.appendChild(toast);

    // 4. Cleanup logic
    const duration = 4000;
    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => {
            toast.remove();
            // Optional: remove container if empty to keep DOM clean
            if (container.children.length === 0) {
                container.remove();
            }
        }, { once: true });
    }, duration);
};

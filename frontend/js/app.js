/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */

window.__GENELAB_API_BASE_URL__ = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname)
  ? 'http://localhost:5000/api'
  : 'https://genelab-worker-production.up.railway.app/api';

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
                   window.location.pathname.includes('/researcher/') ||
                   window.location.pathname.includes('/ops-control/');
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
    const dest = user.role === 'doctor'
      ? (window.location.pathname.includes('/ops-control/')
          ? '../doctor/dashboard.html'
          : 'doctor/dashboard.html')
      : user.role === 'researcher'
      ? (window.location.pathname.includes('/ops-control/')
          ? '../researcher/dashboard.html'
          : 'researcher/dashboard.html')
      : _loginUrl();
    window.location.replace(dest);
    return false;
  }
  return true;
};

/**
 * Enforce doctor-only access. Redirects if not authenticated
 * or not doctor/admin.
 */
window.doctorOnly = function () {
  const token = localStorage.getItem('genelab_token') ||
                sessionStorage.getItem('genelab_token');
  const user  = window.getAuthUser();
  if (!token || !user) {
    window.location.replace(_loginUrl());
    return false;
  }
  if (!['doctor', 'admin'].includes(user.role)) {
    window.location.replace(_loginUrl());
    return false;
  }
  return true;
};

/**
 * Enforce researcher-only access. Redirects if not authenticated
 * or not researcher/admin.
 */
window.researcherOnly = function () {
  const token = localStorage.getItem('genelab_token') ||
                sessionStorage.getItem('genelab_token');
  const user  = window.getAuthUser();
  if (!token || !user) {
    window.location.replace(_loginUrl());
    return false;
  }
  if (!['researcher', 'admin'].includes(user.role)) {
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

    } catch (e) {
      console.warn('Could not customize role branding:', e);
    }
  }

  // Setup mobile layout overrides dynamically
  setupMobileHeaderAndDrawer();
  injectMobileBottomNav();

  // Enhance Form accessibility, autocomplete, and password toggles
  function enhanceForms() {
    // Autocomplete attributes
    const loginEmail = document.getElementById('login-email');
    if (loginEmail) loginEmail.setAttribute('autocomplete', 'username');

    const loginPassword = document.getElementById('login-password');
    if (loginPassword) loginPassword.setAttribute('autocomplete', 'current-password');

    const signupEmail = document.getElementById('signup-email');
    if (signupEmail) signupEmail.setAttribute('autocomplete', 'email');

    const signupPassword = document.getElementById('signup-password');
    if (signupPassword) signupPassword.setAttribute('autocomplete', 'new-password');

    // Password visibility toggles
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
      if (input.dataset.hasToggle) return;
      input.dataset.hasToggle = 'true';

      const wrapper = input.parentElement;
      if (wrapper && wrapper.classList.contains('fi')) {
        wrapper.style.position = 'relative';
        input.style.paddingRight = '2.4rem';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'pass-toggle absolute right-2 flex items-center justify-center text-slate-400 hover:text-cyan transition-colors';
        toggleBtn.style.cssText = 'border:none; background:none; cursor:pointer; height:24px; width:24px; bottom:6px; z-index:10; outline:none;';
        toggleBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">visibility</span>';
        toggleBtn.setAttribute('tabindex', '-1'); // exclude from normal tab order for better keyboard workflow

        toggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const isPass = input.type === 'password';
          input.type = isPass ? 'text' : 'password';
          toggleBtn.innerHTML = `<span class="material-symbols-outlined text-[16px]">${isPass ? 'visibility_off' : 'visibility'}</span>`;
        });

        wrapper.appendChild(toggleBtn);
      }
    });
  }

  enhanceForms();

  // Listen to tab transitions (login vs signup)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeout(enhanceForms, 100);
    });
  });

  // Inject PWA Manifest link tag dynamically
  function injectPWAManifest() {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      const pathDepth = window.location.pathname.includes('/doctor/') ||
                        window.location.pathname.includes('/researcher/') ||
                        window.location.pathname.includes('/ops-control/') ? '../..' : '.';
      link.href = `${pathDepth}/manifest.json`;
      document.head.appendChild(link);
    }
  }
  injectPWAManifest();

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    const pathDepth = window.location.pathname.includes('/doctor/') ||
                      window.location.pathname.includes('/researcher/') ||
                      window.location.pathname.includes('/ops-control/') ? '../..' : '.';
    navigator.serviceWorker.register(`${pathDepth}/sw.js`)
      .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
      .catch((err) => console.warn('Service Worker registration failed:', err));
  }

  // Connection State Indicators
  window.addEventListener('online', () => {
    if (typeof showToast === 'function') {
      showToast('Back online! Reconnected to GeneLab Services.', 'success');
    }
  });
  window.addEventListener('offline', () => {
    if (typeof showToast === 'function') {
      showToast('You are currently offline. Running in local fallback mode.', 'warning');
    }
  });
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

// ── Mobile Header, Drawer, and Bottom Navigation Helper Functions ──

function setupMobileHeaderAndDrawer() {
  // If not on mobile size, clean up and do nothing
  if (window.innerWidth > 1024) {
    const existingOverlay = document.querySelector('.drawer-overlay');
    if (existingOverlay) existingOverlay.remove();
    const existingTopbar = document.querySelector('.mobile-topbar');
    if (existingTopbar) existingTopbar.remove();
    const aside = document.querySelector('aside');
    if (aside) aside.classList.remove('drawer-open');
    return;
  }

  const aside = document.querySelector('aside');
  if (!aside) return;

  // 1. Setup Drawer Overlay
  let overlay = document.querySelector('.drawer-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    document.body.appendChild(overlay);
  }

  // 2. Setup Mobile Topbar
  let topbar = document.querySelector('.mobile-topbar');
  if (!topbar) {
    topbar = document.createElement('div');
    topbar.className = 'mobile-topbar';

    const leftSec = document.createElement('div');
    leftSec.className = 'mobile-topbar-left';

    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'mobile-topbar-menu-btn';
    const menuIcon = document.createElement('span');
    menuIcon.className = 'material-symbols-outlined';
    menuIcon.textContent = 'menu';
    menuBtn.appendChild(menuIcon);
    
    menuBtn.addEventListener('click', () => {
      aside.classList.toggle('drawer-open');
      overlay.classList.toggle('active');
    });

    const titleSpan = document.createElement('span');
    titleSpan.className = 'text-base font-display font-extrabold tracking-[0.18em]';
    titleSpan.textContent = 'GENELAB';

    leftSec.appendChild(menuBtn);
    leftSec.appendChild(titleSpan);

    const rightSec = document.createElement('div');
    rightSec.className = 'flex items-center gap-2';

    // Theme Toggle on topbar
    const themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className = 'w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center';
    themeBtn.style.background = 'rgba(255,255,255,0.03)';
    themeBtn.setAttribute('data-theme-toggle', '');
    const themeIcon = document.createElement('span');
    themeIcon.className = 'material-symbols-outlined';
    const currentTheme = document.body.dataset.theme || localStorage.getItem('genelab-theme') || 'dark';
    themeIcon.textContent = currentTheme === 'dark' ? 'dark_mode' : 'light_mode';
    themeBtn.appendChild(themeIcon);

    themeBtn.addEventListener('click', () => {
      const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
      document.body.dataset.theme = nextTheme;
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem('genelab-theme', nextTheme);
      themeIcon.textContent = nextTheme === 'dark' ? 'dark_mode' : 'light_mode';
      
      document.querySelectorAll('[data-theme-toggle] .material-symbols-outlined').forEach(ico => {
        ico.textContent = nextTheme === 'dark' ? 'dark_mode' : 'light_mode';
      });
      document.querySelectorAll('[data-theme-toggle] [data-theme-label]').forEach(lbl => {
        lbl.textContent = nextTheme === 'dark' ? 'Dark' : 'Light';
      });
    });

    rightSec.appendChild(themeBtn);

    topbar.appendChild(leftSec);
    topbar.appendChild(rightSec);

    const mainWrap = document.querySelector('.relative.z-10.flex.min-h-screen');
    if (mainWrap) {
      mainWrap.parentNode.insertBefore(topbar, mainWrap);
    } else {
      document.body.prepend(topbar);
    }
  }

  // Close drawer handlers
  overlay.addEventListener('click', () => {
    aside.classList.remove('drawer-open');
    overlay.classList.remove('active');
  });

  const links = aside.querySelectorAll('a');
  links.forEach(link => {
    link.addEventListener('click', () => {
      aside.classList.remove('drawer-open');
      overlay.classList.remove('active');
    });
  });
}

function injectMobileBottomNav() {
  if (window.innerWidth > 1024) {
    const existingNav = document.querySelector('.mobile-bottom-nav');
    if (existingNav) existingNav.remove();
    return;
  }

  const path = window.location.pathname;
  let role = '';
  if (path.includes('/doctor/')) role = 'doctor';
  else if (path.includes('/researcher/')) role = 'researcher';
  else if (path.includes('/ops-control/')) role = 'admin';

  if (!role) return;

  let nav = document.querySelector('.mobile-bottom-nav');
  if (nav) {
    const currentFile = path.split('/').pop() || 'dashboard.html';
    nav.querySelectorAll('.mobile-nav-item').forEach(item => {
      const href = item.getAttribute('href');
      if (href === currentFile) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    return;
  }

  nav = document.createElement('div');
  nav.className = 'mobile-bottom-nav';

  const currentFile = path.split('/').pop() || 'dashboard.html';

  let links = [];
  if (role === 'doctor' || role === 'researcher') {
    links = [
      { name: 'Dashboard', icon: 'dashboard', url: 'dashboard.html' },
      { name: 'Analysis', icon: 'psychology', url: 'analysis.html' },
      { name: 'Upload', icon: 'upload_file', url: 'upload.html', isCenter: true },
      { name: 'Compare', icon: 'compare_arrows', url: 'compare.html' },
      { name: 'Reports', icon: 'description', url: 'reports.html' }
    ];
  } else if (role === 'admin') {
    links = [
      { name: 'Dashboard', icon: 'analytics', url: 'dashboard.html' },
      { name: 'Doctors', icon: 'manage_accounts', url: 'doctors.html' },
      { name: 'Logs', icon: 'history', url: 'logs.html', isCenter: true },
      { name: 'Data', icon: 'dns', url: 'data.html' },
      { name: 'Settings', icon: 'settings', url: 'settings.html' }
    ];
  }

  links.forEach(link => {
    const a = document.createElement('a');
    a.href = link.url;
    
    if (link.isCenter) {
      a.className = 'mobile-nav-item-center';
      a.title = link.name;
    } else {
      a.className = 'mobile-nav-item';
      if (currentFile === link.url) {
        a.classList.add('active');
      }
      const label = document.createElement('span');
      label.textContent = link.name;
      a.appendChild(label);
    }
    
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = link.icon;
    
    if (link.isCenter) {
      a.appendChild(icon);
    } else {
      a.insertBefore(icon, a.firstChild);
    }
    
    nav.appendChild(a);
  });

  document.body.appendChild(nav);
}

let wasMobile = window.innerWidth <= 768;
window.addEventListener('resize', () => {
  setupMobileHeaderAndDrawer();
  injectMobileBottomNav();

  const isMobile = window.innerWidth <= 768;
  if (isMobile !== wasMobile) {
    wasMobile = isMobile;
    window.location.reload();
  }
});


/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */

// Determine API base URL dynamically
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

  // Populate sidebar / profile user names and avatars dynamically
  const userJson = localStorage.getItem('genelab_user') || sessionStorage.getItem('genelab_user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      const sidebarName = document.getElementById('sidebar-user-name') || document.getElementById('admin-name');
      if (sidebarName && user.name) {
        sidebarName.textContent = user.name;
      }

      const existingAvatar = document.getElementById('sidebar-user-avatar');
      const existingPlaceholder = document.getElementById('sidebar-user-avatar-placeholder');
      if (existingAvatar && user.profilePicture) {
        existingAvatar.src = user.profilePicture;
        existingAvatar.classList.remove('hidden');
        if (existingPlaceholder) existingPlaceholder.classList.add('hidden');
      }

      // Prepend dynamic profile avatar inside the sidebar container
      if (sidebarName) {
        const parent = sidebarName.parentElement;
        const outerContainer = sidebarName.closest('.sidebar-avatar-injected');
        if (parent && !outerContainer && !parent.classList.contains('sidebar-avatar-injected')) {
          parent.classList.add('sidebar-avatar-injected');
          parent.classList.add('flex', 'items-center', 'gap-3');

          const textWrapper = document.createElement('div');
          textWrapper.className = 'min-w-0 flex-1';

          while (parent.firstChild) {
            textWrapper.appendChild(parent.firstChild);
          }

          if (window.location.pathname.includes('/ops-control/')) return;
            const avatarContainer = document.createElement('div');
          avatarContainer.className = 'w-10 h-10 rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer transition-all hover:border-cyan/60';
          avatarContainer.onclick = () => {
            const pathDepth = window.location.pathname.includes('/doctor/') ||
                              window.location.pathname.includes('/researcher/') ||
                              window.location.pathname.includes('/ops-control/') ? '' : 'pages/doctor/';
            const userRole = user.role || 'doctor';
            if (userRole === 'admin') {
              window.location.href = `${pathDepth}../ops-control/dashboard.html`;
            } else if (userRole === 'researcher') {
              window.location.href = `${pathDepth}../researcher/profile.html`;
            } else {
              window.location.href = `${pathDepth}../doctor/profile.html`;
            }
          };

          const avatarImg = document.createElement('img');
          avatarImg.id = 'sidebar-user-avatar';
          avatarImg.alt = 'Avatar';
          avatarImg.className = 'w-full h-full object-cover' + (user.profilePicture ? '' : ' hidden');
          if (user.profilePicture) {
            avatarImg.src = user.profilePicture;
          }
          avatarContainer.appendChild(avatarImg);

          const avatarPlaceholder = document.createElement('span');
          avatarPlaceholder.id = 'sidebar-user-avatar-placeholder';
          avatarPlaceholder.className = 'material-symbols-outlined text-cyan text-xl' + (user.profilePicture ? ' hidden' : '');
          avatarPlaceholder.textContent = 'person';
          avatarContainer.appendChild(avatarPlaceholder);

          parent.appendChild(avatarContainer);
          parent.appendChild(textWrapper);
        }
      }

    } catch (e) {
      console.warn('Could not customize role branding:', e);
    }
  }

  // Setup mobile layout overrides dynamically
  setupMobileHeaderAndDrawer();
  injectMobileBottomNav();

  // ── Global Announcement & Notification Center ──
  const token = localStorage.getItem('genelab_token') || sessionStorage.getItem('genelab_token');
  const themeToggles = document.querySelectorAll('[data-theme-toggle]');
  if (token && themeToggles.length > 0) {
    themeToggles.forEach(toggle => {
      setupNotificationCenter(toggle);
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          setupHeaderUserMenu(toggle, user);
        } catch (err) {}
      }
    });
  }

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

function setupNotificationCenter(themeToggle) {
  const parent = themeToggle.parentElement;
  if (!parent || parent.querySelector('.notif-center-container')) return;

  const instanceId = Math.random().toString(36).substr(2, 9);

  const container = document.createElement('div');
  container.className = 'relative inline-block notif-center-container';
  container.id = 'notif-container-' + instanceId;

  // Bell Button
  const bellBtn = document.createElement('button');
  bellBtn.type = 'button';
  bellBtn.className = 'btn-premium btn-ghost px-4 py-3 rounded-xl flex items-center gap-2 text-sm relative';
  const bellIco = document.createElement('span');
  bellIco.className = 'material-symbols-outlined';
  bellIco.style.cssText = 'font-size:18px!important;width:18px!important;height:18px!important;';
  bellIco.textContent = 'notifications';
  const badge = document.createElement('span');
  badge.className = 'notif-badge absolute top-1.5 right-1.5 w-2 h-2 bg-coral rounded-full hidden animate-pulse';
  bellBtn.appendChild(bellIco);
  bellBtn.appendChild(badge);

  // Dropdown (Drawer panel overlay)
  const dropdown = document.createElement('div');
  dropdown.className = 'notif-drawer fixed right-0 top-0 h-screen w-full sm:w-96 glass-panel p-6 hidden z-[9999] shadow-2xl flex flex-col transition-all duration-300';
  dropdown.style.cssText = 'border-color: var(--border); background: var(--bg-glass); backdrop-filter: blur(24px); border-left: 1px solid var(--border);';

  const headerRow = document.createElement('div');
  headerRow.className = 'flex justify-between items-center mb-5 pb-3 border-b shrink-0';
  headerRow.style.borderColor = 'var(--border)';

  const headerLeft = document.createElement('h4');
  headerLeft.className = 'font-display font-bold text-sm text-white flex items-center gap-1.5';
  const headerIco = document.createElement('span');
  headerIco.className = 'material-symbols-outlined text-cyan';
  headerIco.style.cssText = 'font-size:18px!important;';
  headerIco.textContent = 'notifications_active';
  headerLeft.appendChild(headerIco);
  headerLeft.appendChild(document.createTextNode(' Notifications'));

  const headerRight = document.createElement('div');
  headerRight.className = 'flex items-center gap-3';

  const markReadBtn = document.createElement('button');
  markReadBtn.className = 'notif-mark-read text-[10px] text-cyan hover:underline font-bold uppercase tracking-wider';
  markReadBtn.textContent = 'Mark all read';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 active:scale-95 transition-all';
  closeBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">close</span>';

  headerRight.appendChild(markReadBtn);
  headerRight.appendChild(closeBtn);
  headerRow.appendChild(headerLeft);
  headerRow.appendChild(headerRight);

  const listEl = document.createElement('div');
  listEl.className = 'notif-list space-y-3 flex-1 overflow-y-auto pr-1';
  listEl.style.scrollbarWidth = 'none';

  dropdown.appendChild(headerRow);
  dropdown.appendChild(listEl);
  container.appendChild(bellBtn);
  document.body.appendChild(dropdown);
  parent.insertBefore(container, themeToggle);

  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = dropdown.classList.contains('hidden');
    document.querySelectorAll('.notif-drawer').forEach(d => { if (d !== dropdown) d.classList.add('hidden'); });
    document.querySelectorAll('#header-user-dropdown').forEach(d => d.classList.add('hidden'));
    dropdown.classList.toggle('hidden');
    if (isHidden) { loadNotifications(); markAllRead(); }
  });

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.add('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !container.contains(e.target)) dropdown.classList.add('hidden');
  });

  markReadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    markAllRead();
    if (window.showToast) window.showToast('All notifications marked as read.', 'success');
  });

  checkUnread();

  async function loadNotifications() {
    listEl.innerHTML = '';
    const loadingEl = document.createElement('div');
    loadingEl.className = 'text-center py-6 text-xs text-slate-500';
    loadingEl.textContent = 'Loading...';
    listEl.appendChild(loadingEl);
    try {
      const [annRes, dnaRes] = await Promise.allSettled([
        api.get('/announcements'),
        api.get('/dna/my-files')
      ]);
      const announcements = (annRes.status === 'fulfilled' ? annRes.value.announcements : []) || [];
      const dnaFiles      = (dnaRes.status === 'fulfilled' ? dnaRes.value           : []) || [];

      listEl.innerHTML = '';
      const items = [];

      announcements.forEach(ann => {
        items.push({
          type: 'announcement',
          title: ann.title,
          content: ann.content,
          authorName: ann.authorId ? ann.authorId.name || 'System' : 'System',
          authorRole: ann.authorId ? ann.authorId.role || 'admin'  : 'admin',
          avatarUrl:  ann.authorId ? ann.authorId.profilePicture || '' : '',
          priority:   ann.priority || 'low',
          date:       new Date(ann.createdAt),
          icon: 'campaign', iconColor: 'var(--cyan)',
          href: null
        });
      });

      dnaFiles
        .filter(f => f.status === 'analyzed' || f.status === 'failed')
        .slice(0, 5)
        .forEach(f => {
          const isOk = f.status === 'analyzed';
          items.push({
            type: 'job',
            title: isOk ? 'Analysis Complete' : 'Analysis Failed',
            content: f.originalName,
            authorName: 'GeneLab Engine',
            authorRole: 'bioservice',
            avatarUrl: '',
            priority: isOk ? 'medium' : 'high',
            date: new Date(f.updatedAt || f.createdAt),
            icon: isOk ? 'done_all' : 'error',
            iconColor: isOk ? 'var(--teal)' : 'var(--coral)',
            href: f._id ? 'result.html?id=' + f._id : null
          });
        });

      if (!items.length) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'text-center py-8 text-xs text-slate-500';
        emptyEl.textContent = 'No notifications yet.';
        listEl.appendChild(emptyEl);
        return;
      }

      items.sort((a, b) => b.date - a.date);
      items.forEach(item => renderItem(item));

    } catch (err) {
      listEl.innerHTML = '';
      const errEl = document.createElement('div');
      errEl.className = 'text-center py-6 text-xs';
      errEl.style.color = 'var(--coral)';
      errEl.textContent = 'Failed to load notifications.';
      listEl.appendChild(errEl);
    }
  }

  function renderItem(item) {
    const pColors = { high: 'var(--coral)', medium: 'rgba(255,204,0,1)', low: 'var(--teal)' };
    const pBg    = { high: 'rgba(255,107,107,0.12)', medium: 'rgba(255,204,0,0.1)', low: 'rgba(6,255,160,0.08)' };

    const el = document.createElement('div');
    el.className = 'flex gap-2.5 items-start p-3 rounded-xl border transition-all hover:bg-white/5';
    el.style.cssText = 'border-color: var(--border); background: rgba(255,255,255,0.01); cursor: default;';
    if (item.href) {
      const pathDepth = window.location.pathname.includes('/doctor/') ||
                        window.location.pathname.includes('/researcher/') ||
                        window.location.pathname.includes('/ops-control/') ? '' : 'pages/doctor/';
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => { window.location.href = pathDepth + item.href; });
    }

    const avatarEl = document.createElement('div');
    avatarEl.className = 'w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-white/10';
    avatarEl.style.background = 'rgba(0,212,255,0.08)';
    if (item.type === 'announcement' && item.avatarUrl) {
      const img = document.createElement('img');
      img.src = item.avatarUrl; img.alt = item.authorName;
      img.className = 'w-full h-full object-cover';
      avatarEl.appendChild(img);
    } else {
      const ico = document.createElement('span');
      ico.className = 'material-symbols-outlined';
      ico.style.cssText = 'font-size:16px!important;color:' + (item.iconColor || 'var(--cyan)') + ';';
      ico.textContent = item.icon || 'notifications';
      avatarEl.appendChild(ico);
    }

    const body = document.createElement('div');
    body.className = 'flex-1 min-w-0';

    const topRow = document.createElement('div');
    topRow.className = 'flex items-center justify-between gap-1 mb-1';
    const authorSpan = document.createElement('span');
    authorSpan.className = 'text-[10px] font-bold text-white truncate max-w-[130px]';
    authorSpan.textContent = item.authorName + ' · ' + item.authorRole;
    const pBadge = document.createElement('span');
    pBadge.className = 'text-[8px] uppercase px-1.5 py-0.5 rounded font-bold';
    pBadge.style.cssText = 'background:' + (pBg[item.priority]||'rgba(255,255,255,0.05)') + ';color:' + (pColors[item.priority]||'var(--text-faint)') + ';';
    pBadge.textContent = item.priority;
    topRow.appendChild(authorSpan);
    topRow.appendChild(pBadge);

    const titleEl = document.createElement('p');
    titleEl.className = 'text-xs font-bold text-white mb-0.5';
    titleEl.textContent = item.title;

    const contentEl = document.createElement('p');
    contentEl.className = 'text-[10px] text-slate-400 break-words leading-relaxed line-clamp-2';
    contentEl.textContent = item.content;

    const timeEl = document.createElement('span');
    timeEl.className = 'text-[8px] text-slate-500 block mt-1 font-mono';
    timeEl.textContent = getTimeElapsed(item.date);

    body.appendChild(topRow);
    body.appendChild(titleEl);
    body.appendChild(contentEl);
    body.appendChild(timeEl);
    el.appendChild(avatarEl);
    el.appendChild(body);
    listEl.appendChild(el);
  }

  async function checkUnread() {
    try {
      const [annRes, dnaRes] = await Promise.allSettled([
        api.get('/announcements'),
        api.get('/dna/my-files')
      ]);
      const anns     = (annRes.status === 'fulfilled' ? annRes.value.announcements : []) || [];
      const dnaFiles = (dnaRes.status === 'fulfilled' ? dnaRes.value               : []) || [];
      const lastRead = parseInt(localStorage.getItem('genelab_notif_read_at') || '0', 10);
      const hasNew   = anns.some(a => new Date(a.createdAt).getTime() > lastRead) ||
                       dnaFiles.some(f => (f.status === 'analyzed' || f.status === 'failed') &&
                         new Date(f.updatedAt || f.createdAt).getTime() > lastRead);
      badge.classList.toggle('hidden', !hasNew);
    } catch (_) {}
  }

  function markAllRead() {
    badge.classList.add('hidden');
    localStorage.setItem('genelab_notif_read_at', Date.now().toString());
    listEl.innerHTML = '';
    const emptyEl = document.createElement('div');
    emptyEl.className = 'text-center py-6 text-xs text-slate-500 font-medium';
    emptyEl.textContent = 'All caught up! No new notifications.';
    listEl.appendChild(emptyEl);
  }

  function getTimeElapsed(date) {
    const s = Math.floor((new Date() - date) / 1000);
    let i;
    i = Math.floor(s / 31536000); if (i >= 1) return i + 'y ago';
    i = Math.floor(s / 2592000);  if (i >= 1) return i + 'mo ago';
    i = Math.floor(s / 86400);    if (i >= 1) return i + 'd ago';
    i = Math.floor(s / 3600);     if (i >= 1) return i + 'h ago';
    i = Math.floor(s / 60);       if (i >= 1) return i + 'm ago';
    return 'just now';
  }
}


function setupHeaderUserMenu(themeToggle, user) {
  if (window.location.pathname.includes('/ops-control/')) return;
  const parent = themeToggle.parentElement;
  if (!parent || parent.querySelector('#header-user-menu-container')) return;

  const container = document.createElement('div');
  container.className = 'relative inline-block';
  container.id = 'header-user-menu-container';

  const avatarUrl = user.profilePicture || '';
  const avatarMarkup = avatarUrl 
    ? `<img src="${avatarUrl}" class="w-full h-full object-cover" id="header-user-menu-avatar" alt="${user.name}">`
    : `<span class="material-symbols-outlined text-cyan text-xl" id="header-user-menu-placeholder">person</span>`;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'header-avatar-btn';
  btn.className = 'w-11 h-11 rounded-xl overflow-hidden bg-cyan/10 border border-cyan/30 flex items-center justify-center cursor-pointer transition-all hover:border-cyan/60';
  btn.innerHTML = avatarMarkup;

  const dropdown = document.createElement('div');
  dropdown.id = 'header-user-dropdown';
  dropdown.className = 'absolute right-0 mt-2 w-52 glass-panel p-4 rounded-2xl hidden z-50 shadow-2xl transition-all duration-300';
  dropdown.style.cssText = 'top: 100%; border-color: var(--border); background: var(--bg-glass); backdrop-filter: blur(16px);';
  
  const pathDepth = window.location.pathname.includes('/doctor/') ||
                    window.location.pathname.includes('/researcher/') ||
                    window.location.pathname.includes('/ops-control/') ? '' : 'pages/doctor/';
  const userRole = user.role || 'doctor';
  let profileHref = `${pathDepth}../doctor/profile.html`;
  if (userRole === 'researcher') {
    profileHref = `${pathDepth}../researcher/profile.html`;
  }

  dropdown.innerHTML = `
    <div class="mb-3 pb-2 border-b text-left" style="border-color: var(--border);">
      <p class="text-xs font-bold text-white truncate">${user.name || 'User'}</p>
      <p class="text-[9px] font-mono text-cyan uppercase tracking-wider mt-0.5">${userRole}</p>
    </div>
    <div class="space-y-1">
      <a href="${profileHref}" class="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all text-left">
        <span class="material-symbols-outlined text-base">settings</span> Profile Settings
      </a>
      <a href="#" onclick="auth.logout()" class="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-coral hover:bg-coral/10 transition-all text-left">
        <span class="material-symbols-outlined text-base" style="color:var(--coral)">power_settings_new</span> Logout
      </a>
    </div>
  `;

  container.appendChild(btn);
  container.appendChild(dropdown);
  
  // Append inside parent
  parent.appendChild(container);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close other dropdowns/drawers
    document.querySelectorAll('.notif-drawer').forEach(d => d.classList.add('hidden'));
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}


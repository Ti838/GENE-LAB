/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Console Guard — Blocks:
 *   1. Mobile / small-screen devices from accessing admin pages.
 *   2. Unauthenticated users (no token).
 *   3. Non-admin roles (doctor, researcher, etc.).
 *
 * This script is loaded SYNCHRONOUSLY (no defer/async) at the top of every
 * console page so the check runs before any content is painted.
 */
(() => {
    // ── Helper: resolve login URL relative to current depth ──────
    function loginUrl() {
        return window.location.pathname.includes('/console/')
            ? '../login.html'
            : 'pages/login.html';
    }

    // ── 1. Auth + Role check ──────────────────────────────────────
    const token = localStorage.getItem('genelab_token') ||
                  sessionStorage.getItem('genelab_token');

    if (!token) {
        window.location.replace(loginUrl());
        return; // Stop executing — redirect is in flight
    }

    let user = null;
    try {
        const raw = localStorage.getItem('genelab_user') ||
                    sessionStorage.getItem('genelab_user');
        user = raw ? JSON.parse(raw) : null;
    } catch (_) { user = null; }

    if (!user || user.role !== 'admin') {
        // Clear any partial session and send to login
        localStorage.removeItem('genelab_token');
        localStorage.removeItem('genelab_user');
        sessionStorage.removeItem('genelab_token');
        sessionStorage.removeItem('genelab_user');
        window.location.replace(loginUrl());
        return;
    }

    // ── 2. Mobile / small-screen block ───────────────────────────
    const mobileUARegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileUA    = mobileUARegex.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth < 1024;
    const isBlockedPage = window.location.pathname.includes('mobile-blocked.html');

    if ((isMobileUA || isSmallScreen) && !isBlockedPage) {
        sessionStorage.setItem('console-block-reason', JSON.stringify({
            userAgent:     navigator.userAgent,
            resolution:    `${window.innerWidth}x${window.innerHeight}`,
            timestamp:     new Date().toISOString(),
            blockedUser:   user.email || 'unknown'
        }));

        const targetPath = window.location.pathname.includes('/console/')
            ? 'mobile-blocked.html'
            : 'console/mobile-blocked.html';

        window.location.replace(targetPath);
    }
})();


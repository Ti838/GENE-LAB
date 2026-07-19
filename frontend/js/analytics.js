/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */

// analytics.js — Real backend-driven analytics page rendering
//
// This file must NOT contain demo/mock data.
// It renders analytics by calling backend APIs.

(function () {
  const PAGE_MATCHES = [
    'analytics.html',
    '/doctor/analytics.html',
    '/researcher/analytics.html',
    '/ops-control/analytics.html',
    '/admin/analytics.html'
  ];

  function pageIsAnalytics() {
    const p = window.location.pathname || '';
    return PAGE_MATCHES.some(m => p.endsWith(m) || p.includes(m));
  }

  async function safeGetJson(fn) {
    try {
      return await fn();
    } catch (err) {
      console.error('Analytics fetch failed:', err);
      return null;
    }
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value ?? '—';
  }

  function ensureContainer(containerId) {
    const el = document.getElementById(containerId);
    return el || null;
  }

  // Renders a generic table with safe textContent only.
  function renderKeyValueList(container, entries) {
    if (!container) return;
    container.innerHTML = '';

    if (!entries || entries.length === 0) {
      const p = document.createElement('p');
      p.className = 'text-[11px] text-center italic';
      p.style.color = 'var(--text-faint)';
      p.textContent = 'No analytics data available.';
      container.appendChild(p);
      return;
    }

    entries.forEach(([k, v]) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between gap-4 py-2 border-b border-white/5';

      const left = document.createElement('span');
      left.className = 'text-[11px] font-bold uppercase tracking-wider';
      left.style.color = 'var(--text-muted)';
      left.textContent = String(k);

      const right = document.createElement('span');
      right.className = 'text-[12px] font-mono';
      right.style.color = 'var(--text)';
      right.textContent = v ?? '—';

      row.appendChild(left);
      row.appendChild(right);
      container.appendChild(row);
    });
  }

  async function init() {
    if (!pageIsAnalytics()) return;
    if (typeof api === 'undefined') return;

    // Optional role-guards (some pages may define globals like doctorOnly/researcherOnly/adminOnly)
    if (typeof window.doctorOnly === 'function' && window.location.pathname.includes('/doctor/')) {
      if (!window.doctorOnly()) return;
    }
    if (typeof window.adminOnly === 'function' && window.location.pathname.includes('/ops-control/')) {
      if (!window.adminOnly()) return;
    }
    if (typeof window.adminOnly === 'function' && window.location.pathname.includes('/admin/')) {
      if (!window.adminOnly()) return;
    }

    // Backends differ by role; use conservative approach:
    // 1) Try role-agnostic endpoints first.
    // 2) Then try role-specific endpoints if they exist.

    // Admin: /api/admin/stats
    // Doctor/Researcher: /api/dna/my-files (derive counts)

    const isAdminPage = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/ops-control/');

    if (isAdminPage) {
      const stats = await safeGetJson(() => api.get('/admin/stats'));
      if (stats) {
        setText('totalUsers', stats.totalUsers);
        setText('totalDoctors', stats.totalDoctors);
        setText('totalFiles', stats.totalFiles);
        setText('totalAnalyses', stats.totalAnalyses);

        // Many admin analytics pages may use custom containers.
        const health = stats.systemHealth || {};
        setText('sys-cpu', health.cpu);
        setText('sys-mem', health.memory);
        setText('sys-uptime', health.uptime);

        const container = ensureContainer('analytics-key-values');
        if (container) {
          const entries = [
            ['Pending Requests', stats.pendingRequests],
            ['New Users (30d)', stats.newUsersThisMonth],
            ['New Requests (30d)', stats.requestsThisMonth]
          ];
          renderKeyValueList(container, entries);
        }
      }
      return;
    }

    // For clinical roles, compute from the user's own DNA files.
    const files = await safeGetJson(() => api.get('/dna/my-files'));
    if (!files) return;

    const analyzed = files.filter(f => f.status === 'analyzed').length;
    const pending = files.filter(f => f.status === 'uploaded' || f.status === 'pending' || f.status === 'analyzing').length;
    const anomalies = files.filter(f => Boolean(f.hasAnomalies)).length;
    const total = files.length;

    setText('totalFiles', total);
    setText('analyzed', analyzed);
    setText('pending', pending);
    setText('anomalies', anomalies);

    const container = ensureContainer('analytics-key-values');
    if (container) {
      const entries = [
        ['Total Files', total],
        ['Analyses Complete', analyzed],
        ['Pending Review Queue', pending],
        ['Anomalies Detected', anomalies]
      ];
      renderKeyValueList(container, entries);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();


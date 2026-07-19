/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Portal Guard - Synchronous route guard for Doctor and Researcher portals.
 * Runs before DOM paint to prevent authorization bypass flashes.
 */
(() => {
    const path = window.location.pathname;
    const isDoctorPage = path.includes('/doctor/');
    const isResearcherPage = path.includes('/researcher/');
    if (!isDoctorPage && !isResearcherPage) return;

    const token = localStorage.getItem('genelab_token') || sessionStorage.getItem('genelab_token');
    let user = null;
    try {
        const raw = localStorage.getItem('genelab_user') || sessionStorage.getItem('genelab_user');
        user = raw ? JSON.parse(raw) : null;
    } catch (_) {}

    const loginDest = '../login.html';

    if (!token || !user) {
        window.location.replace(loginDest);
        return;
    }

    const role = user.role;
    if (isDoctorPage && !['doctor', 'admin'].includes(role)) {
        window.location.replace(loginDest);
    } else if (isResearcherPage && !['researcher', 'admin'].includes(role)) {
        window.location.replace(loginDest);
    }
})();

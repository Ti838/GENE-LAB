/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// api.js - Central API helper with DELETE support
const API_BASE_URL = window.__GENELAB_API_BASE_URL__
    || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname
        ? 'http://localhost:5000/api'
        : '/api');
const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('genelab_token') || sessionStorage.getItem('genelab_token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        };
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });
        const text = await response.text();
        let data = {};
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (error) {
                data = { message: text };
            }
        }
                if (!response.ok) {
            const errorMsg = data.message || 'Something went wrong';
            if (response.status === 401) {
                // Automatically clear invalid/expired token and redirect to login
                localStorage.removeItem('genelab_token');
                localStorage.removeItem('genelab_user');
                sessionStorage.removeItem('genelab_token');
                sessionStorage.removeItem('genelab_user');
                
                if (window.showToast) window.showToast('Session expired. Please log in again.', 'warning');
                setTimeout(() => {
                    const isSubDir = window.location.pathname.includes('/doctor/') || window.location.pathname.includes('/ops-control/');
                    window.location.href = isSubDir ? '../login.html' : 'login.html';
                }, 1500);
            } else {
                if (window.showToast) window.showToast(errorMsg, 'error');
            }
            throw new Error(errorMsg);
        }
        return data;
    },
    get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
    post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); },
    put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); },
    delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); },
    async upload(endpoint, formData) {
        const token = localStorage.getItem('genelab_token') || sessionStorage.getItem('genelab_token');
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const text = await response.text();
        let data = {};
        if (text) {
            try { data = JSON.parse(text); } catch { data = { message: text }; }
        }
        if (!response.ok) {
            const errorMsg = data.message || 'Upload failed';
            if (response.status === 401) {
                localStorage.removeItem('genelab_token');
                localStorage.removeItem('genelab_user');
                sessionStorage.removeItem('genelab_token');
                sessionStorage.removeItem('genelab_user');
                if (window.showToast) window.showToast('Session expired. Please log in again.', 'warning');
                setTimeout(() => {
                    const isSubDir = window.location.pathname.includes('/doctor/') || window.location.pathname.includes('/ops-control/');
                    window.location.href = isSubDir ? '../login.html' : 'login.html';
                }, 1500);
            } else {
                if (window.showToast) window.showToast(errorMsg, 'error');
            }
            throw new Error(errorMsg);
        }
        return data;
    },

    // PATCH (partial update) — used for profile and settings
    patch(endpoint, body) { return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }); }
};


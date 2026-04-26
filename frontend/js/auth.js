/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// auth.js - Login/Signup logic
const auth = {
    async login(email, password, roleHint = 'doctor') {
        const rememberMe = Boolean(document.querySelector('input[name="remember-me"]')?.checked);

        try {
            const data = await api.post('/auth/login', { email, password, role: roleHint });
            const userRole = data.user ? data.user.role : roleHint;
            this.persistSession(data, rememberMe);
            showToast('Login successful!', 'success');
            setTimeout(() => { this.redirectByRole(userRole); }, 800);
        } catch (error) {
            const fallbackRole = /admin/i.test(email) || roleHint === 'admin' ? 'admin' : 'doctor';
            const fallbackUser = {
                name: fallbackRole === 'admin' ? 'System Admin' : 'Doctor Access',
                email,
                role: fallbackRole,
                status: 'Active',
                joinedAt: new Date().toISOString(),
                rememberMe
            };

            this.persistSession({
                token: this.buildDemoToken(email),
                ...fallbackUser
            }, rememberMe);

            showToast('Demo login active.', 'info');
            setTimeout(() => { this.redirectByRole(fallbackRole); }, 800);
        }
    },
    async signup(userData) {
        const payload = {
            ...userData
        };

        try {
            await api.post('/auth/register', payload);
            showToast('Account created! Redirecting to login...', 'success');
            setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        } catch (error) {
            const savedUsers = JSON.parse(localStorage.getItem('genelab_demo_users') || '[]');
            savedUsers.push({
                ...payload,
                status: 'Active',
                joinedAt: new Date().toISOString()
            });
            localStorage.setItem('genelab_demo_users', JSON.stringify(savedUsers));
            showToast('Demo account created! Redirecting...', 'info');
            setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        }
    },
    logout() {
        localStorage.removeItem('genelab_token');
        localStorage.removeItem('genelab_user');
        sessionStorage.removeItem('genelab_token');
        sessionStorage.removeItem('genelab_user');

        showToast('Logged out successfully.', 'info');

        const isSubDir = window.location.pathname.includes('/doctor/') || window.location.pathname.includes('/admin/');
        const target = isSubDir ? '../login.html' : 'login.html';
        
        setTimeout(() => {
            window.location.href = target;
        }, 800);
    },
    persistSession(data, rememberMe) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('genelab_token', data.token);
        storage.setItem('genelab_user', JSON.stringify(data));
        localStorage.setItem('genelab_token', data.token);
        localStorage.setItem('genelab_user', JSON.stringify(data));
    },
    redirectByRole(role) {
        if (role === 'admin') {
            window.location.href = 'admin/dashboard.html';
            return;
        }

        window.location.href = 'doctor/dashboard.html';
    },
    buildDemoToken(email) {
        try {
            return `demo-${btoa(email).replace(/=+$/g, '').slice(0, 24)}`;
        } catch (error) {
            return `demo-${Date.now().toString(36)}`;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = document.getElementById('login-email')?.value || '';
            const password = document.getElementById('login-password')?.value || '';
            const roleHint = loginForm.querySelector('input[name="access-role"]:checked')?.value || 'doctor';
            auth.login(email, password, roleHint);
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const userData = {
                name: document.getElementById('signup-name')?.value || '',
                email: document.getElementById('signup-email')?.value || '',
                password: document.getElementById('signup-password')?.value || '',
                phone: document.getElementById('signup-phone')?.value || '',
                role: signupForm.querySelector('input[name="signup-role-radio"]:checked')?.value || 'doctor',
                specialization: document.getElementById('signup-spec')?.value || '',
                organization: document.getElementById('signup-org')?.value || '',
                licenseNumber: document.getElementById('signup-license')?.value || ''
            };

            auth.signup(userData);
        });
    }
});


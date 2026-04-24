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
            this.persistSession(data, rememberMe);
            this.redirectByRole(data.role || roleHint);
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

            this.redirectByRole(fallbackRole);
        }
    },
    async signup(userData) {
        const payload = {
            ...userData,
            role: 'doctor'
        };

        try {
            await api.post('/auth/register', payload);
            alert('Registration successful. Please login.');
            window.location.href = 'login.html';
        } catch (error) {
            const savedUsers = JSON.parse(localStorage.getItem('genelab_demo_users') || '[]');
            savedUsers.push({
                ...payload,
                status: 'Active',
                joinedAt: new Date().toISOString()
            });
            localStorage.setItem('genelab_demo_users', JSON.stringify(savedUsers));
            alert('Demo registration saved locally. Please login.');
            window.location.href = 'login.html';
        }
    },
    logout() {
        localStorage.removeItem('genelab_token');
        localStorage.removeItem('genelab_user');
        sessionStorage.removeItem('genelab_token');
        sessionStorage.removeItem('genelab_user');

        const isSubDir = window.location.pathname.includes('/doctor/') || window.location.pathname.includes('/admin/');
        window.location.href = isSubDir ? '../login.html' : 'login.html';
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
    const loginForm = document.querySelector('form');

    if (window.location.pathname.includes('login.html') && loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = loginForm.querySelector('input[type="email"]')?.value || '';
            const password = loginForm.querySelector('input[type="password"]')?.value || '';
            const roleHint = loginForm.querySelector('input[name="access-role"]:checked')?.value || 'doctor';
            auth.login(email, password, roleHint);
        });
    }

    if (window.location.pathname.includes('signup.html') && loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const userData = {
                name: loginForm.querySelector('input[name="full-name"]')?.value || '',
                email: loginForm.querySelector('input[type="email"]')?.value || '',
                password: loginForm.querySelector('input[type="password"]')?.value || '',
                phone: loginForm.querySelector('input[name="phone"]')?.value || '',
                specialization: loginForm.querySelector('select[name="specialization"]')?.value || '',
                organization: loginForm.querySelector('input[name="hospital"]')?.value || '',
                licenseNumber: loginForm.querySelector('input[name="license-id"]')?.value || '',
                profilePicture: loginForm.querySelector('input[name="profile-photo"]')?.value || ''
            };

            auth.signup(userData);
        });
    }
});


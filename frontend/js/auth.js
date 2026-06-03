// auth.js - Login, signup, Google sign-in, and password reset flows
const auth = {
    firebaseReady: false,
    firebaseAuth: null,

    async loadFirebaseClient() {
        if (this.firebaseReady) return this.firebaseAuth;
        if (typeof window.firebase === 'undefined') {
            return null;
        }

        try {
            const response = await api.get('/auth/firebase-config');
            if (!response.configured) {
                return null;
            }

            const config = response.config;
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(config);
            }

            this.firebaseAuth = window.firebase.auth();
            this.firebaseReady = true;
            return this.firebaseAuth;
        } catch (error) {
            console.warn('Firebase client initialization skipped:', error.message);
            return null;
        }
    },

    setButtonLoading(button, isLoading, loadingText) {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.disabled = true;
            button.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm" style="font-size:14px!important;">sync</span> ${loadingText || 'Loading...'}`;
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || button.textContent;
        }
    },

    persistSession(data, rememberMe) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('genelab_token', data.token);
        storage.setItem('genelab_user', JSON.stringify(data.user || data));
        localStorage.setItem('genelab_token', data.token);
        localStorage.setItem('genelab_user', JSON.stringify(data.user || data));
    },

    redirectByRole(role) {
        // Determine base path depending on where we are
        const isAtPages = window.location.pathname.includes('/pages/login');
        const base = isAtPages ? '' : 'pages/';

        if (role === 'admin') {
            window.location.href = base + 'admin/dashboard.html';
            return;
        }
        if (role === 'researcher') {
            window.location.href = base + 'doctor/dashboard.html';
            return;
        }
        window.location.href = base + 'doctor/dashboard.html';
    },

    async login(email, phone, password) {
        const rememberMe = Boolean(document.querySelector('input[name="remember-me"]')?.checked);
        const payload = { password };
        if (email) payload.email = email;
        if (phone) payload.phone = phone;

        const response = await api.post('/auth/login', payload);
        this.persistSession(response, rememberMe);
        showToast(response.message || 'Login successful!', 'success');
        setTimeout(() => { this.redirectByRole(response.user?.role || 'doctor'); }, 700);
    },

    async signup(userData) {
        const response = await api.post('/auth/register', userData);

        if (response.requiresVerification) {
            showToast(response.message || 'Account created. Check your inbox to verify your email.', 'success');
            return response;
        }

        showToast(response.message || 'Account created successfully.', 'success');
        return response;
    },

    async loginWithGoogle(button) {
        const firebaseAuth = await this.loadFirebaseClient();
        if (!firebaseAuth) {
            showToast('Google sign-in is not configured yet.', 'error');
            return;
        }

        const provider = new window.firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        // Read whichever role the user has selected in the form tiles
        const selectedRole = document.querySelector('input[name="signup-role-radio"]:checked')?.value
            || document.querySelector('input[name="access-role"]:checked')?.value
            || 'doctor';

        auth.setButtonLoading(button, true, 'Connecting...');
        try {
            const result = await firebaseAuth.signInWithPopup(provider);
            const idToken = await result.user.getIdToken();
            const response = await api.post('/auth/google', { idToken, role: selectedRole });
            const rememberMe = Boolean(document.querySelector('input[name="remember-me"]')?.checked);
            this.persistSession(response, rememberMe);
            showToast(response.message || 'Google sign-in successful!', 'success');
            setTimeout(() => { this.redirectByRole(response.user?.role || selectedRole); }, 700);
        } catch (error) {
            const message = error.code === 'auth/popup-closed-by-user'
                ? 'Google sign-in was cancelled.'
                : (error.message || 'Google sign-in failed.');
            showToast(message, 'error');
        } finally {
            auth.setButtonLoading(button, false);
        }
    },

    async requestPasswordReset(email, button) {
        if (!email) {
            showToast('Enter the email address for your account.', 'error');
            return;
        }

        auth.setButtonLoading(button, true, 'Sending...');
        try {
            const response = await api.post('/auth/forgot-password', { email });
            showToast(response.message || 'Password reset email sent.', 'success');
            if (response.debugResetLink) {
                showToast('Debug reset link is available in the backend response.', 'info');
            }
        } finally {
            auth.setButtonLoading(button, false);
        }
    },

    async submitPasswordReset(token, newPassword) {
        const response = await api.post('/auth/reset-password', { token, newPassword });
        showToast(response.message || 'Password updated successfully.', 'success');
        window.location.href = 'login.html';
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
    }
};

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function openPasswordResetModal(resetToken = '') {
    const modal = document.getElementById('forgot-password-modal');
    const modalOverlay = document.getElementById('forgot-password-overlay');
    const tokenInput = document.getElementById('reset-password-token');
    const forgotForm = document.getElementById('forgot-password-form');
    const resetForm = document.getElementById('reset-password-form');
    if (!modal || !modalOverlay) return;

    if (resetToken) {
        if (tokenInput) tokenInput.value = resetToken;
        if (forgotForm) forgotForm.classList.add('hidden');
        if (resetForm) resetForm.classList.remove('hidden');
    } else {
        if (forgotForm) forgotForm.classList.remove('hidden');
        if (resetForm) resetForm.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
}

function closePasswordResetModal() {
    const modal = document.getElementById('forgot-password-modal');
    const modalOverlay = document.getElementById('forgot-password-overlay');
    if (modal) modal.classList.add('hidden');
    if (modalOverlay) modalOverlay.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const googleBtns = document.querySelectorAll('.js-google-signin-btn');
    const forgotLink = document.getElementById('forgot-password-link');
    const forgotForm = document.getElementById('forgot-password-form');
    const resetForm = document.getElementById('reset-password-form');
    const closeResetBtn = document.getElementById('close-reset-modal');
    const resetToken = getQueryParam('resetToken');

    if (resetToken) {
        openPasswordResetModal(resetToken);
    }

    if (loginForm) {
        const methodBtns = document.querySelectorAll('.login-method-btn');
        const emailGroup = document.getElementById('email-input-group');
        const phoneGroup = document.getElementById('phone-input-group');
        const emailInput = document.getElementById('login-email');
        const phoneInput = document.getElementById('login-phone');

        if (methodBtns.length > 0) {
            methodBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const method = btn.dataset.method;

                    methodBtns.forEach(b => {
                        b.style.background = 'transparent';
                        b.style.color = 'var(--text-muted)';
                        b.style.borderColor = 'var(--border)';
                    });

                    btn.style.background = 'rgba(0,212,255,0.15)';
                    btn.style.color = 'var(--cyan)';
                    btn.style.borderColor = 'var(--cyan)';

                    if (method === 'email') {
                        if (emailGroup) emailGroup.classList.remove('hidden');
                        if (phoneGroup) phoneGroup.classList.add('hidden');
                        if (emailInput) emailInput.focus();
                    } else {
                        if (emailGroup) emailGroup.classList.add('hidden');
                        if (phoneGroup) phoneGroup.classList.remove('hidden');
                        if (phoneInput) phoneInput.focus();
                    }
                });
            });
        }

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            auth.setButtonLoading(submitBtn, true, 'Signing in...');

            try {
                let email = '';
                let phone = '';

                if (emailInput && !phoneInput) {
                    const inputVal = emailInput.value.trim();
                    if (inputVal.includes('@')) {
                        email = inputVal;
                    } else {
                        phone = inputVal;
                    }
                } else {
                    if (emailInput) email = emailInput.value.trim();
                    if (phoneInput) phone = phoneInput.value.trim();
                }

                const password = document.getElementById('login-password')?.value || '';
                await auth.login(email, phone, password);
            } catch (error) {
                showToast(error.message || 'Sign in failed.', 'error');
            } finally {
                auth.setButtonLoading(submitBtn, false);
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            auth.setButtonLoading(submitBtn, true, 'Creating account...');

            try {
                const userData = {
                    name: document.getElementById('signup-name')?.value.trim() || '',
                    email: document.getElementById('signup-email')?.value.trim() || '',
                    password: document.getElementById('signup-password')?.value || '',
                    phone: document.getElementById('signup-phone')?.value.trim() || '',
                    gender: document.getElementById('signup-gender')?.value || '',
                    role: signupForm.querySelector('input[name="signup-role-radio"]:checked')?.value || 'doctor',
                    specialization: document.getElementById('signup-spec')?.value.trim() || '',
                    organization: document.getElementById('signup-org')?.value.trim() || '',
                    licenseNumber: document.getElementById('signup-license')?.value.trim() || ''
                };

                await auth.signup(userData);
            } catch (error) {
                showToast(error.message || 'Account creation failed.', 'error');
            } finally {
                auth.setButtonLoading(submitBtn, false);
            }
        });
    }

    googleBtns.forEach((button) => {
        button.addEventListener('click', async (event) => {
            event.preventDefault();
            await auth.loginWithGoogle(button);
        });
    });

    if (forgotLink) {
        forgotLink.addEventListener('click', (event) => {
            event.preventDefault();
            openPasswordResetModal();
        });
    }

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = forgotForm.querySelector('button[type="submit"]');
            const email = document.getElementById('forgot-password-email')?.value.trim();
            await auth.requestPasswordReset(email, button);
        });
    }

    if (resetForm) {
        resetForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = resetForm.querySelector('button[type="submit"]');
            const token = document.getElementById('reset-password-token')?.value.trim();
            const newPassword = document.getElementById('reset-password-new')?.value || '';
            const confirmPassword = document.getElementById('reset-password-confirm')?.value || '';

            if (newPassword !== confirmPassword) {
                showToast('Passwords do not match.', 'error');
                return;
            }

            auth.setButtonLoading(button, true, 'Updating...');
            try {
                await auth.submitPasswordReset(token, newPassword);
            } catch (error) {
                showToast(error.message || 'Password reset failed.', 'error');
            } finally {
                auth.setButtonLoading(button, false);
            }
        });
    }

    if (closeResetBtn) {
        closeResetBtn.addEventListener('click', closePasswordResetModal);
    }
});
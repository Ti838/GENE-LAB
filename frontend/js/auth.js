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
        // Also ensure local storage has the role for future session recovery if needed
        localStorage.setItem('genelab_last_role', data.user?.role || 'doctor');
    },

    redirectByRole(role) {
        if (role === 'admin') {
            window.location.href = 'admin/dashboard.html';
            return;
        }

        window.location.href = 'doctor/dashboard.html';
    },

    async login(email, phone, password) {
        const rememberMe = Boolean(document.querySelector('input[name="remember-me"]')?.checked);
        const payload = { password };
        if (email) payload.email = email;
        if (phone) payload.phone = phone;

        try {
            const response = await api.post('/auth/login', payload);
            this.persistSession(response, rememberMe);
            showToast(response.message || 'Welcome back to GeneLab!', 'success');
            setTimeout(() => { this.redirectByRole(response.user?.role || 'doctor'); }, 800);
        } catch (error) {
            // Error toast is handled by api.js, but we can add specific handling here if needed
            throw error;
        }
    },

    async signup(userData) {
        const response = await api.post('/auth/register', userData);

        if (response.requiresVerification) {
            showToast('Account created! Please check your email for verification.', 'success');
            // If debug link exists (local dev), log it to console for easier testing
            if (response.debugVerificationLink) {
                console.info('Dev Verification Link:', response.debugVerificationLink);
            }
            // Transition back to login panel after a delay to encourage sign-in after verification
            setTimeout(() => {
                const container = document.getElementById('container');
                if (container) container.classList.remove('right-panel-active');
            }, 3000);
            return response;
        }

        showToast('Account created successfully. You can now sign in.', 'success');
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

        auth.setButtonLoading(button, true, 'Connecting...');
        try {
            const result = await firebaseAuth.signInWithPopup(provider);
            const idToken = await result.user.getIdToken();
            const response = await api.post('/auth/google', { idToken });
            const rememberMe = Boolean(document.querySelector('input[name="remember-me"]')?.checked);
            this.persistSession(response, rememberMe);
            showToast(response.message || 'Google sign-in successful!', 'success');
            setTimeout(() => { this.redirectByRole(response.user?.role || 'doctor'); }, 700);
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
    if (!modal || !modalOverlay) return;

    if (tokenInput && resetToken) {
        tokenInput.value = resetToken;
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
                    emailGroup.classList.remove('hidden');
                    phoneGroup.classList.add('hidden');
                    emailInput.focus();
                } else {
                    emailGroup.classList.add('hidden');
                    phoneGroup.classList.remove('hidden');
                    phoneInput.focus();
                }
            });
        });

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            auth.setButtonLoading(submitBtn, true, 'Signing in...');

            try {
                const email = document.getElementById('login-email').value.trim();
                const phone = document.getElementById('login-phone').value.trim();
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
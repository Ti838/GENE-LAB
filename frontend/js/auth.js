// auth.js - Login, signup, Google sign-in, and password reset flows
const auth = {

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
        // Write ONLY to the appropriate storage based on rememberMe
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('genelab_token', data.token);
        storage.setItem('genelab_user', JSON.stringify(data.user || data));
        // Always keep a localStorage copy for the guard functions (session check)
        // but remove it if the user did NOT check rememberMe (so it won't persist across browser closes)
        if (!rememberMe) {
            localStorage.removeItem('genelab_token');
            localStorage.removeItem('genelab_user');
        }
    },

    redirectByRole(role) {
        // Build the target path based on current depth in the pages/ directory
        const path = window.location.pathname;
        const inPages = path.includes('/pages/') || path.endsWith('login.html') || path.endsWith('index.html');
        const base = inPages ? '' : 'pages/';

        if (role === 'admin') {
            const inOpsControl = path.includes('/ops-control/');
            window.location.href = inOpsControl ? 'dashboard.html' : base + 'ops-control/dashboard.html';
            return;
        }
        if (role === 'researcher') {
            const inResearcher = path.includes('/researcher/');
            window.location.href = inResearcher ? 'dashboard.html' : base + 'researcher/dashboard.html';
            return;
        }
        const inDoctor = path.includes('/doctor/');
        window.location.href = inDoctor ? 'dashboard.html' : base + 'doctor/dashboard.html';
    },

    async login(email, phone, password) {
        const rememberMe = Boolean(document.querySelector('input[name="remember-me"]')?.checked);
        const payload = { password };
        if (email) payload.email = email;
        if (phone) payload.phone = phone;

        const response = await api.post('/auth/login', payload);
        const role = response.user?.role || response.role;
        const isAdminGateway = window.location.pathname.includes('/ops-control/');

        if (isAdminGateway && role !== 'admin') {
            throw new Error('Access denied. Secure gateway is restricted to administrators.');
        }
        if (!isAdminGateway && role === 'admin') {
            throw new Error('Admin logins are restricted to the secure gateway.');
        }

        this.persistSession(response, rememberMe);
        showToast(response.message || 'Login successful!', 'success');
        setTimeout(() => { this.redirectByRole(role || 'doctor'); }, 700);
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
        auth.setButtonLoading(button, true, 'Connecting...');
        try {
            const response = await api.get('/auth/google-config');
            if (!response.configured) {
                showToast('Google login is not configured on the server.', 'error');
                return;
            }

            const selectedRole = document.querySelector('input[name="signup-role-radio"]:checked')?.value
                || document.querySelector('input[name="access-role"]:checked')?.value
                || 'doctor';

            localStorage.setItem('genelab_pending_role', selectedRole);

            // Redirect directly to Google OAuth implicit flow
            const redirectUri = window.location.origin + window.location.pathname;
            const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${response.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token&scope=openid%20profile%20email&nonce=genelab-nonce`;
            
            window.location.href = googleAuthUrl;
        } catch (err) {
            console.error(err);
            showToast('Failed to start Google login: ' + err.message, 'error');
        } finally {
            auth.setButtonLoading(button, false);
        }
    },

    async handleOAuthCallback() {
        const hash = window.location.hash || '';
        if (!hash.includes('id_token=')) {
            return;
        }

        const params = new URLSearchParams(hash.substring(1));
        const idToken = params.get('id_token');
        if (!idToken) return;

        // Clear hash from URL immediately
        window.history.replaceState(null, null, window.location.pathname);

        const selectedRole = localStorage.getItem('genelab_pending_role') || 'doctor';
        localStorage.removeItem('genelab_pending_role');

        try {
            const response = await api.post('/auth/google', { idToken, role: selectedRole });
            const rememberMe = true;
            this.persistSession(response, rememberMe);

            showToast(response.message || 'Google sign-in successful!', 'success');
            setTimeout(() => { this.redirectByRole(response.user?.role || selectedRole); }, 700);
        } catch (err) {
            console.error("Verification backend error:", err);
            showToast(err.message || 'Verification failed.', 'error');
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

        let target = 'login.html';
        if (window.location.pathname.includes('/doctor/')) {
            target = '../login.html';
        } else if (window.location.pathname.includes('/ops-control/')) {
            target = 'login.html';
        }

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
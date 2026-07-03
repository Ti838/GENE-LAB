/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
// profile.js - Profile Management with Stats & Change Password

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.doctorOnly === 'function' && !window.doctorOnly()) return;
    const profileForm = document.getElementById('doctor-profile-form');
    const passwordForm = document.getElementById('doctor-password-form');

    const API_BASE_URL = window.__GENELAB_API_BASE_URL__
        || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname
            ? 'http://localhost:5000/api'
            : '/api');
    const profilePhotoInput = document.querySelector('[data-profile-photo-input]');
    const profilePhotoPreview = document.querySelector('[data-profile-photo-preview]');
    const profilePhotoIcon = document.querySelector('[data-profile-photo-icon]');
    const changePhotoBtn = document.querySelectorAll('[data-change-photo]');

    function togglePhotoUI(hasPhoto) {
        if (hasPhoto) {
            profilePhotoPreview.style.display = 'block';
            profilePhotoPreview.classList.remove('hidden');
            profilePhotoIcon.style.display = 'none';
            profilePhotoIcon.classList.add('hidden');
        } else {
            profilePhotoPreview.style.display = 'none';
            profilePhotoPreview.classList.add('hidden');
            profilePhotoIcon.style.display = 'block';
            profilePhotoIcon.classList.remove('hidden');
        }
    }

    async function loadProfile() {
        try {
            const response = await api.get('/auth/me');
            const user = response.user; // Access nested user object
            if (!user) return;

            // Fill form fields
            const fields = ['name', 'email', 'phone', 'specialization', 'organization', 'licenseNumber'];
            fields.forEach(field => {
                const input = profileForm.querySelector(`[name="${field}"]`);
                if (input) {
                    input.value = user[field] || '';
                }
            });

            // Set dynamic display fields in left card
            const leftName = document.getElementById('profile-display-name');
            if (leftName) leftName.textContent = user.name || 'Doctor Profile';

            const sidebarName = document.getElementById('sidebar-user-name') || document.getElementById('admin-name');
            if (sidebarName) sidebarName.textContent = user.name || 'Dr. User';

            const leftTitle = document.getElementById('profile-display-title');
            if (leftTitle) leftTitle.textContent = user.specialization || 'Clinical Specialist';

            const leftRole = document.getElementById('profile-display-role');
            if (leftRole) leftRole.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

            const leftDate = document.getElementById('profile-display-date');
            if (leftDate) leftDate.textContent = new Date(user.createdAt).toLocaleDateString();

            // Profile photo
            if (user.profilePicture) {
                profilePhotoPreview.src = user.profilePicture;
                togglePhotoUI(true);
            } else {
                togglePhotoUI(false);
            }

            // Load and update statistics
            loadStats();

        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    }

    async function loadStats() {
        try {
            const files = await api.get('/dna/my-files');
            const total = files.length;
            const analyzed = files.filter(f => f.status === 'analyzed').length;

            const filesEl = document.getElementById('profile-stat-files');
            const reportsEl = document.getElementById('profile-stat-reports');

            if (filesEl) filesEl.textContent = total;
            if (reportsEl) reportsEl.textContent = analyzed;
        } catch (err) {
            console.error('Failed to load profile stats:', err);
        }
    }

    if (profileForm) {
        profileForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(profileForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const btn = profileForm.querySelector('button[type="submit"]');
                const originalText = btn.textContent;
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm" style="font-size:14px!important;">sync</span> Updating...';

                const response = await api.put('/profile', data);
                
                if (response.user) {
                    // Update storage
                    const inLocal = !!localStorage.getItem('genelab_token');
                    const userJson = JSON.stringify(response.user);
                    if (inLocal) {
                        localStorage.setItem('genelab_user', userJson);
                    } else {
                        sessionStorage.setItem('genelab_user', userJson);
                    }

                    // Update UI text immediately
                    const leftName = document.getElementById('profile-display-name');
                    if (leftName) leftName.textContent = response.user.name || 'Doctor Profile';

                    const leftTitle = document.getElementById('profile-display-title');
                    if (leftTitle) leftTitle.textContent = response.user.specialization || 'Clinical Specialist';

                    const sidebarName = document.getElementById('sidebar-user-name') || document.getElementById('admin-name');
                    if (sidebarName) sidebarName.textContent = response.user.name || 'Dr. User';
                }

                showToast('Profile updated successfully!', 'success');
                btn.disabled = false;
                btn.textContent = originalText;
            } catch (error) {
                showToast('Update failed: ' + error.message, 'error');
            }
        };
    }

    if (passwordForm) {
        passwordForm.onsubmit = async (e) => {
            e.preventDefault();
            const currentPassword = passwordForm.querySelector('[name="currentPassword"]').value;
            const newPassword = passwordForm.querySelector('[name="newPassword"]').value;
            const confirmPassword = passwordForm.querySelector('[name="confirmPassword"]').value;

            if (newPassword !== confirmPassword) {
                showToast('New passwords do not match!', 'error');
                return;
            }

            try {
                const btn = passwordForm.querySelector('button[type="submit"]');
                const originalText = btn.textContent;
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm" style="font-size:14px!important;">sync</span> Updating...';

                await api.put('/profile/password', { currentPassword, newPassword });
                showToast('Password updated successfully!', 'success');
                passwordForm.reset();
                btn.disabled = false;
                btn.textContent = originalText;
            } catch (error) {
                showToast('Password update failed: ' + error.message, 'error');
            }
        };
    }

    changePhotoBtn.forEach(btn => {
        btn.onclick = () => profilePhotoInput.click();
    });

    if (profilePhotoInput) {
        profilePhotoInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Basic size check
            if (file.size > 2 * 1024 * 1024) {
                showToast('File is too large! Max size 2MB.', 'error');
                return;
            }

            try {
                const reader = new FileReader();
                reader.onload = (e) => {
                    profilePhotoPreview.src = e.target.result;
                    togglePhotoUI(true);
                };
                reader.readAsDataURL(file);

                const formData = new FormData();
                formData.append('profilePhoto', file);

                const token = localStorage.getItem('genelab_token') || sessionStorage.getItem('genelab_token');
                const response = await fetch(`${API_BASE_URL}/profile/photo`, {
                    method: 'PUT',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    body: formData
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Profile photo upload failed.');
                }

                if (data.user) {
                    const inLocal = !!localStorage.getItem('genelab_token');
                    const userJson = JSON.stringify(data.user);
                    if (inLocal) {
                        localStorage.setItem('genelab_user', userJson);
                    } else {
                        sessionStorage.setItem('genelab_user', userJson);
                    }
                }

                showToast('Profile photo updated successfully!', 'success');
            } catch (error) {
                showToast('Preview failed: ' + error.message, 'error');
            }
        };
    }

    await loadProfile();
});

/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
// profile.js - Profile Management

document.addEventListener('DOMContentLoaded', async () => {
    const profileForm = document.getElementById('doctor-profile-form');

const API_BASE_URL = window.__GENELAB_API_BASE_URL__
    || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
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
            const user = response.user; // Corrected: Access nested user object
            if (!user) return;

            // Fill form fields
            const fields = ['name', 'email', 'phone', 'specialization', 'organization', 'licenseNumber'];
            fields.forEach(field => {
                const input = profileForm.querySelector(`[name="${field}"]`);
                if (input && user[field]) {
                    input.value = user[field];
                }
            });

            // Set static display fields
            const roleBadge = document.querySelector('.status-chip.status-online');
            if (roleBadge) roleBadge.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

            const createdDate = document.querySelector('.status-chip.status-muted');
            if (createdDate) createdDate.textContent = new Date(user.createdAt).toLocaleDateString();

            // Profile photo
            if (user.profilePicture) {
                profilePhotoPreview.src = user.profilePicture;
                togglePhotoUI(true);
            } else {
                togglePhotoUI(false);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
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

                await api.put('/profile', data);
                
                // Show success notification
                showToast('Profile updated successfully!', 'success');
                btn.disabled = false;
                btn.textContent = originalText;
            } catch (error) {
                showToast('Update failed: ' + error.message, 'error');
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
                    localStorage.setItem('genelab_user', JSON.stringify(data.user));
                    sessionStorage.setItem('genelab_user', JSON.stringify(data.user));
                }

                showToast('Profile photo updated successfully!', 'success');
            } catch (error) {
                showToast('Preview failed: ' + error.message, 'error');
            }
        };
    }

    await loadProfile();
});

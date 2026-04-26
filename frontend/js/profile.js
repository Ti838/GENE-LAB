/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
// profile.js - Profile Management

document.addEventListener('DOMContentLoaded', async () => {
    const profileForm = document.getElementById('doctor-profile-form');
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
            if (user.profilePhoto) {
                profilePhotoPreview.src = user.profilePhoto;
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
                
                // Note: Real upload would go here via API
                // For now we simulate the successful update
                showToast('Profile photo preview updated!', 'info');
            } catch (error) {
                showToast('Preview failed: ' + error.message, 'error');
            }
        };
    }

    await loadProfile();
});

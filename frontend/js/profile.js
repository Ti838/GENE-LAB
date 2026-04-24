// profile.js - Profile Management
document.addEventListener('DOMContentLoaded', async () => {
    const profileForm = document.getElementById('doctor-profile-form');
    const profilePhotoInput = document.querySelector('[data-profile-photo-input]');
    const profilePhotoPreview = document.querySelector('[data-profile-photo-preview]');
    const profilePhotoIcon = document.querySelector('[data-profile-photo-icon]');
    const changePhotoBtn = document.querySelectorAll('[data-change-photo]');

    async function loadProfile() {
        try {
            const user = await api.get('/auth/me');
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
                profilePhotoPreview.classList.remove('hidden');
                profilePhotoIcon.classList.add('hidden');
            }
        } catch (error) {
            console.error(error);
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
                btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Updating...';

                await api.post('/auth/profile/update', data);
                
                alert('Profile updated successfully!');
                btn.disabled = false;
                btn.textContent = originalText;
            } catch (error) {
                alert('Update failed: ' + error.message);
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

            const formData = new FormData();
            formData.append('photo', file);

            try {
                // Here we'd call a photo upload endpoint if we had one
                // For now, let's just simulate preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    profilePhotoPreview.src = e.target.result;
                    profilePhotoPreview.classList.remove('hidden');
                    profilePhotoIcon.classList.add('hidden');
                };
                reader.readAsDataURL(file);
                
                alert('Profile photo upload feature coming soon! Previewing locally.');
            } catch (error) {
                alert('Upload failed: ' + error.message);
            }
        };
    }

    await loadProfile();
});

/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
// admin.js - Admin Dashboard Logic (doctors management, metrics, logs, DNA data control)
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    // ============================
    // ADMIN DASHBOARD - Metrics & Charts
    // ============================
    if (path.includes('admin/dashboard.html')) {
        try {
            const data = await api.get('/admin/stats');
            
            // 1. Update stat cards
            const statEls = document.querySelectorAll('[data-metric]');
            statEls.forEach(el => {
                const key = el.dataset.metric;
                if (data[key] !== undefined) el.textContent = data[key].toLocaleString();
            });

            // 2. Update Storage Chart with real data
            if (window.genelabCharts) {
                // Calculation for distribution: Analyzed vs Pending
                const analyzed = data.totalAnalyses || 0;
                const pending = Math.max(0, (data.totalFiles || 0) - analyzed);
                
                // If there's a nucleotideChart ID on dashboard, we can repurpose or use storageChart
                const storageCtx = document.getElementById('storageChart');
                if (storageCtx && typeof Chart !== 'undefined') {
                    const isLight = document.body?.dataset.theme === 'light';
                    new Chart(storageCtx, {
                        type: 'doughnut',
                        data: {
                            labels: ['Analyzed', 'Pending'],
                            datasets: [{
                                data: [analyzed, pending],
                                backgroundColor: ['#06ffa0', '#00d4ff'],
                                borderWidth: 0,
                                hoverOffset: 10
                            }]
                        },
                        options: {
                            cutout: '75%',
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: { color: isLight ? '#5b6c84' : '#8d9bb5', font: { size: 10, weight: 'bold' }, padding: 20 }
                                }
                            }
                        }
                    });
                }
            }

            // 3. Recent logs
            const logsContainer = document.getElementById('recent-logs');
            if (logsContainer) {
                const logsData = await api.get('/admin/audit-logs?limit=5');
                logsContainer.innerHTML = '';
                if (!logsData.logs || logsData.logs.length === 0) {
                    logsContainer.innerHTML = '<p class="text-sm italic opacity-50 text-center p-6">No recent logs found.</p>';
                } else {
                    logsData.logs.forEach(log => {
                        const iconMap = { 'login': 'login', 'register': 'person_add', 'update_user': 'manage_accounts', 'delete_user': 'person_remove', 'approve_request': 'check_circle', 'reject_request': 'cancel' };
                        const colorMap = { 'login': 'text-cyan', 'register': 'text-teal', 'delete_user': 'text-coral', 'update_user': 'text-violet-400' };
                        const icon = iconMap[log.action] || 'history';
                        const color = colorMap[log.action] || 'text-cyan';
                        const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const userName = log.userId?.name || 'System';

                        const row = document.createElement('div');
                        row.className = 'flex gap-3 items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-cyan/20 transition-all';
                        row.innerHTML = `
                            <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                <span class="material-symbols-outlined !text-[18px] ${color}">${icon}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-[11px] font-bold text-white uppercase tracking-wider">${log.action.replace('_', ' ')}</p>
                                <p class="text-[9px] text-slate-500 font-medium truncate">${userName}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-[9px] text-slate-600 font-mono">${time}</p>
                            </div>
                        `;
                        logsContainer.appendChild(row);
                    });
                }
            }
        } catch (error) {
            console.error('Dashboard metrics error:', error);
        }
    }

    // ============================
    // USER MANAGEMENT (Doctors/Employees)
    // ============================
    if (path.includes('admin/doctors.html')) {
        const tableBody = document.getElementById('doctors-table-body');
        const searchInput = document.getElementById('doctor-search');
        let allUsers = [];

        async function loadUsers() {
            try {
                const data = await api.get('/admin/users');
                allUsers = data.users;
                renderUsers(allUsers);
            } catch (error) {
                console.error(error);
                if (tableBody) tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-red-400 p-6">Failed to load users</td></tr>';
            }
        }

        function renderUsers(users) {
            if (!tableBody) return;
            tableBody.innerHTML = '';

            users.forEach(user => {
                const statusClass = user.isActive ? 'bg-teal/20 text-teal border-teal/30' : 'bg-coral/20 text-coral border-coral/30';
                const statusLabel = user.isActive ? 'Active' : 'Deactivated';

                const row = document.createElement('tr');
                row.className = 'hover:bg-white/5 transition';
                row.innerHTML = `
                    <td class="p-4">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl bg-cyan/10 flex items-center justify-center text-cyan text-sm font-bold">${user.name?.charAt(0) || '?'}</div>
                            <div>
                                <p class="text-sm font-bold text-white">${user.name}</p>
                                <p class="text-[10px] text-slate-500">${user.email}</p>
                            </div>
                        </div>
                    </td>
                    <td class="p-4 text-sm text-slate-400">${user.specialization || '-'}</td>
                    <td class="p-4 text-sm text-slate-400 uppercase font-bold text-[10px] tracking-widest">${user.role}</td>
                    <td class="p-4">
                        <span class="text-[9px] font-bold uppercase px-3 py-1 rounded-full border ${statusClass}">${statusLabel}</span>
                    </td>
                    <td class="p-4 text-[10px] text-slate-500 font-mono">${new Date(user.createdAt).toLocaleDateString()}</td>
                    <td class="p-4">
                        <div class="flex gap-2 justify-end">
                            <button onclick="toggleUserStatus('${user._id}', ${user.isActive})" class="px-3 py-1.5 rounded-lg bg-violet-400/10 border border-violet-400/30 text-violet-400 text-[10px] font-bold hover:bg-violet-400/20 transition">${user.isActive ? 'Suspend' : 'Restore'}</button>
                            <button onclick="deleteUser('${user._id}', '${user.name}')" class="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition">🗑</button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase();
                const filtered = allUsers.filter(d => d.name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q));
                renderUsers(filtered);
            });
        }

        window.toggleUserStatus = async (id, currentStatus) => {
            try {
                await api.put(`/admin/users/${id}`, { isActive: !currentStatus });
                showToast('User status updated successfully!', 'success');
                await loadUsers();
            } catch (error) { showToast('Failed: ' + error.message, 'error'); }
        };

        window.deleteUser = async (id, name) => {
            if (!confirm(`Delete user "${name}"?`)) return;
            try {
                await api.delete(`/admin/users/${id}`);
                showToast('User deleted successfully!', 'success');
                await loadUsers();
            } catch (error) { showToast('Failed: ' + error.message, 'error'); }
        };

        await loadUsers();
    }

    // ============================
    // DNA DATA REGISTRY
    // ============================
    if (path.includes('admin/data.html')) {
        const dataBody = document.getElementById('dna-data-body');
        let currentRegistryFiles = [];

        async function loadDNAData() {
            try {
                const files = await api.get('/admin/dna');
                currentRegistryFiles = files || [];
                if (!dataBody) return;
                dataBody.innerHTML = '';
                files.forEach(file => {
                    const statusColors = { uploaded: 'text-yellow-400', analyzed: 'text-teal', failed: 'text-coral' };
                    const row = document.createElement('tr');
                    row.className = 'hover:bg-white/5 transition';
                    row.innerHTML = `
                        <td class="p-4">
                            <div class="flex items-center gap-3">
                                <span class="material-symbols-outlined text-cyan text-lg">description</span>
                                <p class="text-sm font-bold text-white">${file.originalName}</p>
                            </div>
                        </td>
                        <td class="p-4 text-sm text-slate-400">${file.doctor?.name || 'Unknown'}</td>
                        <td class="p-4 text-sm ${statusColors[file.status] || 'text-slate-400'} uppercase font-bold text-[10px]">${file.status}</td>
                        <td class="p-4 text-[10px] text-slate-500 font-mono">${new Date(file.createdAt).toLocaleString()}</td>
                        <td class="p-4 text-right">
                            <button onclick="deleteDNAFile('${file._id}', '${file.originalName}')" class="px-3 py-1.5 rounded-lg bg-coral/10 border border-coral/30 text-coral text-[10px] font-bold hover:bg-coral/20 transition">Delete</button>
                        </td>
                    `;
                    dataBody.appendChild(row);
                });
            } catch (error) { console.error(error); }
        }

        window.exportDataRegistry = () => {
            if (!currentRegistryFiles || currentRegistryFiles.length === 0) {
                showToast('No registry data available to export', 'info');
                return;
            }
            let csv = '\uFEFF'; // UTF-8 BOM for Excel compatibility
            csv += 'Sequence ID,Owner / Node,Status,Timestamp\n';
            currentRegistryFiles.forEach(file => {
                const id = file._id.substr(-8).toUpperCase();
                const owner = file.doctor?.name || 'Unknown';
                const status = file.status;
                const date = new Date(file.createdAt).toLocaleString().replace(/,/g, '');
                csv += `"${id}","${owner}","${status}","${date}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `genelab_dna_registry_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Registry exported successfully!', 'success');
        };

        window.deleteDNAFile = async (id, name) => {
            if (!confirm(`Delete file "${name}"?`)) return;
            try { 
                await api.delete(`/admin/dna/${id}`); 
                showToast('DNA file deleted successfully!', 'success');
                await loadDNAData(); 
            } catch (error) { showToast(error.message, 'error'); }
        };
        await loadDNAData();
    }

    // ============================
    // ANNOUNCEMENTS
    // ============================
    const annList = document.getElementById('announcements-list');
    const annForm = document.getElementById('announcement-form');

    async function loadAnnouncements() {
        if (!annList) return;
        try {
            const data = await api.get('/announcements');
            annList.innerHTML = '';
            const list = data.announcements || [];
            if (list.length === 0) {
                annList.innerHTML = '<p class="italic text-center p-4 text-xs opacity-50">No recent broadcasts.</p>';
                return;
            }
            list.slice(0, 3).forEach(ann => {
                const priorityColors = { high: 'bg-coral/20 text-coral', medium: 'bg-violet/20 text-violet', low: 'bg-teal/20 text-teal' };
                const div = document.createElement('div');
                div.className = 'p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3 relative group';
                div.innerHTML = `
                    <div class="flex justify-between items-center">
                        <span class="text-[8px] font-extrabold ${priorityColors[ann.priority] || 'bg-slate-500/20 text-slate-400'} px-2 py-0.5 rounded uppercase tracking-tighter">${ann.priority} priority</span>
                        <button onclick="deleteAnnouncement('${ann._id}')" class="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-coral"><span class="material-symbols-outlined !text-[14px]">delete</span></button>
                    </div>
                    <div>
                        <p class="text-[11px] font-bold text-white mb-1">${ann.title}</p>
                        <p class="text-[10px] text-slate-500 leading-relaxed line-clamp-2">${ann.content}</p>
                    </div>
                `;
                annList.appendChild(div);
            });
        } catch (error) { console.error('Announcements error:', error); }
    }

    window.showAnnouncementModal = () => document.getElementById('announcement-modal')?.classList.remove('hidden');
    window.closeAnnouncementModal = () => document.getElementById('announcement-modal')?.classList.add('hidden');

    window.deleteAnnouncement = async (id) => {
        if (!confirm('Delete this announcement?')) return;
        try {
            await api.delete(`/announcements/${id}`);
            showToast('Announcement deleted!', 'success');
            await loadAnnouncements();
        } catch (error) { /* handled in api.js */ }
    };

    if (annForm) {
        annForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = { title: document.getElementById('ann-title').value, content: document.getElementById('ann-content').value, priority: document.getElementById('ann-priority').value };
            try {
                await api.post('/announcements', body);
                showToast('Announcement posted successfully!', 'success');
                closeAnnouncementModal();
                annForm.reset();
                await loadAnnouncements();
            } catch (error) { /* handled in api.js */ }
        });
    }

    if (path.includes('admin/dashboard.html')) {
        loadAnnouncements();
    }
});

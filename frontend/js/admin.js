/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
// admin.js - Admin Dashboard Logic (doctors management, metrics, logs, DNA data control)
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    // ============================
    // ADMIN DASHBOARD - Metrics & Charts (Handled inline in dashboard.html to prevent duplication)
    // ============================

    // ============================
    // USER MANAGEMENT (Doctors/Employees)
    // ============================
    if (path.includes('console/doctors.html')) {
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
    if (path.includes('console/data.html')) {
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
    // ACTIVITY LOGS
    // ============================
    if (path.includes('console/logs.html')) {
        const logsBody = document.getElementById('logs-body');
        
        async function loadLogs() {
            try {
                const logsData = await api.get('/admin/audit-logs?limit=100');
                if (!logsBody) return;
                logsBody.innerHTML = '';
                
                if (!logsData.logs || logsData.logs.length === 0) {
                    logsBody.innerHTML = '<tr><td colspan="5" class="p-10 text-center italic" style="color:var(--text-faint)">No activity logs recorded.</td></tr>';
                    return;
                }
                
                logsData.logs.forEach(log => {
                    const time = new Date(log.timestamp).toLocaleString();
                    const who = log.userId?.name || 'System';
                    const role = log.userId?.role || 'system';
                    const action = log.action || 'unknown';
                    const details = log.details || '-';
                    
                    const row = document.createElement('tr');
                    row.className = 'hover:bg-white/5 transition';
                    row.style = 'border-bottom:1px solid var(--border)';
                    row.innerHTML = `
                        <td class="p-4 text-xs font-mono text-slate-500">${time}</td>
                        <td class="p-4 text-sm font-bold text-white">${who}</td>
                        <td class="p-4 text-xs uppercase font-bold text-[10px] tracking-widest" style="color:var(--text-faint)">${role}</td>
                        <td class="p-4 text-xs font-mono uppercase text-teal font-bold">${action.replace(/_/g, ' ')}</td>
                        <td class="p-4 text-xs text-slate-300 max-w-xs truncate" title="${details}">${details}</td>
                    `;
                    logsBody.appendChild(row);
                });
            } catch (error) {
                console.error('Audit logs load error:', error);
                if (logsBody) logsBody.innerHTML = '<tr><td colspan="5" class="p-10 text-center text-coral italic">Failed to load system audit ledger.</td></tr>';
            }
        }
        await loadLogs();
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
            data.announcements.slice(0, 3).forEach(ann => {
                const priorityColors = { high: 'text-coral', medium: 'text-violet-400', low: 'text-teal' };
                const div = document.createElement('div');
                div.className = 'p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2';
                div.innerHTML = `
                    <div class="flex justify-between items-start">
                        <span class="text-[9px] font-bold ${priorityColors[ann.priority]} uppercase tracking-widest">${ann.priority} priority</span>
                        <button onclick="deleteAnnouncement('${ann._id}')" class="text-slate-600 hover:text-coral transition"><span class="material-symbols-outlined" style="font-size:16px!important;">delete</span></button>
                    </div>
                    <p class="text-xs font-bold text-white">${ann.title}</p>
                    <p class="text-[10px] text-slate-500 line-clamp-1">${ann.content}</p>
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

});

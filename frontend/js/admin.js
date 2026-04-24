/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// admin.js - Admin Dashboard Logic (doctors management, metrics, logs, DNA data control)
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    // ============================
    // ADMIN DASHBOARD - Metrics
    // ============================
    // ============================
    // ADMIN DASHBOARD - Metrics
    // ============================
    if (path.includes('admin/dashboard.html')) {
        try {
            const data = await api.get('/admin/stats');
            
            // Update stat cards
            const statEls = document.querySelectorAll('[data-metric]');
            statEls.forEach(el => {
                const key = el.dataset.metric;
                if (data[key] !== undefined) el.textContent = data[key].toLocaleString();
            });

            // Recent logs
            const logsContainer = document.getElementById('recent-logs');
            if (logsContainer) {
                const logsData = await api.get('/admin/audit-logs?limit=5');
                logsContainer.innerHTML = '';
                logsData.logs.forEach(log => {
                    const iconMap = {
                        'login': 'login',
                        'register': 'person_add',
                        'update_user': 'manage_accounts',
                        'delete_user': 'person_remove',
                        'approve_request': 'check_circle',
                        'reject_request': 'cancel'
                    };
                    const colorMap = {
                        'login': 'text-cyan',
                        'register': 'text-teal',
                        'delete_user': 'text-coral',
                        'update_user': 'text-violet-400'
                    };
                    const icon = iconMap[log.action] || 'history';
                    const color = colorMap[log.action] || 'text-cyan';
                    const time = new Date(log.timestamp).toLocaleString();
                    const userName = log.userId?.name || 'System';

                    const row = document.createElement('div');
                    row.className = 'flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan/20 transition-all';
                    row.innerHTML = `
                        <span class="material-symbols-outlined ${color}">${icon}</span>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-bold text-white">${log.action}</p>
                            <p class="text-[10px] text-slate-500 font-mono truncate">${JSON.stringify(log.details) || ''}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="text-[10px] text-slate-600 font-mono">${time}</p>
                            <p class="text-[10px] text-slate-500">${userName}</p>
                        </div>
                    `;
                    logsContainer.appendChild(row);
                });
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

            if (users.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-slate-500 p-6 italic">No users found</td></tr>';
                return;
            }

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
                    <td class="p-4 text-sm text-slate-400">${user.role}</td>
                    <td class="p-4">
                        <span class="text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${statusClass}">${statusLabel}</span>
                    </td>
                    <td class="p-4 text-[10px] text-slate-500 font-mono">${new Date(user.createdAt).toLocaleDateString()}</td>
                    <td class="p-4">
                        <div class="flex gap-2 justify-end">
                            <button onclick="toggleUserStatus('${user._id}', ${user.isActive})" class="px-3 py-1.5 rounded-lg bg-violet-400/10 border border-violet-400/30 text-violet-400 text-[10px] font-bold hover:bg-violet-400/20 transition" title="Toggle Status">${user.isActive ? 'Deactivate' : 'Activate'}</button>
                            <button onclick="deleteUser('${user._id}', '${user.name}')" class="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition" title="Delete">🗑</button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }

        // Search filter
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase();
                const filtered = allUsers.filter(d =>
                    d.name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.role?.toLowerCase().includes(q)
                );
                renderUsers(filtered);
            });
        }

        // Global functions for buttons
        window.toggleUserStatus = async (id, currentStatus) => {
            try {
                await api.put(`/admin/users/${id}`, { isActive: !currentStatus });
                await loadUsers();
            } catch (error) { alert('Failed: ' + error.message); }
        };

        window.deleteUser = async (id, name) => {
            if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
            try {
                await api.delete(`/admin/users/${id}`);
                await loadUsers();
            } catch (error) { alert('Failed: ' + error.message); }
        };

        await loadUsers();
    }

    // ============================
    // DNA DATA CONTROL
    // ============================
    if (path.includes('admin/data.html')) {
        const dataBody = document.getElementById('dna-data-body');

        async function loadDNAData() {
            try {
                const files = await api.get('/admin/dna');
                if (!dataBody) return;
                dataBody.innerHTML = '';

                if (files.length === 0) {
                    dataBody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-500 p-6 italic">No DNA files in the system</td></tr>';
                    return;
                }

                files.forEach(file => {
                    const statusColors = {
                        uploaded: 'text-yellow-400',
                        analyzed: 'text-teal',
                        failed: 'text-coral'
                    };
                    const row = document.createElement('tr');
                    row.className = 'hover:bg-white/5 transition';
                    row.innerHTML = `
                        <td class="p-4">
                            <div class="flex items-center gap-3">
                                <span class="material-symbols-outlined text-cyan text-lg">description</span>
                                <p class="text-sm font-bold text-white">${file.originalName}</p>
                            </div>
                        </td>
                        <td class="p-4 text-sm text-slate-400">${file.doctor?.name || 'Unknown'} <span class="text-[10px] text-slate-600">(${file.doctor?.email || ''})</span></td>
                        <td class="p-4 text-sm ${statusColors[file.status] || 'text-slate-400'} uppercase font-bold text-xs">${file.status}</td>
                        <td class="p-4 text-[10px] text-slate-500 font-mono">${new Date(file.createdAt).toLocaleString()}</td>
                        <td class="p-4">
                            <button onclick="deleteDNAFile('${file._id}', '${file.originalName}')" class="px-3 py-1.5 rounded-lg bg-coral/10 border border-coral/30 text-coral text-[10px] font-bold hover:bg-coral/20 transition">🗑 Delete</button>
                        </td>
                    `;
                    dataBody.appendChild(row);
                });
            } catch (error) {
                console.error(error);
            }
        }

        window.deleteDNAFile = async (id, name) => {
            if (!confirm(`Delete file "${name}"?`)) return;
            try {
                await api.delete(`/admin/dna/${id}`);
                await loadDNAData();
            } catch (error) { alert('Failed: ' + error.message); }
        };

        await loadDNAData();
    }

    // ============================
    // LOGS
    // ============================
    if (path.includes('admin/logs.html')) {
        const logsBody = document.getElementById('logs-body');

        try {
            const logs = await api.get('/admin/logs');
            if (!logsBody) return;
            logsBody.innerHTML = '';

            if (logs.length === 0) {
                logsBody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-500 p-6 italic">No logs yet</td></tr>';
                return;
            }

            logs.forEach(log => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-white/5 transition';
                row.innerHTML = `
                    <td class="p-4 text-[10px] text-slate-500 font-mono">${new Date(log.createdAt).toLocaleString()}</td>
                    <td class="p-4 text-sm text-white font-bold">${log.user?.name || 'System'}</td>
                    <td class="p-4 text-sm text-slate-400">${log.user?.role || '-'}</td>
                    <td class="p-4">
                        <span class="text-xs font-bold text-cyan">${log.action}</span>
                    </td>
                    <td class="p-4 text-xs text-slate-500 font-mono max-w-xs truncate">${log.details || '-'}</td>
                `;
                logsBody.appendChild(row);
            });
        } catch (error) {
            console.error(error);
        }
    }

    // ============================
    // ANALYTICS
    // ============================
    if (path.includes('admin/analytics.html')) {
        try {
            const data = await api.get('/admin/metrics');
            const m = data.metrics;

            // Update any metric elements
            document.querySelectorAll('[data-metric]').forEach(el => {
                const key = el.dataset.metric;
                if (m[key] !== undefined) el.textContent = m[key].toLocaleString();
            });

            // Build charts if Chart.js is available
            if (typeof Chart !== 'undefined') {
                const isLight = document.body?.dataset?.theme === 'light';
                const axisColor = isLight ? '#5b6c84' : '#8d9bb5';
                const gridColor = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)';

                const userChartCtx = document.getElementById('userGrowthChart');
                if (userChartCtx) {
                    new Chart(userChartCtx, {
                        type: 'line',
                        data: {
                            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                            datasets: [{
                                label: 'Doctors',
                                data: [Math.max(1, m.totalDoctors - 3), Math.max(1, m.totalDoctors - 2), Math.max(1, m.totalDoctors - 1), m.totalDoctors],
                                borderColor: '#53e6ff',
                                backgroundColor: 'rgba(83,230,255,0.12)',
                                tension: 0.4, fill: true, pointRadius: 4
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: gridColor }, ticks: { color: axisColor } }, x: { grid: { color: gridColor }, ticks: { color: axisColor } } } }
                    });
                }

                const uploadChartCtx = document.getElementById('uploadTrendChart');
                if (uploadChartCtx) {
                    new Chart(uploadChartCtx, {
                        type: 'bar',
                        data: {
                            labels: ['Uploaded', 'Analyzed', 'Pending'],
                            datasets: [{
                                label: 'Files',
                                data: [m.totalFiles, m.totalAnalyses, Math.max(0, m.totalFiles - m.totalAnalyses)],
                                backgroundColor: ['#53e6ff', '#3ff0bf', '#ff9e72'],
                                borderRadius: 12, borderSkipped: false
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: gridColor }, ticks: { color: axisColor } }, x: { grid: { display: false }, ticks: { color: axisColor } } } }
                    });
                }
            }
        } catch (error) {
            console.error('Analytics error:', error);
        }
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
            if (data.announcements.length === 0) {
                annList.innerHTML = '<p class="italic text-center p-4 text-xs" style="color:var(--text-faint)">No recent announcements.</p>';
                return;
            }
            data.announcements.forEach(ann => {
                const priorityColors = { high: 'text-coral', medium: 'text-violet-400', low: 'text-teal' };
                const div = document.createElement('div');
                div.className = 'p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2';
                div.innerHTML = `
                    <div class="flex justify-between items-start">
                        <span class="text-xs font-bold ${priorityColors[ann.priority]} uppercase tracking-widest">${ann.priority} priority</span>
                        <button onclick="deleteAnnouncement('${ann._id}')" class="text-slate-600 hover:text-coral transition"><span class="material-symbols-outlined" style="font-size:16px!important;">delete</span></button>
                    </div>
                    <p class="text-sm font-bold text-white">${ann.title}</p>
                    <p class="text-xs text-slate-400 line-clamp-2">${ann.content}</p>
                    <p class="text-[10px] text-slate-600 font-mono">${new Date(ann.createdAt).toLocaleDateString()} • ${ann.authorId?.name || 'Admin'}</p>
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
            await loadAnnouncements();
        } catch (error) { alert(error.message); }
    };

    if (annForm) {
        annForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                title: document.getElementById('ann-title').value,
                content: document.getElementById('ann-content').value,
                priority: document.getElementById('ann-priority').value
            };
            try {
                await api.post('/announcements', body);
                closeAnnouncementModal();
                annForm.reset();
                await loadAnnouncements();
            } catch (error) { alert(error.message); }
        });
    }

    if (path.includes('admin/dashboard.html')) {
        loadAnnouncements();
    }
});


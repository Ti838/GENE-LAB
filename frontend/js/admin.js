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
    if (path.includes('admin/dashboard.html')) {
        try {
            const data = await api.get('/admin/metrics');
            const m = data.metrics;

            // Update stat cards
            const statEls = document.querySelectorAll('[data-metric]');
            statEls.forEach(el => {
                const key = el.dataset.metric;
                if (m[key] !== undefined) el.textContent = m[key].toLocaleString();
            });

            // Recent logs
            const logsContainer = document.getElementById('recent-logs');
            if (logsContainer && data.recentLogs) {
                logsContainer.innerHTML = '';
                data.recentLogs.forEach(log => {
                    const iconMap = {
                        'Upload DNA': 'upload_file',
                        'Analyze DNA': 'psychology',
                        'Compare DNA': 'compare_arrows',
                        'Delete DNA': 'delete',
                        'Pattern Search': 'search',
                        'Paste DNA': 'content_paste',
                        'Update Doctor Status': 'verified_user',
                        'Delete Doctor': 'person_remove'
                    };
                    const colorMap = {
                        'Upload DNA': 'text-cyan',
                        'Analyze DNA': 'text-teal',
                        'Delete DNA': 'text-coral',
                        'Delete Doctor': 'text-coral',
                        'Update Doctor Status': 'text-violet-400'
                    };
                    const icon = iconMap[log.action] || 'history';
                    const color = colorMap[log.action] || 'text-cyan';
                    const time = new Date(log.createdAt).toLocaleString();
                    const userName = log.user?.name || 'System';

                    const row = document.createElement('div');
                    row.className = 'flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan/20 transition-all';
                    row.innerHTML = `
                        <span class="material-symbols-outlined ${color}">${icon}</span>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-bold text-white">${log.action}</p>
                            <p class="text-[10px] text-slate-500 font-mono truncate">${log.details || ''}</p>
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
    // DOCTOR MANAGEMENT
    // ============================
    if (path.includes('admin/doctors.html')) {
        const tableBody = document.getElementById('doctors-table-body');
        const searchInput = document.getElementById('doctor-search');
        let allDoctors = [];

        async function loadDoctors() {
            try {
                allDoctors = await api.get('/admin/doctors');
                renderDoctors(allDoctors);
            } catch (error) {
                console.error(error);
                if (tableBody) tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-red-400 p-6">Failed to load doctors</td></tr>';
            }
        }

        function renderDoctors(doctors) {
            if (!tableBody) return;
            tableBody.innerHTML = '';

            if (doctors.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-slate-500 p-6 italic">No doctors found</td></tr>';
                return;
            }

            doctors.forEach(doc => {
                const statusColors = {
                    approved: 'bg-teal/20 text-teal border-teal/30',
                    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                    blocked: 'bg-coral/20 text-coral border-coral/30'
                };
                const statusClass = statusColors[doc.status] || statusColors.pending;

                const row = document.createElement('tr');
                row.className = 'hover:bg-white/5 transition';
                row.innerHTML = `
                    <td class="p-4">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl bg-cyan/10 flex items-center justify-center text-cyan text-sm font-bold">${doc.name?.charAt(0) || '?'}</div>
                            <div>
                                <p class="text-sm font-bold text-white">${doc.name}</p>
                                <p class="text-[10px] text-slate-500">${doc.email}</p>
                            </div>
                        </div>
                    </td>
                    <td class="p-4 text-sm text-slate-400">${doc.specialization || '-'}</td>
                    <td class="p-4 text-sm text-slate-400">${doc.hospital || '-'}</td>
                    <td class="p-4">
                        <span class="text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${statusClass}">${doc.status}</span>
                    </td>
                    <td class="p-4 text-[10px] text-slate-500 font-mono">${new Date(doc.createdAt).toLocaleDateString()}</td>
                    <td class="p-4">
                        <div class="flex gap-2">
                            ${doc.status !== 'approved' ? `<button onclick="updateDoctorStatus('${doc._id}', 'approved')" class="px-3 py-1.5 rounded-lg bg-teal/10 border border-teal/30 text-teal text-[10px] font-bold hover:bg-teal/20 transition" title="Approve">✓ Approve</button>` : ''}
                            ${doc.status !== 'blocked' ? `<button onclick="updateDoctorStatus('${doc._id}', 'blocked')" class="px-3 py-1.5 rounded-lg bg-coral/10 border border-coral/30 text-coral text-[10px] font-bold hover:bg-coral/20 transition" title="Block">⛔ Block</button>` : ''}
                            ${doc.status === 'blocked' ? `<button onclick="updateDoctorStatus('${doc._id}', 'approved')" class="px-3 py-1.5 rounded-lg bg-teal/10 border border-teal/30 text-teal text-[10px] font-bold hover:bg-teal/20 transition" title="Unblock">🔓 Unblock</button>` : ''}
                            <button onclick="deleteDoctor('${doc._id}', '${doc.name}')" class="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition" title="Delete">🗑</button>
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
                const filtered = allDoctors.filter(d =>
                    d.name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.specialization?.toLowerCase().includes(q)
                );
                renderDoctors(filtered);
            });
        }

        // Global functions for buttons
        window.updateDoctorStatus = async (id, status) => {
            try {
                await api.put(`/admin/doctors/${id}/status`, { status });
                await loadDoctors();
            } catch (error) { alert('Failed: ' + error.message); }
        };

        window.deleteDoctor = async (id, name) => {
            if (!confirm(`Delete doctor "${name}" and ALL their DNA data? This cannot be undone.`)) return;
            try {
                await api.delete(`/admin/doctors/${id}`);
                await loadDoctors();
            } catch (error) { alert('Failed: ' + error.message); }
        };

        await loadDoctors();
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
});


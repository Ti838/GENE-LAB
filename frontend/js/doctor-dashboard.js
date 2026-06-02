/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
// doctor-dashboard.js - Live Data & Chart Filter Logic

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('doctor/dashboard.html')) return;

    let allFiles = [];

    async function refreshDashboard(timeframe = 'monthly') {
        try {
            if (allFiles.length === 0) {
                allFiles = await api.get('/dna/my-files');
            }
            
            // 1. Update Stat Cards
            const analyzed = allFiles.filter(f => f.status === 'analyzed').length;
            const anomalies = allFiles.filter(f => f.hasAnomalies).length;
            
            const setStat = (id, val) => {
                const el = document.querySelector(`[data-stat="${id}"]`);
                if (el) el.textContent = val.toLocaleString();
            };
            setStat('totalFiles', allFiles.length);
            setStat('analyzed', analyzed);
            setStat('anomalies', anomalies);

            // 2. Process Chart Data
            let labels = [];
            let counts = [];

            if (timeframe === 'weekly') {
                // Last 7 days
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    labels.push(days[d.getDay()]);
                    counts.push(0);
                }
                allFiles.forEach(f => {
                    const fDate = new Date(f.createdAt);
                    const diffDays = Math.floor((new Date() - fDate) / (1000 * 60 * 60 * 24));
                    if (diffDays < 7) {
                        counts[6 - diffDays]++;
                    }
                });
            } else {
                // Last 6 months (Monthly)
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const curMonth = new Date().getMonth();
                for (let i = 5; i >= 0; i--) {
                    const idx = (curMonth - i + 12) % 12;
                    labels.push(months[idx]);
                    counts.push(0);
                }
                allFiles.forEach(f => {
                    const fDate = new Date(f.createdAt);
                    const monthName = months[fDate.getMonth()];
                    const idx = labels.indexOf(monthName);
                    if (idx !== -1) counts[idx]++;
                });
            }

            // Push to Chart
            if (window.genelabCharts) {
                window.genelabCharts.updateTrend(labels, counts);
            }

            // 3. Update Activity Logs (UI)
            renderLogs(allFiles);

        } catch (error) {
            console.error('Dashboard Error:', error);
        }
    }

    function renderLogs(files) {
        const container = document.getElementById('system-activity-logs');
        if (!container) return;
        container.innerHTML = '';
        
        const sorted = [...files].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        if (sorted.length === 0) {
            container.innerHTML = '<p class="text-sm opacity-40 text-center py-4">No recent activity.</p>';
            return;
        }

        sorted.forEach(f => {
            const time = new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const div = document.createElement('div');
            div.className = 'flex gap-3 items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-cyan/20 transition-all cursor-pointer';
            div.innerHTML = `
                <div class="w-8 h-8 rounded-lg ${f.status === 'analyzed' ? 'bg-teal/10 text-teal' : 'bg-cyan/10 text-cyan'} flex items-center justify-center">
                    <span class="material-symbols-outlined !text-[18px]">
                        ${f.status === 'analyzed' ? 'verified' : 'upload_file'}
                    </span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-white truncate">${f.status === 'analyzed' ? 'Analysis Ready' : 'Sequence Staged'}</p>
                    <p class="text-[9px] text-slate-500 font-mono truncate">${f.originalName}</p>
                </div>
                <span class="text-[9px] text-slate-600 font-bold">${time}</span>
            `;
            container.appendChild(div);
        });

        // Populate the new table
        const tableBody = document.getElementById('recent-dna-table');
        if (tableBody) {
            tableBody.innerHTML = '';
            sorted.forEach(f => {
                const row = document.createElement('tr');
                row.className = 'group hover:bg-white/[0.02] transition-colors';
                const date = new Date(f.createdAt).toLocaleDateString();
                const statusBadge = f.status === 'analyzed'
                    ? '<span class="px-2 py-0.5 rounded bg-teal/10 text-teal text-[9px] font-bold uppercase">Analyzed</span>'
                    : '<span class="px-2 py-0.5 rounded bg-cyan/10 text-cyan text-[9px] font-bold uppercase">Pending</span>';

                row.innerHTML = `
                    <td class="py-4">
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-outlined text-slate-500 group-hover:text-cyan transition-colors">description</span>
                            <span class="text-xs font-bold text-slate-200">${f.originalName}</span>
                        </div>
                    </td>
                    <td class="py-4 text-[11px] text-slate-500 font-medium">${date}</td>
                    <td class="py-4">${statusBadge}</td>
                    <td class="py-4 text-right">
                        <button class="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                            <span class="material-symbols-outlined !text-[16px]">visibility</span>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    // Event Listeners for Filters
    document.querySelectorAll('[data-timeframe]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-timeframe]').forEach(b => b.classList.remove('btn-cyan'));
            btn.classList.add('btn-cyan');
            refreshDashboard(btn.dataset.timeframe);
        });
    });

    // Initial Load
    refreshDashboard('monthly');
});

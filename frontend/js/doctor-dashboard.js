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
        
        const sorted = [...files].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
        if (sorted.length === 0) {
            container.innerHTML = '<p class="text-sm opacity-40 text-center py-4">No recent activity.</p>';
            return;
        }

        sorted.forEach(f => {
            const time = new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const div = document.createElement('div');
            div.className = 'flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan/30 transition-all cursor-pointer';
            div.innerHTML = `
                <span class="material-symbols-outlined ${f.status === 'analyzed' ? 'text-teal' : 'text-cyan'}">
                    ${f.status === 'analyzed' ? 'check_circle' : 'pending'}
                </span>
                <div class="flex-1">
                    <p class="text-sm font-bold text-white">${f.status === 'analyzed' ? 'Analysis Complete' : 'DNA Uploaded'}</p>
                    <p class="text-[10px] text-slate-500 font-mono">${f.originalName} • ${time}</p>
                </div>
            `;
            container.appendChild(div);
        });
    }

    // Event Listeners for Filters
    document.querySelectorAll('.btn-premium').forEach(btn => {
        if (btn.textContent.trim() === 'WEEKLY') {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-premium').forEach(b => b.classList.remove('btn-cyan'));
                btn.classList.add('btn-cyan');
                refreshDashboard('weekly');
            });
        }
        if (btn.textContent.trim() === 'MONTHLY') {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-premium').forEach(b => b.classList.remove('btn-cyan'));
                btn.classList.add('btn-cyan');
                refreshDashboard('monthly');
            });
        }
    });

    // Initial Load
    refreshDashboard('monthly');
});

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

            const analyzed  = allFiles.filter(f => f.status === 'analyzed').length;
            const anomalies = allFiles.filter(f => f.hasAnomalies).length;
            const pending   = allFiles.filter(f => f.status === 'uploaded').length;
            const total     = allFiles.length;

            const setStat = (attr, val) => {
                const el = document.querySelector(`[data-stat="${attr}"]`);
                if (el) el.textContent = val.toLocaleString();
            };
            setStat('totalFiles', total);
            setStat('analyzed',   analyzed);
            setStat('anomalies',  anomalies);
            setStat('pending',    pending);

            // Progress bars
            const safePercent = (v, max) => max > 0 ? Math.min(100, Math.round((v / max) * 100)) : 0;
            const fp = document.getElementById('files-progress');    if (fp) fp.style.width = safePercent(total, Math.max(total, 20)) + '%';
            const ap = document.getElementById('analyzed-progress'); if (ap) ap.style.width = safePercent(analyzed, total || 1) + '%';
            const an = document.getElementById('anomalies-progress');if (an) an.style.width = safePercent(anomalies, total || 1) + '%';
            const pp = document.getElementById('pending-progress');  if (pp) pp.style.width = safePercent(pending, total || 1) + '%';

            // Anomaly badge
            const badge = document.getElementById('anomaly-badge');
            if (badge) badge.textContent = anomalies > 0 ? `${anomalies} Alert${anomalies > 1 ? 's' : ''}` : 'Clear';

            // Sync chip
            const chip = document.getElementById('last-sync-chip');
            if (chip) chip.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px!important;width:14px!important;height:14px!important;">schedule</span> Synced ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;

            // Trend chart data
            let labels = [], counts = [];
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

            if (timeframe === 'weekly') {
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(); d.setDate(d.getDate() - i);
                    labels.push(days[d.getDay()]); counts.push(0);
                }
                allFiles.forEach(f => {
                    const diff = Math.floor((new Date() - new Date(f.createdAt)) / 86400000);
                    if (diff < 7) counts[6 - diff]++;
                });
            } else {
                const cur = new Date().getMonth();
                for (let i = 5; i >= 0; i--) {
                    labels.push(months[(cur - i + 12) % 12]); counts.push(0);
                }
                allFiles.forEach(f => {
                    const m = months[new Date(f.createdAt).getMonth()];
                    const idx = labels.indexOf(m); if (idx !== -1) counts[idx]++;
                });
            }

            if (window.genelabCharts) window.genelabCharts.updateTrend(labels, counts);
            renderLogs(allFiles);
        } catch (err) {
            console.error('Dashboard Error:', err);
        }
    }

    function renderLogs(files) {
        const container = document.getElementById('system-activity-logs');
        if (!container) return;
        container.innerHTML = '';

        const sorted = [...files].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        if (sorted.length === 0) {
            container.innerHTML = '<p class="text-sm opacity-40 text-center py-6">No recent activity. Upload your first DNA file.</p>';
            return;
        }

        sorted.forEach(f => {
            const time = new Date(f.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
            const isAnalyzed = f.status === 'analyzed';
            const div = document.createElement('div');
            div.className = 'activity-item flex gap-3 p-3.5 rounded-2xl border';
            div.style = 'background:rgba(255,255,255,0.03);border-color:var(--border)';
            div.dataset.fileId = f._id;
            div.innerHTML = `
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${isAnalyzed ? 'rgba(6,255,160,0.1)' : 'rgba(0,212,255,0.1)'}">
                    <span class="material-symbols-outlined" style="font-size:18px!important;width:18px!important;height:18px!important;color:${isAnalyzed ? 'var(--teal)' : 'var(--cyan)'}">
                        ${isAnalyzed ? 'check_circle' : 'pending'}
                    </span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-white">${isAnalyzed ? 'Analysis Complete' : 'DNA Uploaded'}</p>
                    <p class="text-[10px] font-mono truncate" style="color:var(--text-faint)">${f.originalName}</p>
                </div>
                <p class="text-[10px] flex-shrink-0" style="color:var(--text-faint)">${time}</p>
            `;
            container.appendChild(div);
        });
    }

    // Chart filter
    document.getElementById('filter-weekly')?.addEventListener('click', () => {
        document.getElementById('filter-weekly')?.classList.add('btn-cyan');
        document.getElementById('filter-monthly')?.classList.remove('btn-cyan');
        refreshDashboard('weekly');
    });
    document.getElementById('filter-monthly')?.addEventListener('click', () => {
        document.getElementById('filter-monthly')?.classList.add('btn-cyan');
        document.getElementById('filter-weekly')?.classList.remove('btn-cyan');
        refreshDashboard('monthly');
    });

    // Export CSV
    document.getElementById('export-btn')?.addEventListener('click', async () => {
        try {
            showToast('Preparing export...', 'info');
            const files = allFiles.length > 0 ? allFiles : await api.get('/dna/my-files');
            let csv = '\uFEFFGeneLab Systems Overview Export\n';
            csv += `Exported At,${new Date().toLocaleString()}\n\n`;
            csv += 'Ref ID,File Name,Status,Uploaded At,Has Anomalies,Length (bp),GC Content (%)\n';
            files.forEach(f => {
                csv += [f._id, `"${f.originalName}"`, f.status, new Date(f.createdAt).toLocaleString(),
                    f.hasAnomalies ? 'Yes' : 'No', f.sequenceLength || 0,
                    f.gcContent ? (f.gcContent * 100).toFixed(2) : '0.00'
                ].join(',') + '\n';
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.setAttribute('download', `genelab_export_${Date.now()}.csv`);
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            showToast('Export downloaded!', 'success');
        } catch (err) { showToast('Export failed: ' + err.message, 'error'); }
    });

    // Logs Modal
    const logsOverlay  = document.getElementById('logs-modal-overlay');
    const logsModal    = document.getElementById('logs-modal');
    const closeLogsBtn = document.getElementById('close-logs-modal');
    const logsBtn      = document.getElementById('view-all-logs-btn');

    function openLogsModal() {
        if (!logsOverlay || !logsModal) return;
        const container = document.getElementById('logs-stream-container');
        container.innerHTML = '';
        const sys = [
            { time: new Date().toLocaleTimeString(), level: 'INFO', msg: 'GeneLab backend API — connected to MongoDB Atlas' },
            { time: new Date().toLocaleTimeString(), level: 'INFO', msg: 'JWT authentication middleware — active' },
            { time: new Date().toLocaleTimeString(), level: 'OK',   msg: 'Rate limiter: 100 req/15 min per IP' },
        ];
        [...allFiles].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,10).forEach(f => {
            sys.push({ time: new Date(f.createdAt).toLocaleTimeString(), level: f.status === 'analyzed' ? 'OK' : 'PENDING', msg: `[${f.status.toUpperCase()}] ${f.originalName}` });
        });
        const cols = { INFO:'#00b4d8', OK:'#06d6a0', PENDING:'#f4a261' };
        sys.forEach(e => {
            const line = document.createElement('div');
            line.className = 'flex gap-3 items-start py-1.5 border-b border-white/5';
            line.innerHTML = `<span style="color:var(--text-faint);min-width:70px">${e.time}</span><span style="color:${cols[e.level]||'#fff'};min-width:58px;font-weight:700">[${e.level}]</span><span style="color:#cbd5e1">${e.msg}</span>`;
            container.appendChild(line);
        });
        logsOverlay.classList.remove('hidden');
        logsModal.classList.remove('hidden');
    }

    logsBtn?.addEventListener('click', openLogsModal);
    closeLogsBtn?.addEventListener('click', () => { logsOverlay?.classList.add('hidden'); logsModal?.classList.add('hidden'); });
    logsOverlay?.addEventListener('click', e => { if (e.target === logsOverlay) { logsOverlay.classList.add('hidden'); logsModal?.classList.add('hidden'); }});

    document.getElementById('export-logs-btn')?.addEventListener('click', () => {
        let csv = '\uFEFFGeneLab System Logs\nExported At,' + new Date().toLocaleString() + '\n\nFile,Status,Date\n';
        allFiles.forEach(f => csv += `"${f.originalName}","${f.status}","${new Date(f.createdAt).toLocaleString()}"\n`);
        const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.setAttribute('download',`genelab_logs_${Date.now()}.csv`);
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        showToast('Logs exported!','success');
    });

    document.getElementById('system-activity-logs')?.addEventListener('click', e => {
        const item = e.target.closest('[data-file-id]');
        if (item) window.location.href = `result.html?id=${item.dataset.fileId}`;
    });

    refreshDashboard('monthly');
});

/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
// doctor-dashboard.js - Live Data & Chart Filter Logic

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('doctor/dashboard')) return;
    // Role guard — redirect non-doctors immediately
    if (typeof window.doctorOnly === 'function' && !window.doctorOnly()) return;

    const user = window.getAuthUser();

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
            if (badge) {
                badge.textContent = anomalies > 0 ? `${anomalies} Alert${anomalies > 1 ? 's' : ''}` : 'Clear';
            }

            // Sync chip — build via DOM to avoid XSS
            const chip = document.getElementById('last-sync-chip');
            if (chip) {
                chip.textContent = '';
                const ico = document.createElement('span');
                ico.className = 'material-symbols-outlined';
                ico.style.cssText = 'font-size:14px!important;width:14px!important;height:14px!important;';
                ico.textContent = 'schedule';
                chip.appendChild(ico);
                chip.appendChild(document.createTextNode(
                    ' Synced ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                ));
            }

            // Trend chart data
            let labels = [], counts = [];
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

            if (timeframe === 'weekly') {
                const now = Date.now();
                for (let i = 7; i >= 0; i--) {
                    const d = new Date(now - i * 7 * 86400000);
                    labels.push(`${months[d.getMonth()]} ${d.getDate()}`);
                    counts.push(0);
                }
                allFiles.forEach(f => {
                    const diffDays = Math.floor((now - new Date(f.createdAt).getTime()) / 86400000);
                    const weekIdx = 7 - Math.floor(diffDays / 7);
                    if (weekIdx >= 0 && weekIdx < 8) counts[weekIdx]++;
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
            const p = document.createElement('p');
            p.className = 'text-sm opacity-40 text-center py-6';
            p.textContent = 'No recent activity. Upload your first DNA file.';
            container.appendChild(p);
            return;
        }

        sorted.forEach(f => {
            const time = new Date(f.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
            const isAnalyzed = f.status === 'analyzed';

            const div = document.createElement('div');
            if (isAnalyzed) {
                div.className = 'activity-item flex gap-3 p-3.5 rounded-2xl border cursor-pointer hover:bg-white/10 transition';
                div.addEventListener('click', () => {
                    window.location.href = `result.html?id=${f._id}`;
                });
            } else {
                div.className = 'activity-item flex gap-3 p-3.5 rounded-2xl border';
            }
            div.style.cssText = 'background:rgba(255,255,255,0.03);border-color:var(--border)';
            div.dataset.fileId = f._id;

            // Icon container
            const iconWrap = document.createElement('div');
            iconWrap.className = 'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0';
            iconWrap.style.background = isAnalyzed ? 'rgba(6,255,160,0.1)' : 'rgba(0,212,255,0.1)';
            const ico = document.createElement('span');
            ico.className = 'material-symbols-outlined';
            ico.style.cssText = `font-size:18px!important;width:18px!important;height:18px!important;color:${isAnalyzed ? 'var(--teal)' : 'var(--cyan)'}`;
            ico.textContent = isAnalyzed ? 'check_circle' : 'pending';
            iconWrap.appendChild(ico);

            // Text content
            const textWrap = document.createElement('div');
            textWrap.className = 'flex-1 min-w-0';
            const titleP = document.createElement('p');
            titleP.className = 'text-xs font-bold text-white';
            titleP.textContent = isAnalyzed ? 'Analysis Complete' : 'DNA Uploaded';
            const nameP = document.createElement('p');
            nameP.className = 'text-[10px] font-mono truncate';
            nameP.style.color = 'var(--text-faint)';
            nameP.textContent = f.originalName; // textContent prevents XSS
            textWrap.appendChild(titleP);
            textWrap.appendChild(nameP);

            // Time
            const timeP = document.createElement('p');
            timeP.className = 'text-[10px] flex-shrink-0';
            timeP.style.color = 'var(--text-faint)';
            timeP.textContent = time;

            div.appendChild(iconWrap);
            div.appendChild(textWrap);
            div.appendChild(timeP);
            container.appendChild(div);
        });
    }

    // Chart filter
    const wBtn = document.getElementById('filter-weekly');
    const mBtn = document.getElementById('filter-monthly');

    function setActiveFilterButton(activeBtn, inactiveBtn) {
        if (!activeBtn || !inactiveBtn) return;
        activeBtn.classList.add('btn-cyan');
        activeBtn.style.cssText = 'background:var(--cyan);color:#0f172a;font-weight:700;box-shadow:0 0 12px rgba(6,182,212,0.4);';

        inactiveBtn.classList.remove('btn-cyan');
        inactiveBtn.style.cssText = 'background:rgba(255,255,255,0.05);color:var(--text-faint);font-weight:600;box-shadow:none;';
    }

    wBtn?.addEventListener('click', () => {
        setActiveFilterButton(wBtn, mBtn);
        refreshDashboard('weekly');
    });
    mBtn?.addEventListener('click', () => {
        setActiveFilterButton(mBtn, wBtn);
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

        async function openLogsModal() {
        if (!logsOverlay || !logsModal) return;
        const container = document.getElementById('logs-stream-container');
        if (!container) return;

        container.innerHTML = '';

        // Load real audit logs from backend.
        // Admin-only endpoint; for non-admin doctors backend should return 403.
        // We keep UI consistent and show a professional message.
        try {
            const data = await api.get('/admin/audit-logs?limit=50&page=1');
            const logs = data?.logs || [];

            if (!logs.length) {
                const p = document.createElement('p');
                p.className = 'text-sm italic text-center py-6';
                p.style.color = 'var(--text-faint)';
                p.textContent = 'No audit events found.';
                container.appendChild(p);
            } else {
                // Render newest first (backend already sorts desc)
                const slice = logs.slice(0, 30);
                const cols = { INFO: '#00b4d8', OK: '#06d6a0', PENDING: '#f4a261' };

                slice.forEach(log => {
                    const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const action = String(log.action || 'unknown');
                    const userName = log.userId?.name || 'System';

                    // Heuristic label mapping without fabricating messages.
                    const levelLabel = action.includes('error') ? 'INFO' : 'OK';
                    const levelColor = cols[levelLabel] || '#fff';

                    const line = document.createElement('div');
                    line.className = 'flex gap-3 items-start py-1.5 border-b border-white/5';

                    const timeSpan = document.createElement('span');
                    timeSpan.style.cssText = 'color:var(--text-muted);min-width:70px';
                    timeSpan.textContent = time;

                    const levelSpan = document.createElement('span');
                    levelSpan.style.cssText = `color:${levelColor};min-width:58px;font-weight:700`;
                    levelSpan.textContent = `[${String(levelLabel)}]`;

                    const msgSpan = document.createElement('span');
                    msgSpan.style.color = 'var(--text)';
                    // Keep message derived from backend fields.
                    const detailsText = log.details ? (() => {
                        try {
                            return typeof log.details === 'string' ? log.details : JSON.stringify(log.details);
                        } catch (_) {
                            return '';
                        }
                    })() : '';

                    const msg = `${action.replace(/_/g, ' ')} — ${userName}${detailsText ? ' — ' + detailsText : ''}`;
                    msgSpan.textContent = msg;

                    line.appendChild(timeSpan);
                    line.appendChild(levelSpan);
                    line.appendChild(msgSpan);
                    container.appendChild(line);
                });
            }
        } catch (err) {
            // Expected for doctors if endpoint is admin-only.
            const p = document.createElement('p');
            p.className = 'text-sm italic text-center py-6';
            p.style.color = 'var(--text-faint)';
            p.textContent = 'Unable to load audit logs (insufficient permissions).';
            container.appendChild(p);
        }

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

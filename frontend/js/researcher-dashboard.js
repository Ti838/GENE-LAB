/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
// researcher-dashboard.js - Live Data & Chart Filter Logic

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('researcher/dashboard')) return;
    // Role guard — redirect non-researchers immediately
    if (typeof window.researcherOnly === 'function' && !window.researcherOnly()) return;

    const user = window.getAuthUser();

    // 1. Customize main header titles and badges
    const badge = document.querySelector('.section-badge');
    if (badge) {
        badge.textContent = 'Researcher workflow';
        badge.className = 'section-badge mb-3 bg-violet/10 text-violet border-violet/20';
    }
    const h1 = document.querySelector('header h1');
    if (h1) h1.textContent = 'Research Workbench';
    const subtitle = document.querySelector('header p.font-medium');
    if (subtitle) subtitle.textContent = 'Reference genome alignments, BLAST lookups, and sequence statistics.';
    
    const infoChips = document.querySelectorAll('header .info-chip');
    if (infoChips.length > 0) {
        infoChips[0].innerHTML = '<span class="material-symbols-outlined" style="font-size:14px!important;">science</span> Research Engine Active';
    }

    // 2. Customize Stat Cards Labels
    const labels = document.querySelectorAll('.stat-card-glow p.uppercase');
    if (labels.length >= 4) {
        labels[0].textContent = 'Genomic Collections';
        labels[1].textContent = 'Blast Runs Complete';
        labels[2].textContent = 'Mutations Mapped';
        labels[2].style.color = 'var(--text-faint)';
        labels[3].textContent = 'BLAST Queue Status';
    }

    // Modify anomaly stat card icons/badges to match research context instead of clinical alarm
    const anomalyCard = document.querySelector('.stat-card-glow[style*="border-color"]');
    if (anomalyCard) {
        anomalyCard.style.borderColor = 'rgba(0,180,216,0.18)';
        const iconWrap = anomalyCard.querySelector('.w-10');
        if (iconWrap) {
            iconWrap.className = 'w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center';
            const icon = iconWrap.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = 'dna';
                icon.className = 'material-symbols-outlined text-cyan';
            }
        }
        const statText = anomalyCard.querySelector('[data-stat="anomalies"]');
        if (statText) statText.className = 'text-3xl font-display font-extrabold text-cyan mb-1';
    }

    const anomalyBadge = document.getElementById('anomaly-badge');
    if (anomalyBadge) {
        anomalyBadge.style.color = 'var(--cyan)';
        anomalyBadge.style.borderColor = 'rgba(0,212,255,0.3)';
        anomalyBadge.style.background = 'rgba(0,212,255,0.08)';
    }

    // 3. Customize Quick Actions Link Text
    const quickActions = document.querySelectorAll('.quick-action');
    if (quickActions.length >= 3) {
        // Action 1: Upload
        const title1 = quickActions[0].querySelector('p.font-bold');
        const sub1 = quickActions[0].querySelector('p.text-\\[11px\\]');
        if (title1) title1.textContent = 'Upload FASTA/FASTQ';
        if (sub1) sub1.textContent = 'Import genomic datasets';

        // Action 2: Run Analysis
        const title2 = quickActions[1].querySelector('p.font-bold');
        const sub2 = quickActions[1].querySelector('p.text-\\[11px\\]');
        if (title2) title2.textContent = 'BLAST Alignment';
        if (sub2) sub2.textContent = 'Cross-compare genomes';

        // Action 3: Reports
        const title3 = quickActions[2].querySelector('p.font-bold');
        const sub3 = quickActions[2].querySelector('p.text-\\[11px\\]');
        if (title3) title3.textContent = 'Research Records';
        if (sub3) sub3.textContent = 'Export publication data';
    }

    // 4. Customize Chart Title
    const chartTitle = document.querySelector('.col-span-2 h3');
    const chartSub = document.querySelector('.col-span-2 p');
    if (chartTitle) chartTitle.textContent = 'Sequence Submission Trend';
    if (chartSub) chartSub.textContent = 'Bioinformatics runs monitored over time';

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
                badge.textContent = anomalies > 0 ? `${anomalies} Mutation${anomalies > 1 ? 's' : ''}` : 'No Variants';
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
            p.textContent = 'No recent activity. Upload your first dataset.';
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
            titleP.textContent = isAnalyzed ? 'Alignment Complete' : 'Sequence Imported';
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
            // Build each column safely
            const timeSpan = document.createElement('span');
            timeSpan.style.cssText = 'color:var(--text-muted);min-width:70px';
            timeSpan.textContent = e.time;
            const levelSpan = document.createElement('span');
            levelSpan.style.cssText = `color:${cols[e.level]||'#fff'};min-width:58px;font-weight:700`;
            levelSpan.textContent = `[${e.level}]`;
            const msgSpan = document.createElement('span');
            msgSpan.style.color = 'var(--text)';
            msgSpan.textContent = e.msg; // textContent safe
            line.appendChild(timeSpan);
            line.appendChild(levelSpan);
            line.appendChild(msgSpan);
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

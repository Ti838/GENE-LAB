/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// analysis.js — Sequence Analysis with BullMQ job polling
document.addEventListener('DOMContentLoaded', () => {
    // ── Route guard ───────────────────────────────────────────────
    if (typeof window.doctorOnly === 'function' && !window.doctorOnly()) return;

    const fileContainer   = document.getElementById('file-container');
    const runAnalysisBtn  = document.getElementById('run-analysis-btn');
    const statusPanel     = document.getElementById('analysis-status-panel');
    let selectedFileId    = null;
    let selectedFileName  = '';
    let pollInterval      = null;
    let allFiles          = [];

    // ── Load file list ────────────────────────────────────────────
    async function loadFiles() {
        if (!fileContainer) return;
        fileContainer.innerHTML = '<p class="italic text-center p-4" style="color:var(--text-faint)">Loading bio-assets...</p>';
        try {
            allFiles = await api.get('/dna/my-files');
            renderFilesList();
        } catch (err) {
            fileContainer.innerHTML = '';
            const p = document.createElement('p');
            p.className = 'text-coral italic text-center p-4 text-sm';
            p.textContent = 'Failed to load files. Please refresh the page.';
            fileContainer.appendChild(p);
        }
    }

    // ── Render file list from memory ──────────────────────────────
    function renderFilesList() {
        if (!fileContainer) return;
        fileContainer.innerHTML = '';

        if (allFiles.length === 0) {
            const p = document.createElement('p');
            p.className = 'italic text-center p-4';
            p.style.color = 'var(--text-faint)';
            p.textContent = 'No files found. Please upload a DNA file first.';
            fileContainer.appendChild(p);
            return;
        }

        allFiles.forEach(f => buildFileCard(f));
    }

    // ── Build a single file card (XSS-safe) ──────────────────────
    function buildFileCard(f) {
        if (!fileContainer) return;

        const isSelected = f._id === selectedFileId;
        const isAnalyzed = f.status === 'analyzed';
        const isAnalyzing = f.status === 'analyzing';

        const card = document.createElement('div');
        card.className = 'p-4 border rounded-2xl flex justify-between items-center cursor-pointer transition-all mb-3';
        card.style.cssText = isSelected
            ? 'background:rgba(0,212,255,0.06);border-color:var(--cyan)'
            : 'background:rgba(255,255,255,0.03);border-color:var(--border)';
        card.dataset.fileId = f._id;

        // Left: icon + name
        const left = document.createElement('div');
        left.className = 'flex gap-3 items-center min-w-0';
        const ico = document.createElement('span');
        ico.className = 'material-symbols-outlined flex-shrink-0';
        ico.style.color = isAnalyzed ? 'var(--teal)' : isAnalyzing ? 'var(--violet)' : 'var(--text-faint)';
        ico.textContent = 'biotech';
        const nameDiv = document.createElement('div');
        nameDiv.className = 'min-w-0';
        const nameP = document.createElement('p');
        nameP.className = 'font-bold text-sm truncate';
        nameP.style.color = 'var(--text)';
        nameP.textContent = f.originalName; // textContent — XSS safe
        const statusP = document.createElement('p');
        statusP.className = 'text-[10px] uppercase font-bold tracking-widest';
        statusP.style.color = isAnalyzed ? 'var(--teal)' : isAnalyzing ? 'var(--violet)' : 'var(--text-faint)';
        statusP.textContent = f.status;
        nameDiv.appendChild(nameP);
        nameDiv.appendChild(statusP);
        left.appendChild(ico);
        left.appendChild(nameDiv);

        // Right: check icon if selected
        if (isSelected) {
            const checkIco = document.createElement('span');
            checkIco.className = 'material-symbols-outlined flex-shrink-0';
            checkIco.style.color = 'var(--cyan)';
            checkIco.textContent = 'check_circle';
            card.appendChild(left);
            card.appendChild(checkIco);
        } else {
            card.appendChild(left);
        }

        card.addEventListener('click', () => selectFile(f._id, f.originalName));
        fileContainer.appendChild(card);
    }

    // ── Select a file ─────────────────────────────────────────────
    function selectFile(id, name) {
        selectedFileId   = id;
        selectedFileName = name || '';
        renderFilesList(); // re-render locally from memory (instantaneous!)

        if (runAnalysisBtn) {
            runAnalysisBtn.disabled = false;
            runAnalysisBtn.classList.remove('opacity-50');
        }

        // Dynamically update the right panel to show ready state
        const rightPanelHeader = document.querySelector('.glass-panel h3.text-xl');
        const rightPanelDesc   = document.querySelector('.glass-panel p.max-w-xs');
        if (rightPanelHeader) {
            rightPanelHeader.textContent = 'Engine Configured';
        }
        if (rightPanelDesc) {
            rightPanelDesc.textContent = `Target: ${name}. Ready to launch AI-powered nucleotide analysis and mutation screening.`;
        }

        resetStatusPanel();
    }

    // ── Reset the status panel to initial state ───────────────────
    function resetStatusPanel() {
        if (!statusPanel) return;
        statusPanel.innerHTML = '';
        statusPanel.classList.add('hidden');
    }

    // ── Show the job polling status panel ─────────────────────────
    function showStatusPanel(jobId, dnaFileId) {
        if (!statusPanel) return;
        statusPanel.classList.remove('hidden');

        // Build the panel DOM
        statusPanel.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'flex items-center gap-3 mb-5';
        const spinner = document.createElement('span');
        spinner.id = 'analysis-spinner';
        spinner.className = 'material-symbols-outlined animate-spin-slow';
        spinner.style.color = 'var(--cyan)';
        spinner.textContent = 'sync';
        const headerText = document.createElement('div');
        const titleP = document.createElement('p');
        titleP.className = 'font-bold text-sm';
        titleP.style.color = 'var(--text)';
        titleP.textContent = 'Analysis Running';
        const jobP = document.createElement('p');
        jobP.className = 'text-[10px] font-mono';
        jobP.style.color = 'var(--text-faint)';
        jobP.textContent = `Job: ${jobId}`;
        headerText.appendChild(titleP);
        headerText.appendChild(jobP);
        header.appendChild(spinner);
        header.appendChild(headerText);

        // Progress bar
        const barWrap = document.createElement('div');
        barWrap.className = 'progress-bar mb-3';
        const barFill = document.createElement('div');
        barFill.id = 'analysis-progress-fill';
        barFill.className = 'progress-fill';
        barFill.style.width = '0%';
        barWrap.appendChild(barFill);

        const statusText = document.createElement('p');
        statusText.id = 'analysis-status-text';
        statusText.className = 'text-[11px]';
        statusText.style.color = 'var(--text-faint)';
        statusText.textContent = 'Queued — waiting for worker...';

        statusPanel.appendChild(header);
        statusPanel.appendChild(barWrap);
        statusPanel.appendChild(statusText);

        // Start polling
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(() => pollJobStatus(jobId, dnaFileId), 3000);
        // Poll immediately once
        pollJobStatus(jobId, dnaFileId);
    }

    // ── Poll job status from /api/analysis/analysis-status/:jobId ─
    async function pollJobStatus(jobId, dnaFileId) {
        try {
            const data = await api.get(`/analysis/analysis-status/${jobId}`);
            const fill = document.getElementById('analysis-progress-fill');
            const txt  = document.getElementById('analysis-status-text');
            const spin = document.getElementById('analysis-spinner');

            const pct = data.progress || 0;
            if (fill) fill.style.width = `${pct}%`;

            if (data.status === 'completed') {
                clearInterval(pollInterval);
                pollInterval = null;
                if (fill) fill.style.width = '100%';
                if (spin) { spin.classList.remove('animate-spin-slow'); spin.textContent = 'check_circle'; spin.style.color = 'var(--teal)'; }
                if (txt)  txt.textContent = 'Analysis complete! Redirecting to results...';
                showToast('Analysis complete!', 'success');
                const targetId = dnaFileId || selectedFileId;
                setTimeout(() => { window.location.href = `result.html?id=${targetId}`; }, 1500);

            } else if (data.status === 'failed') {
                clearInterval(pollInterval);
                pollInterval = null;
                if (spin) { spin.classList.remove('animate-spin-slow'); spin.textContent = 'error'; spin.style.color = 'var(--coral)'; }
                if (txt)  txt.textContent = `Analysis failed: ${data.errorMessage || 'Unknown error'}`;
                showToast('Analysis failed. Please try again.', 'error');
                if (runAnalysisBtn) {
                    runAnalysisBtn.disabled = false;
                    runAnalysisBtn.classList.remove('opacity-50');
                    runAnalysisBtn.innerHTML = '<span class="material-symbols-outlined">play_circle</span> Run Sequence Analysis';
                }

            } else {
                // queued / processing
                const statusLabel = data.status === 'processing'
                    ? `Processing — ${pct}% complete`
                    : 'Queued — waiting for worker...';
                if (txt) txt.textContent = statusLabel;
            }
        } catch (err) {
            // Don't stop polling on a transient network error
            const txt = document.getElementById('analysis-status-text');
            if (txt) txt.textContent = 'Waiting for response...';
        }
    }

    // ── Intensity Mode Styling & Toggling ─────────────────────────
    const radios = document.getElementsByName('analysis-mode');
    function updateModeUI() {
        radios.forEach(r => {
            const label = r.closest('label');
            if (!label) return;
            const dot = label.querySelector('.rounded-full');
            if (r.checked) {
                label.style.borderColor = 'var(--cyan)';
                label.style.background = 'rgba(0, 212, 255, 0.05)';
                if (dot) {
                    dot.style.background = 'var(--cyan)';
                    dot.classList.add('shadow-[0_0_8px_var(--cyan)]');
                }
            } else {
                label.style.borderColor = 'var(--border)';
                label.style.background = 'rgba(255, 255, 255, 0.02)';
                if (dot) {
                    dot.style.background = 'rgba(255, 255, 255, 0.2)';
                    dot.classList.remove('shadow-[0_0_8px_var(--cyan)]');
                }
            }
        });
    }
    radios.forEach(r => {
        r.addEventListener('change', updateModeUI);
    });
    updateModeUI();

    // ── Run analysis button ───────────────────────────────────────
    if (runAnalysisBtn) {
        runAnalysisBtn.addEventListener('click', async () => {
            if (!selectedFileId) {
                showToast('Please select a DNA file first.', 'info');
                return;
            }

            const selectedMode = document.querySelector('input[name="analysis-mode"]:checked')?.value || 'instant';

            runAnalysisBtn.disabled = true;
            runAnalysisBtn.classList.add('opacity-50');
            runAnalysisBtn.innerHTML = '<span class="material-symbols-outlined animate-spin-slow" style="font-size:18px">sync</span>&nbsp;Starting...';

            try {
                const response = await api.post(`/dna/analyze/${selectedFileId}`, { analysisType: selectedMode });
                // response: { message, jobId, statusUrl, dnaFileId }
                if (response.jobId) {
                    showStatusPanel(response.jobId, response.dnaFileId);
                    runAnalysisBtn.innerHTML = '<span class="material-symbols-outlined animate-spin-slow" style="font-size:18px">sync</span>&nbsp;Analyzing...';
                } else {
                    // Sync fallback — backend completed immediately
                    showToast('Analysis completed.', 'success');
                    setTimeout(() => { window.location.href = `result.html?id=${selectedFileId}`; }, 1200);
                }
            } catch (err) {
                // api.js already shows an error toast
                runAnalysisBtn.disabled = false;
                runAnalysisBtn.classList.remove('opacity-50');
                runAnalysisBtn.innerHTML = '<span class="material-symbols-outlined">play_circle</span> Run Sequence Analysis';
            }
        });
    }

    loadFiles();
});

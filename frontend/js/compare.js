/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// compare.js — DNA Comparison Logic (XSS-safe)
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('compare.html')) return;
    const isResearcherPath = window.location.pathname.includes('/researcher/');
    const guard = isResearcherPath ? window.researcherOnly : window.doctorOnly;
    if (typeof guard === 'function' && !guard()) return;

    const container       = document.getElementById('compare-files-container');
    const resultContainer = document.getElementById('compare-result');
    const compareBtn      = document.getElementById('compare-btn');
    let selectedFiles     = []; // max 2 IDs

    // ── Load file list ─────────────────────────────────────────────────────
    async function loadFiles() {
        if (!container) return;
        container.innerHTML = '<p class="italic text-center col-span-2 p-4" style="color:var(--text-faint)">Loading files...</p>';
        try {
            const files = await api.get('/dna/my-files');
            container.innerHTML = '';
            if (!files.length) {
                const p = document.createElement('p');
                p.className = 'italic text-center col-span-2 p-4';
                p.style.color = 'var(--text-faint)';
                p.textContent = 'No files found. Upload DNA files first.';
                container.appendChild(p);
                return;
            }
            files.forEach(file => buildFileCard(file));
        } catch (err) {
            container.innerHTML = '';
            const p = document.createElement('p');
            p.className = 'col-span-2 text-center p-4 text-sm';
            p.style.color = 'var(--coral)';
            p.textContent = 'Failed to load files. Please refresh.';
            container.appendChild(p);
        }
    }

    // ── Build one file card (XSS-safe) ────────────────────────────────────
    function buildFileCard(file) {
        const isSelected = selectedFiles.includes(file._id);

        const card = document.createElement('div');
        card.className = 'border p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-3';
        card.style.cssText = isSelected
            ? 'background:rgba(0,212,255,0.08);border-color:var(--cyan)'
            : 'background:rgba(255,255,255,0.03);border-color:var(--border)';
        card.dataset.id = file._id;

        const ico = document.createElement('span');
        ico.className = 'material-symbols-outlined text-cyan flex-shrink-0';
        ico.style.cssText = 'font-size:20px!important;width:20px!important;height:20px!important;';
        ico.textContent = 'description';

        const textDiv = document.createElement('div');
        textDiv.className = 'flex-1 min-w-0';
        const nameP = document.createElement('p');
        nameP.className = 'text-sm font-bold truncate';
        nameP.style.color = 'var(--text)';
        nameP.textContent = file.originalName; // textContent = XSS safe
        const statusP = document.createElement('p');
        statusP.className = 'text-xs uppercase font-bold tracking-widest';
        statusP.style.color = file.status === 'analyzed' ? 'var(--teal)' : 'var(--text-faint)';
        statusP.textContent = file.status;
        textDiv.appendChild(nameP);
        textDiv.appendChild(statusP);

        const checkIco = document.createElement('span');
        checkIco.className = 'material-symbols-outlined check-icon' + (isSelected ? '' : ' hidden');
        checkIco.style.color = 'var(--cyan)';
        checkIco.style.cssText = 'font-size:20px!important;width:20px!important;height:20px!important;';
        checkIco.textContent = 'check_circle';

        card.appendChild(ico);
        card.appendChild(textDiv);
        card.appendChild(checkIco);
        card.addEventListener('click', () => toggleSelect(card, file._id));
        container.appendChild(card);
    }

    // ── Toggle file selection (max 2) ─────────────────────────────────────
    function toggleSelect(card, id) {
        const idx = selectedFiles.indexOf(id);
        if (idx > -1) {
            selectedFiles.splice(idx, 1);
            card.style.cssText = 'background:rgba(255,255,255,0.03);border-color:var(--border)';
            card.querySelector('.check-icon')?.classList.add('hidden');
        } else {
            if (selectedFiles.length >= 2) {
                // Deselect the oldest selection
                const firstCard = container.querySelector(`[data-id="${selectedFiles[0]}"]`);
                if (firstCard) {
                    firstCard.style.cssText = 'background:rgba(255,255,255,0.03);border-color:var(--border)';
                    firstCard.querySelector('.check-icon')?.classList.add('hidden');
                }
                selectedFiles.shift();
            }
            selectedFiles.push(id);
            card.style.cssText = 'background:rgba(0,212,255,0.08);border-color:var(--cyan)';
            card.querySelector('.check-icon')?.classList.remove('hidden');
        }

        const ready = selectedFiles.length === 2;
        if (compareBtn) {
            compareBtn.disabled = !ready;
            compareBtn.classList.toggle('opacity-50', !ready);
        }
    }

    // ── Run comparison ────────────────────────────────────────────────────
    if (compareBtn) {
        compareBtn.addEventListener('click', async () => {
            if (selectedFiles.length !== 2) return;
            compareBtn.disabled = true;
            compareBtn.innerHTML = '<span class="material-symbols-outlined animate-spin-slow" style="font-size:18px">sync</span>&nbsp;Comparing...';

            try {
                const result = await api.post('/dna/compare', { id1: selectedFiles[0], id2: selectedFiles[1] });
                showToast('Comparison completed!', 'success');
                renderResult(result);
            } catch (err) {
                // api.js already shows error toast
            } finally {
                compareBtn.disabled = false;
                compareBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">compare_arrows</span>&nbsp;Compare Selected';
            }
        });
    }

    // ── Render result panel (fully XSS-safe DOM building) ─────────────────
    function renderResult(data) {
        if (!resultContainer) return;
        resultContainer.classList.remove('hidden');
        resultContainer.innerHTML = '';

        const similarity = Number(data.similarity) || 0;
        const simColor   = similarity >= 90 ? 'var(--teal)' : similarity >= 60 ? 'var(--cyan)' : 'var(--coral)';

        // Container panel
        const panel = document.createElement('div');
        panel.className = 'glass-panel p-8 rounded-[32px] mt-8';
        panel.style.borderColor = 'var(--border)';

        // Title
        const title = document.createElement('h3');
        title.className = 'text-2xl font-display font-bold mb-6';
        title.style.color = 'var(--text)';
        title.textContent = 'Comparison Results';
        panel.appendChild(title);

        // ── Stats grid ──────────────────────────────────────────────────
        const statsGrid = document.createElement('div');
        statsGrid.className = 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-8';

        const stats = [
            { label: 'Similarity',    value: `${similarity}%`,                           color: simColor },
            { label: 'Matches',       value: (data.matchCount || 0).toLocaleString(),     color: 'var(--teal)' },
            { label: 'Mismatches',    value: (data.mismatchCount || 0).toLocaleString(),  color: 'var(--coral)' },
            { label: 'Seq 1 / Seq 2', value: `${data.seq1Length || 0} / ${data.seq2Length || 0}`, color: 'var(--text)' },
        ];

        stats.forEach(({ label, value, color }) => {
            const cell = document.createElement('div');
            cell.className = 'p-4 rounded-xl text-center';
            cell.style.background = 'rgba(255,255,255,0.04)';
            const lbl = document.createElement('p');
            lbl.className = 'text-xs uppercase mb-1';
            lbl.style.color = 'var(--text-faint)';
            lbl.textContent = label;
            const val = document.createElement('p');
            val.className = 'text-3xl font-display font-bold';
            val.style.color = color;
            val.textContent = value; // safe — these are numbers from API
            cell.appendChild(lbl);
            cell.appendChild(val);
            statsGrid.appendChild(cell);
        });
        panel.appendChild(statsGrid);

        // ── Files compared row ───────────────────────────────────────────
        const filesRow = document.createElement('div');
        filesRow.className = 'flex items-center gap-2 text-sm mb-4';
        filesRow.style.color = 'var(--text-muted)';
        const infoIco = document.createElement('span');
        infoIco.className = 'material-symbols-outlined';
        infoIco.style.cssText = 'font-size:16px!important;width:16px!important;height:16px!important;';
        infoIco.textContent = 'info';
        const f1 = document.createElement('strong');
        f1.style.color = 'var(--text)';
        f1.textContent = data.file1 || '—'; // safe via textContent
        const sep = document.createTextNode(' vs ');
        const f2 = document.createElement('strong');
        f2.style.color = 'var(--text)';
        f2.textContent = data.file2 || '—'; // safe via textContent
        filesRow.appendChild(infoIco);
        filesRow.appendChild(f1);
        filesRow.appendChild(sep);
        filesRow.appendChild(f2);
        panel.appendChild(filesRow);

        // ── Mismatch detail table ────────────────────────────────────────
        const mismatches = data.mismatches || [];
        if (mismatches.length > 0) {
            const mutSection = document.createElement('div');
            mutSection.className = 'mt-4';

            const mutTitle = document.createElement('p');
            mutTitle.className = 'text-xs uppercase font-bold mb-3';
            mutTitle.style.color = 'var(--text-faint)';
            mutTitle.textContent = `Mutation Details (first ${Math.min(mismatches.length, 20)})`;
            mutSection.appendChild(mutTitle);

            const mutList = document.createElement('div');
            mutList.className = 'max-h-48 overflow-y-auto space-y-1';

            mismatches.slice(0, 20).forEach(m => {
                const row = document.createElement('div');
                row.className = 'flex items-center gap-3 text-xs font-mono p-2 rounded-lg';
                row.style.background = 'rgba(255,255,255,0.04)';

                const pos = document.createElement('span');
                pos.style.color = 'var(--text-faint)';
                pos.textContent = `pos ${m.position}`; // number — safe
                const s1 = document.createElement('span');
                s1.style.color = 'var(--coral)';
                s1.textContent = m.seq1; // textContent = safe
                const arrow = document.createElement('span');
                arrow.style.color = 'var(--text-faint)';
                arrow.textContent = '→';
                const s2 = document.createElement('span');
                s2.style.color = 'var(--teal)';
                s2.textContent = m.seq2; // textContent = safe
                const typeSpan = document.createElement('span');
                typeSpan.className = 'ml-auto text-[10px] uppercase';
                typeSpan.style.color = 'var(--text-faint)';
                typeSpan.textContent = m.type || ''; // textContent = safe

                row.appendChild(pos);
                row.appendChild(s1);
                row.appendChild(arrow);
                row.appendChild(s2);
                row.appendChild(typeSpan);
                mutList.appendChild(row);
            });

            mutSection.appendChild(mutList);
            panel.appendChild(mutSection);
        }

        resultContainer.appendChild(panel);
    }

    await loadFiles();
});

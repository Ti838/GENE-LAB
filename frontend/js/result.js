/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// result.js - Detailed Analysis Result View (XSS-safe)
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.doctorOnly === 'function' && !window.doctorOnly()) return;

    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('id');
    const jobId = urlParams.get('jobId') || urlParams.get('job');

    if (!fileId && !jobId) {
        showToast('No sequence identifier provided', 'error');
        setTimeout(() => { window.location.href = 'reports.html'; }, 1500);
        return;
    }

    async function renderFromData(data) {
        if (!data) return;
        // tolerate either job.result or direct DNAFile fields
        const src = data.result || data;

        // ── GC / AT content ──────────────────────────────────────────────────
        let gc = (src.gcContent !== undefined)
            ? src.gcContent
            : (src.gc_content || (src.statistics && src.statistics.gc_content) || 0);
        if (gc > 0 && gc <= 1) gc = gc * 100; // convert fraction → %
        gc = parseFloat(gc) || 0;

        document.querySelector('[data-metric="gcContent"]').textContent = `${gc.toFixed(1)}%`;
        document.querySelector('[data-progress="gcContent"]').style.width = `${Math.min(gc, 100)}%`;

        const atRatio = parseFloat((100 - gc).toFixed(1));
        document.querySelector('[data-metric="atRatio"]').textContent = `${atRatio.toFixed(1)}%`;
        document.querySelector('[data-progress="atRatio"]').style.width = `${Math.min(atRatio, 100)}%`;

        // ── Sequence length ──────────────────────────────────────────────────
        const seq = src.sequence || src.validation?.cleaned || '';
        const displayLen = seq.length || src.sequenceLength || src.sequence_length || 0;
        document.querySelector('[data-metric="length"]').textContent = displayLen.toLocaleString();

        // ── Sequence viewer ──────────────────────────────────────────────────
        const viewer = document.getElementById('sequence-viewer');
        if (viewer) {
            viewer.innerHTML = '';
            if (seq) {
                const fragment = document.createDocumentFragment();
                const limit = Math.min(seq.length, 2000);
                for (let i = 0; i < limit; i++) {
                    const n = seq[i];
                    const span = document.createElement('span');
                    span.className = `nucleotide n-${n.toLowerCase()}`;
                    span.textContent = n;
                    fragment.appendChild(span);
                }
                viewer.appendChild(fragment);

                if (seq.length > 2000) {
                    const more = document.createElement('span');
                    more.style.cssText = 'color:var(--text-faint);font-style:italic';
                    more.textContent = ` … +${(seq.length - 2000).toLocaleString()} bp`;
                    viewer.appendChild(more);
                }
            } else {
                const p = document.createElement('p');
                p.style.color = 'var(--text-faint)';
                p.style.fontStyle = 'italic';
                p.textContent = 'Sequence data not stored — re-run analysis to populate.';
                viewer.appendChild(p);
            }
        }

        // ── Mutations / Variants (XSS-safe DOM) ──────────────────────────────
        const mutationsContainer = document.getElementById('mutations-container');
        if (mutationsContainer) {
            mutationsContainer.innerHTML = '';
            const variants = src.variants || [];
            const mutStrings = src.mutations || [];

            if (variants.length > 0) {
                variants.forEach(v => {
                    const labelText = `${v.gene || 'Unknown'}:${v.variantId || v.rsid || '—'}`;
                    const sevClass = v.severity === 'HIGH' ? 'coral' : v.severity === 'MODERATE' ? 'violet' : 'teal';
                    
                    const div = document.createElement('div');
                    div.className = `p-4 rounded-2xl flex justify-between items-center mb-3`;
                    div.style.cssText = `background:rgba(var(--${sevClass}-rgb,255,107,107),0.08);border:1px solid rgba(var(--${sevClass}-rgb,255,107,107),0.25)`;

                    const leftDiv = document.createElement('div');
                    leftDiv.className = 'min-w-0 flex-1 pr-4';

                    const pLabel = document.createElement('p');
                    pLabel.className = 'font-mono text-sm font-bold truncate';
                    pLabel.style.color = `var(--${sevClass})`;
                    pLabel.textContent = labelText;

                    const pNote = document.createElement('p');
                    pNote.className = 'text-[10px] mt-0.5 truncate';
                    pNote.style.color = 'var(--text-faint)';
                    pNote.textContent = v.clinicalSignificance || 'No clinical note';

                    leftDiv.appendChild(pLabel);
                    leftDiv.appendChild(pNote);

                    const badge = document.createElement('span');
                    badge.className = 'px-3 py-1 rounded text-[10px] font-bold uppercase flex-shrink-0';
                    badge.style.cssText = `background:rgba(var(--${sevClass}-rgb,255,107,107),0.18);color:var(--${sevClass})`;
                    badge.textContent = v.severity || 'UNKNOWN';

                    div.appendChild(leftDiv);
                    div.appendChild(badge);
                    mutationsContainer.appendChild(div);
                });
            } else if (mutStrings.length > 0) {
                mutStrings.forEach(m => {
                    const div = document.createElement('div');
                    div.className = 'p-4 bg-coral/10 border border-coral/30 rounded-2xl flex justify-between items-center mb-3';

                    const pText = document.createElement('p');
                    pText.className = 'font-mono text-sm text-coral font-bold truncate pr-4 flex-1';
                    pText.textContent = m;

                    const badge = document.createElement('span');
                    badge.className = 'px-3 py-1 bg-coral/20 rounded text-[10px] font-bold text-coral uppercase flex-shrink-0';
                    badge.textContent = 'DEVIATION';

                    div.appendChild(pText);
                    div.appendChild(badge);
                    mutationsContainer.appendChild(div);
                });
            } else {
                const p = document.createElement('p');
                p.className = 'text-teal font-bold flex items-center gap-2';
                p.innerHTML = '<span class="material-symbols-outlined">verified</span> No significant mutations detected.';
                mutationsContainer.appendChild(p);
            }
        }

        // ── Nucleotide Chart ─────────────────────────────────────────────────
        const freqSrc = src.nucleotideFrequency || src.nucleotide_frequency
            || src.statistics?.nucleotide_frequency || null;
        if (window.initNucleotideChart && freqSrc) {
            window.initNucleotideChart(freqSrc);
        }

        // ── Scientific Summary ───────────────────────────────────────────────
        const summaryEl = document.getElementById('scientific-summary');
        if (summaryEl) {
            const txt = src.scientificSummary || src.scientific_summary
                || src.clinicalSummary || src.clinical_summary || '';
            summaryEl.textContent = txt || 'Scientific summary not available for this record.';
        }
    }

    async function loadResult() {
        try {
            if (fileId) {
                const data = await api.get(`/dna/file/${fileId}`);
                await renderFromData(data);
                return;
            }

            // If jobId provided, poll analysis result until completed then render
            let attempts = 0;
            while (attempts < 60) {
                const job = await api.get(`/analysis/analysis-result/${jobId}`);
                if (!job) return;
                if (job.status === 'completed' && job.result) {
                    await renderFromData(job);
                    return;
                }
                if (job.status === 'failed') {
                    showToast('Analysis failed: ' + (job.errorMessage || 'See details'), 'error');
                    return;
                }
                // wait and retry
                await new Promise(r => setTimeout(r, 3000));
                attempts += 1;
            }
            showToast('Analysis still in progress. Try refreshing later.', 'info');
        } catch (error) {
            console.error(error);
        }
    }

    await loadResult();
});

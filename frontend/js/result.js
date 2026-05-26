/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// result.js - Detailed Analysis Result View
document.addEventListener('DOMContentLoaded', async () => {
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

        const gc = (src.gcContent !== undefined) ? src.gcContent : (src.gc_content || (src.statistics && src.statistics.gc_content)) || 0;
        document.querySelector('[data-metric="gcContent"]').textContent = `${gc.toFixed(1)}%`;
        document.querySelector('[data-progress="gcContent"]').style.width = `${gc}%`;

        const atRatio = 100 - gc;
        document.querySelector('[data-metric="atRatio"]').textContent = `${atRatio.toFixed(1)}%`;
        document.querySelector('[data-progress="atRatio"]').style.width = `${atRatio}%`;

        const seq = src.sequence || src.validation?.cleaned || '';
        document.querySelector('[data-metric="length"]').textContent = seq.length ? seq.length.toLocaleString() : '0';

        const viewer = document.getElementById('sequence-viewer');
        if (viewer) {
            viewer.innerHTML = seq.split('').map(n => `<span class="nucleotide n-${n.toLowerCase()}">${n}</span>`).join('');
        }

        const mutationsContainer = document.getElementById('mutations-container');
        if (mutationsContainer) {
            mutationsContainer.innerHTML = '';
            const muts = src.mutations || src.variants?.map(v => `${v.gene || 'Unknown'}:${v.variantId||v.variant_id||v.rsid}`) || [];
            if (muts.length > 0) {
                muts.forEach(m => {
                    const div = document.createElement('div');
                    div.className = 'p-4 bg-coral/10 border border-coral/30 rounded-2xl flex justify-between items-center mb-3';
                    div.innerHTML = `
                        <p class="font-mono text-sm text-coral font-bold">${m}</p>
                        <span class="px-3 py-1 bg-coral/20 rounded text-[10px] font-bold text-coral uppercase">DEVIATION</span>
                    `;
                    mutationsContainer.appendChild(div);
                });
            } else {
                mutationsContainer.innerHTML = '<p class="text-teal font-bold flex items-center gap-2"><span class="material-symbols-outlined">verified</span> No significant mutations detected.</p>';
            }
        }

        if (window.initNucleotideChart && (src.nucleotideFrequency || src.statistics?.nucleotide_frequency)) {
            window.initNucleotideChart(src.nucleotideFrequency || src.statistics.nucleotide_frequency);
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


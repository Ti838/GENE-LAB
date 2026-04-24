/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// compare.js - DNA Comparison Logic
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('compare.html')) return;

    const container = document.getElementById('compare-files-container');
    const resultContainer = document.getElementById('compare-result');
    const compareBtn = document.getElementById('compare-btn');
    let selectedFiles = [];

    // Load doctor's files
    async function loadFiles() {
        try {
            const files = await api.get('/dna/my-files');
            if (!container) return;
            container.innerHTML = '';

            if (files.length === 0) {
                container.innerHTML = '<p class="text-slate-500 italic text-center col-span-2">No files found. Upload DNA files first.</p>';
                return;
            }

            files.forEach(file => {
                const card = document.createElement('div');
                card.className = 'bg-white/5 border border-white/10 p-4 rounded-2xl cursor-pointer hover:border-cyan/40 transition-all flex items-center gap-3';
                card.dataset.id = file._id;
                card.innerHTML = `
                    <span class="material-symbols-outlined text-cyan">description</span>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-white truncate">${file.originalName}</p>
                        <p class="text-xs text-slate-500 uppercase">${file.status}</p>
                    </div>
                    <span class="material-symbols-outlined text-slate-600 check-icon hidden">check_circle</span>
                `;
                card.onclick = () => toggleSelect(card, file._id);
                container.appendChild(card);
            });
        } catch (error) {
            console.error(error);
            if (container) container.innerHTML = '<p class="text-red-400 text-center">Failed to load files</p>';
        }
    }

    function toggleSelect(card, id) {
        const idx = selectedFiles.indexOf(id);
        if (idx > -1) {
            selectedFiles.splice(idx, 1);
            card.classList.remove('border-cyan', 'bg-cyan/10');
            card.querySelector('.check-icon').classList.add('hidden');
        } else {
            if (selectedFiles.length >= 2) {
                // Deselect the first one
                const firstCard = container.querySelector(`[data-id="${selectedFiles[0]}"]`);
                if (firstCard) {
                    firstCard.classList.remove('border-cyan', 'bg-cyan/10');
                    firstCard.querySelector('.check-icon').classList.add('hidden');
                }
                selectedFiles.shift();
            }
            selectedFiles.push(id);
            card.classList.add('border-cyan', 'bg-cyan/10');
            card.querySelector('.check-icon').classList.remove('hidden');
        }

        if (compareBtn) {
            compareBtn.disabled = selectedFiles.length !== 2;
            compareBtn.classList.toggle('opacity-50', selectedFiles.length !== 2);
        }
    }

    // Compare button
    if (compareBtn) {
        compareBtn.onclick = async () => {
            if (selectedFiles.length !== 2) return;
            compareBtn.disabled = true;
            compareBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Comparing...';

            try {
                const result = await api.post('/dna/compare', { id1: selectedFiles[0], id2: selectedFiles[1] });
                showResult(result);
            } catch (error) {
                alert('Comparison failed: ' + error.message);
            } finally {
                compareBtn.disabled = false;
                compareBtn.innerHTML = '<span class="material-symbols-outlined text-sm">compare_arrows</span> Compare Selected';
            }
        };
    }

    function showResult(data) {
        if (!resultContainer) return;
        resultContainer.classList.remove('hidden');

        const similarityColor = data.similarity >= 90 ? 'text-teal' : data.similarity >= 60 ? 'text-cyan' : 'text-coral';

        resultContainer.innerHTML = `
            <div class="glass-panel p-8 rounded-[32px] border-white/5 mt-8">
                <h3 class="text-2xl font-display font-bold text-white mb-6">Comparison Results</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div class="bg-white/5 p-4 rounded-xl text-center">
                        <p class="text-xs text-slate-500 uppercase mb-1">Similarity</p>
                        <p class="text-3xl font-display font-bold ${similarityColor}">${data.similarity}%</p>
                    </div>
                    <div class="bg-white/5 p-4 rounded-xl text-center">
                        <p class="text-xs text-slate-500 uppercase mb-1">Matches</p>
                        <p class="text-3xl font-display font-bold text-teal">${data.matchCount.toLocaleString()}</p>
                    </div>
                    <div class="bg-white/5 p-4 rounded-xl text-center">
                        <p class="text-xs text-slate-500 uppercase mb-1">Mismatches</p>
                        <p class="text-3xl font-display font-bold text-coral">${data.mismatchCount.toLocaleString()}</p>
                    </div>
                    <div class="bg-white/5 p-4 rounded-xl text-center">
                        <p class="text-xs text-slate-500 uppercase mb-1">Seq 1 / Seq 2</p>
                        <p class="text-lg font-mono font-bold text-white">${data.seq1Length} / ${data.seq2Length}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-400 mb-4">
                    <span class="material-symbols-outlined text-sm">info</span>
                    <span><strong class="text-white">${data.file1}</strong> vs <strong class="text-white">${data.file2}</strong></span>
                </div>
                ${data.mismatches.length > 0 ? `
                <div class="mt-4">
                    <p class="text-xs text-slate-500 uppercase font-bold mb-3">Mutation Details (first ${Math.min(data.mismatches.length, 20)})</p>
                    <div class="max-h-48 overflow-y-auto space-y-1">
                        ${data.mismatches.slice(0, 20).map(m => `
                            <div class="flex items-center gap-3 text-xs font-mono p-2 rounded-lg bg-white/5">
                                <span class="text-slate-500">pos ${m.position}</span>
                                <span class="text-coral">${m.seq1}</span>
                                <span class="text-slate-600">→</span>
                                <span class="text-teal">${m.seq2}</span>
                                <span class="ml-auto text-slate-600 uppercase text-[10px]">${m.type}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}
            </div>
        `;
    }

    await loadFiles();
});

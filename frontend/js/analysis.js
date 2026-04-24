/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// analysis.js - Sequence Analysis In-Progress Logic
document.addEventListener('DOMContentLoaded', () => {
    const fileContainer = document.getElementById('file-container');
    const runAnalysisBtn = document.getElementById('run-analysis-btn');
    let selectedFileId = null;

    async function loadFiles() {
        try {
            const files = await api.get('/dna/my-files');
            if (!fileContainer) return;

            if (files.length === 0) {
                fileContainer.innerHTML = '<p class="text-slate-500 italic text-center p-4">No files found. Please upload DNA first.</p>';
                return;
            }

            fileContainer.innerHTML = '';
            files.forEach(f => {
                const card = document.createElement('div');
                card.className = `p-6 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center cursor-pointer hover:border-cyan/50 transition-all mb-4 ${selectedFileId === f._id ? 'border-cyan bg-cyan/5' : ''}`;
                card.innerHTML = `
                    <div class="flex gap-4 items-center">
                        <span class="material-symbols-outlined ${f.status === 'analyzed' ? 'text-teal' : 'text-slate-500'}">dna</span>
                        <div>
                            <p class="font-bold text-white">${f.originalName}</p>
                            <p class="text-[10px] text-slate-500 uppercase">${f.status}</p>
                        </div>
                    </div>
                    ${selectedFileId === f._id ? '<span class="material-symbols-outlined text-cyan">check_circle</span>' : ''}
                `;
                card.onclick = () => selectFile(f._id);
                fileContainer.appendChild(card);
            });
        } catch (error) {
            console.error(error);
        }
    }

    function selectFile(id) {
        selectedFileId = id;
        loadFiles(); // Refresh UI to show selection
        if (runAnalysisBtn) {
            runAnalysisBtn.disabled = false;
            runAnalysisBtn.classList.remove('opacity-50');
        }
    }

    if (runAnalysisBtn) {
        runAnalysisBtn.onclick = async () => {
            if (!selectedFileId) return;

            runAnalysisBtn.disabled = true;
            runAnalysisBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Analyzing...';

            try {
                const response = await api.post(`/dna/analyze/${selectedFileId}`);
                // Redirect to reports or show summary
                alert('Analysis complete!');
                window.location.href = 'reports.html';
            } catch (error) {
                alert('Analysis failed: ' + error.message);
            } finally {
                runAnalysisBtn.disabled = false;
                runAnalysisBtn.innerHTML = 'Run Sequence Analysis';
            }
        };
    }

    loadFiles();
});

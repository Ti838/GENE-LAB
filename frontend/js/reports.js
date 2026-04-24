/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// reports.js - DNA Analysis Reports List
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('reports.html')) return;

    const reportsTableBody = document.getElementById('reports-table-body');

    async function loadReports() {
        try {
            const files = await api.get('/dna/my-files');
            if (!reportsTableBody) return;
            
            const analyzedFiles = files.filter(f => f.status === 'analyzed');
            reportsTableBody.innerHTML = '';

            if (analyzedFiles.length === 0) {
                reportsTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-slate-500 p-8 italic">No analyzed reports found. Run analysis on your files first.</td></tr>';
                return;
            }

            analyzedFiles.forEach(f => {
                const date = new Date(f.createdAt).toLocaleDateString();
                const row = document.createElement('tr');
                row.className = 'hover:bg-white/5 transition';
                row.innerHTML = `
                    <td class="p-4 font-mono text-cyan text-xs">${f._id.substr(-8).toUpperCase()}</td>
                    <td class="p-4 text-white font-bold">${f.originalName}</td>
                    <td class="p-4 text-slate-500 text-sm">${date}</td>
                    <td class="p-4 text-right">
                        <div class="flex justify-end gap-3">
                            <button onclick="viewReport('${f._id}')" class="text-teal font-bold text-xs uppercase hover:underline flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm">visibility</span> View
                            </button>
                            <button onclick="downloadReport('${f._id}')" class="text-cyan font-bold text-xs uppercase hover:underline flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm">download</span> PDF
                            </button>
                        </div>
                    </td>
                `;
                reportsTableBody.appendChild(row);
            });
        } catch (error) {
            console.error(error);
        }
    }

    window.viewReport = (id) => {
        // In a real app, this would open a modal or redirect to a detail page
        // For now, let's redirect to result.html with the ID
        window.location.href = `result.html?id=${id}`;
    };

    window.downloadReport = (id) => {
        alert('PDF Generation Engine Initializing... (Feature coming soon)');
    };

    await loadReports();
});


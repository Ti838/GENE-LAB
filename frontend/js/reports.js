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
                                <span class="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
                            </button>
                            <button onclick="exportReportCSV('${f._id}')" class="text-violet font-bold text-xs uppercase hover:underline flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm">download</span> CSV
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
        window.location.href = `result.html?id=${id}`;
    };

    window.downloadReport = (id) => {
        showToast('PDF Generation Engine Initializing... (Feature coming soon)', 'info');
    };

    window.exportReportCSV = async (id) => {
        try {
            showToast('Fetching DNA analysis data...', 'info');
            const data = await api.get(`/dna/file/${id}`);
            if (!data) return showToast('Failed to load analysis details.', 'error');
            
            let csv = '\uFEFF'; // UTF-8 BOM for Excel compatibility
            csv += 'GeneLab Biological Analysis Report\n';
            csv += `Report ID,${data._id}\n`;
            csv += `Original Name,${data.originalName}\n`;
            csv += `Status,${data.status}\n`;
            csv += `Created At,${new Date(data.createdAt).toLocaleString()}\n`;
            csv += `Sequence Length,${data.sequenceLength || 0} bp\n`;
            csv += `GC Content,${((data.gcContent || 0) * 100).toFixed(2)}%\n`;
            csv += `AT Content,${((data.atContent || 0) * 100).toFixed(2)}%\n`;
            csv += `Molecular Weight,${data.molecularWeightDa || 0} Da\n\n`;
            
            csv += 'Nucleotide Frequency\n';
            csv += `Adenine (A),${data.nucleotideFrequency?.A || 0} (${((data.nucleotidePercentage?.A || 0) * 100).toFixed(2)}%)\n`;
            csv += `Thymine (T),${data.nucleotideFrequency?.T || 0} (${((data.nucleotidePercentage?.T || 0) * 100).toFixed(2)}%)\n`;
            csv += `Guanine (G),${data.nucleotideFrequency?.G || 0} (${((data.nucleotidePercentage?.G || 0) * 100).toFixed(2)}%)\n`;
            csv += `Cytosine (C),${data.nucleotideFrequency?.C || 0} (${((data.nucleotidePercentage?.C || 0) * 100).toFixed(2)}%)\n\n`;
            
            if (data.variants && data.variants.length > 0) {
                csv += 'Detected Variants & Mutations\n';
                csv += 'Variant ID,Gene,Severity,Clinical Significance,CADD Phred Score,Population Frequency\n';
                data.variants.forEach(v => {
                    csv += `"${v.variantId || ''}","${v.gene || ''}","${v.severity || ''}","${v.clinicalSignificance || ''}",${v.caddPhredScore || 0},${v.populationFrequency || 0}\n`;
                });
            } else {
                csv += 'No significant variants detected.\n';
            }
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `genelab_report_${data.originalName.replace(/\.[^/.]+$/, "")}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('CSV Report downloaded successfully!', 'success');
        } catch (error) {
            showToast('Failed to export CSV: ' + error.message, 'error');
        }
    };

    await loadReports();
});


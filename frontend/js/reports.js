/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// reports.js - DNA Analysis Reports List

// ── Helper: trigger a named download from a Blob ──────────────────────────
function _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href    = url;
    link.download = filename;          // use .download property, NOT setAttribute
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    // Defer cleanup so browser has time to begin the download
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 300);
}

// ── Helper: safe filename stem (strip extension, sanitise special chars) ──
function _safeStem(originalName) {
    return (originalName || 'report')
        .replace(/\.[^/.]+$/, '')          // strip extension
        .replace(/[^a-zA-Z0-9_\-. ]/g, '_'); // replace unsafe chars
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('reports.html')) return;
    if (typeof window.doctorOnly === 'function' && !window.doctorOnly()) return;

    const reportsTableBody = document.getElementById('reports-table-body');

    async function loadReports() {
        if (!reportsTableBody) return;
        reportsTableBody.innerHTML = '<tr><td colspan="4" class="p-10 text-center italic" style="color:var(--text-faint)">Accessing clinical records...</td></tr>';
        try {
            const files = await api.get('/dna/my-files');
            const analyzedFiles = files.filter(f => f.status === 'analyzed');
            reportsTableBody.innerHTML = '';

            if (!analyzedFiles.length) {
                reportsTableBody.innerHTML = '<tr><td colspan="4" class="text-center italic p-8" style="color:var(--text-faint)">No analyzed reports found. Run analysis on your files first.</td></tr>';
                return;
            }

            analyzedFiles.forEach(f => {
                const date = new Date(f.createdAt).toLocaleDateString();
                const row  = document.createElement('tr');
                row.className = 'hover:bg-white/5 transition';
                row.style.borderBottom = '1px solid var(--border)';

                // Ref ID — last 8 chars of mongo id (safe, no user input)
                const tdId = document.createElement('td');
                tdId.className = 'p-4 font-mono text-xs';
                tdId.style.color = 'var(--cyan)';
                tdId.textContent = f._id.substr(-8).toUpperCase();

                // File name
                const tdName = document.createElement('td');
                tdName.className = 'p-4 font-bold';
                tdName.style.color = 'var(--text)';
                tdName.textContent = f.originalName; // textContent = XSS safe

                // Date
                const tdDate = document.createElement('td');
                tdDate.className = 'p-4 text-sm';
                tdDate.style.color = 'var(--text-muted)';
                tdDate.textContent = date;

                // Actions
                const tdActions = document.createElement('td');
                tdActions.className = 'p-4 text-right';
                const btnWrap = document.createElement('div');
                btnWrap.className = 'flex justify-end gap-3';

                const mkBtn = (label, icon, color, handler) => {
                    const btn = document.createElement('button');
                    btn.className = `font-bold text-xs uppercase flex items-center gap-1 hover:underline transition`;
                    btn.style.color = `var(--${color})`;
                    const ico = document.createElement('span');
                    ico.className = 'material-symbols-outlined';
                    ico.style.cssText = 'font-size:14px!important;width:14px!important;height:14px!important;';
                    ico.textContent = icon;
                    btn.appendChild(ico);
                    btn.appendChild(document.createTextNode(' ' + label));
                    btn.addEventListener('click', handler);
                    return btn;
                };

                btnWrap.appendChild(mkBtn('View', 'visibility',   'teal',   () => window.viewReport(f._id)));
                btnWrap.appendChild(mkBtn('PDF',  'picture_as_pdf','cyan',  () => window.downloadReport(f._id)));
                btnWrap.appendChild(mkBtn('CSV',  'download',     'violet', () => window.exportReportCSV(f._id)));

                tdActions.appendChild(btnWrap);
                row.appendChild(tdId);
                row.appendChild(tdName);
                row.appendChild(tdDate);
                row.appendChild(tdActions);
                reportsTableBody.appendChild(row);
            });
        } catch (err) {
            reportsTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-8 italic" style="color:var(--coral)">Failed to load reports. Please refresh.</td></tr>';
        }
    }

    // ── Navigate to result detail page ────────────────────────────────────
    window.viewReport = (id) => {
        window.location.href = `result.html?id=${id}`;
    };

    // ── PDF Download ──────────────────────────────────────────────────────
    window.downloadReport = async (id) => {
        try {
            showToast('Generating PDF report…', 'info');

            // Fetch file record (to get analysisJobId + original name)
            const data = await api.get(`/dna/file/${id}`);
            if (!data) return showToast('Failed to load file details.', 'error');

            // Use file _id as fallback when analysisJobId is absent (e.g. seeded records)
            const jobId = data.analysisJobId || data._id;

            const API_BASE = window.__GENELAB_API_BASE_URL__
                || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname
                    ? 'http://localhost:5000/api'
                    : '/api');

            const token    = localStorage.getItem('genelab_token');
            const response = await fetch(`${API_BASE}/analysis/download-report/${jobId}`, {
                method : 'GET',
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (!response.ok) {
                let errMsg = 'Failed to download PDF.';
                try { errMsg = (await response.json()).message || errMsg; } catch (_) {}
                throw new Error(errMsg);
            }

            const blob = await response.blob();
            _triggerDownload(blob, `genelab_report_${_safeStem(data.originalName)}.pdf`);
            showToast('PDF report downloaded!', 'success');
        } catch (err) {
            showToast('PDF download failed: ' + err.message, 'error');
        }
    };

    // ── CSV Export ────────────────────────────────────────────────────────
    window.exportReportCSV = async (id) => {
        try {
            showToast('Preparing CSV export…', 'info');

            const data = await api.get(`/dna/file/${id}`);
            if (!data) return showToast('Failed to load analysis details.', 'error');

            // Normalise fraction (0.0-1.0) → percentage (0-100) for display
            const toPercent = (v) => {
                const n = v || 0;
                return n > 0 && n <= 1 ? n * 100 : n;
            };

            const gc  = toPercent(data.gcContent);
            const at_ = toPercent(data.atContent);
            const A   = toPercent(data.nucleotidePercentage?.A);
            const T   = toPercent(data.nucleotidePercentage?.T);
            const G   = toPercent(data.nucleotidePercentage?.G);
            const C   = toPercent(data.nucleotidePercentage?.C);

            // Build CSV (UTF-8 BOM so Excel opens correctly)
            let csv = '\uFEFF';
            csv += 'GeneLab Biological Analysis Report\n';
            csv += `Report ID,${data._id}\n`;
            csv += `File Name,${data.originalName || 'Unknown'}\n`;
            csv += `Status,${data.status}\n`;
            csv += `Analysis Type,${data.analysisType || 'instant'}\n`;
            csv += `Created At,${new Date(data.createdAt).toLocaleString()}\n\n`;

            csv += 'Sequence Statistics\n';
            csv += `Sequence Length,${(data.sequenceLength || 0).toLocaleString()} bp\n`;
            csv += `GC Content,${gc.toFixed(2)}%\n`;
            csv += `AT Content,${at_.toFixed(2)}%\n`;
            csv += `GC Skew,${data.gcSkew || 0}\n`;
            csv += `AT Skew,${data.atSkew || 0}\n`;
            csv += `Molecular Weight,${(data.molecularWeightDa || 0).toLocaleString()} Da\n\n`;

            csv += 'Nucleotide Frequency\n';
            csv += 'Base,Count,Percentage\n';
            csv += `Adenine (A),${data.nucleotideFrequency?.A || 0},${A.toFixed(2)}%\n`;
            csv += `Thymine (T),${data.nucleotideFrequency?.T || 0},${T.toFixed(2)}%\n`;
            csv += `Guanine (G),${data.nucleotideFrequency?.G || 0},${G.toFixed(2)}%\n`;
            csv += `Cytosine (C),${data.nucleotideFrequency?.C || 0},${C.toFixed(2)}%\n\n`;

            if (data.codonAnalysis) {
                const ca = data.codonAnalysis;
                csv += 'Codon Analysis\n';
                csv += `Total Codons,${ca.totalCodons || 0}\n`;
                csv += `Protein Length,${ca.proteinLength || 0} aa\n`;
                csv += `Start Codons (ATG),${ca.startCodonCount || 0}\n`;
                csv += `Stop Codons,${ca.stopCodonCount || 0}\n`;
                csv += `Open Reading Frames,${ca.openReadingFramesDetected || 0}\n`;
                if (ca.aminoAcidSequencePreview) {
                    csv += `Protein Sequence (preview),"${ca.aminoAcidSequencePreview.slice(0, 80)}"\n`;
                }
                csv += '\n';
            }

            if (data.variants && data.variants.length > 0) {
                csv += 'Detected Variants & Mutations\n';
                csv += 'Variant ID,Gene,Severity,Clinical Significance,CADD Phred Score,Population Frequency,Chromosome,Position\n';
                data.variants.forEach(v => {
                    csv += `"${v.variantId || v.rsid || ''}",`;
                    csv += `"${v.gene || ''}",`;
                    csv += `"${v.severity || ''}",`;
                    csv += `"${v.clinicalSignificance || ''}",`;
                    csv += `${v.caddPhredScore || 0},`;
                    csv += `${v.populationFrequency || 0},`;
                    csv += `"${v.chromosome || ''}",`;
                    csv += `${v.position || 0}\n`;
                });
                csv += '\n';
            } else {
                csv += 'Variants & Mutations\nNo significant variants detected.\n\n';
            }

            if (data.clinicalSummary) {
                csv += `Clinical Summary,"${data.clinicalSummary.replace(/"/g, '""')}"\n\n`;
            }
            if (data.scientificSummary) {
                csv += `Scientific Summary,"${data.scientificSummary.replace(/"/g, '""')}"\n\n`;
            }

            csv += 'GeneLab AI — For research purposes only. Not for clinical diagnosis without physician review.\n';

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            _triggerDownload(blob, `genelab_report_${_safeStem(data.originalName)}.csv`);
            showToast('CSV exported successfully!', 'success');
        } catch (err) {
            showToast('CSV export failed: ' + err.message, 'error');
        }
    };

    await loadReports();
});

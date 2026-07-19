/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// reports.js - DNA Analysis Reports List with Enterprise Table features

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
    if (!window.location.pathname.includes('reports')) return;
    const isResearcherPath = window.location.pathname.includes('/researcher/');
    const guard = isResearcherPath ? window.researcherOnly : window.doctorOnly;
    if (typeof guard === 'function' && !guard()) return;

    const reportsTableBody = document.getElementById('reports-table-body');
    if (!reportsTableBody) return;

    let allReports = [];
    let tableState = {
        searchQuery: '',
        statusFilter: 'all',
        sortColumn: 'createdAt',
        sortDirection: 'desc',
        currentPage: 1,
        pageSize: 10
    };

    // ── Inject controls above/below the table card ───────────────────────────
    const tableCard = reportsTableBody.closest('.glass-panel');
    if (tableCard) {
        // Create Header Toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'p-6 border-b flex flex-wrap items-center justify-between gap-4 bg-slate-950/20';
        toolbar.style.borderColor = 'var(--border)';

        // Left Controls: Search & Filter
        const leftControls = document.createElement('div');
        leftControls.className = 'flex flex-wrap items-center gap-3';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search reports...';
        searchInput.className = 'field-input px-4 py-2 text-xs w-64 bg-slate-900 border rounded-xl focus:outline-none focus:border-cyan/50';
        searchInput.style.borderColor = 'var(--border)';

        leftControls.appendChild(searchInput);

        if (!isResearcherPath) {
            const statusSelect = document.createElement('select');
            statusSelect.className = 'bg-slate-900 border text-xs font-bold text-white px-3 py-2 rounded-xl focus:border-cyan/50 focus:outline-none';
            statusSelect.style.borderColor = 'var(--border)';
            statusSelect.innerHTML = `
                <option value="all">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Needs Review">Needs Review</option>
                <option value="Pending Approval">Pending Approval</option>
            `;
            leftControls.appendChild(statusSelect);
            statusSelect.addEventListener('change', () => {
                tableState.statusFilter = statusSelect.value;
                tableState.currentPage = 1;
                updateTable();
            });
        }

        // Right Controls: Export Options
        const rightControls = document.createElement('div');
        rightControls.className = 'flex items-center gap-3';

        const csvExportBtn = document.createElement('button');
        csvExportBtn.className = 'btn-premium btn-ghost px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5';
        csvExportBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">download</span> Export CSV';

        const printBtn = document.createElement('button');
        printBtn.className = 'btn-premium btn-ghost px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5';
        printBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">print</span> Print';

        rightControls.appendChild(csvExportBtn);
        rightControls.appendChild(printBtn);

        toolbar.appendChild(leftControls);
        toolbar.appendChild(rightControls);
        tableCard.insertBefore(toolbar, tableCard.firstChild);

        // Listeners for Toolbar
        searchInput.addEventListener('input', () => {
            tableState.searchQuery = searchInput.value.toLowerCase();
            tableState.currentPage = 1;
            updateTable();
        });

        csvExportBtn.addEventListener('click', () => {
            exportTableToCSV();
        });

        printBtn.addEventListener('click', () => {
            window.print();
        });

        // Create Pagination Footer
        const footer = document.createElement('div');
        footer.className = 'p-4 border-t flex flex-wrap items-center justify-between gap-4 bg-slate-950/20';
        footer.style.borderColor = 'var(--border)';

        const footerInfo = document.createElement('span');
        footerInfo.className = 'text-xs text-slate-400 font-medium';
        footerInfo.textContent = 'Showing 0-0 of 0 records';

        const paginationGroup = document.createElement('div');
        paginationGroup.className = 'flex items-center gap-2';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn-premium btn-ghost px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1';
        prevBtn.innerHTML = '<span class="material-symbols-outlined text-[14px]">chevron_left</span> Previous';

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn-premium btn-ghost px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1';
        nextBtn.innerHTML = 'Next <span class="material-symbols-outlined text-[14px]">chevron_right</span>';

        paginationGroup.appendChild(prevBtn);
        paginationGroup.appendChild(nextBtn);

        footer.appendChild(footerInfo);
        footer.appendChild(paginationGroup);
        tableCard.appendChild(footer);

        prevBtn.addEventListener('click', () => {
            if (tableState.currentPage > 1) {
                tableState.currentPage--;
                updateTable();
            }
        });

        nextBtn.addEventListener('click', () => {
            const maxPage = Math.ceil(filteredReportsCount() / tableState.pageSize);
            if (tableState.currentPage < maxPage) {
                tableState.currentPage++;
                updateTable();
            }
        });

        // Setup Sort Header columns
        const headers = tableCard.querySelectorAll('thead th');
        headers.forEach(th => {
            const label = th.textContent.trim();
            if (label && label !== 'ACTIONS') {
                th.style.cursor = 'pointer';
                th.style.userSelect = 'none';
                th.classList.add('hover:text-white', 'transition-colors');
                
                // Set initial sort indicator
                const indicator = document.createElement('span');
                indicator.className = 'material-symbols-outlined align-middle ml-1 text-[14px]';
                indicator.style.display = 'none';
                th.appendChild(indicator);

                th.addEventListener('click', () => {
                    const colMap = {
                        'REF ID': '_id',
                        'PATIENT ID': 'patientId',
                        'INDICATION': 'clinicalIndication',
                        'FILE NAME': 'originalName',
                        'REVIEW STATUS': 'clinicalStatus',
                        'ANALYSIS DATE': 'createdAt'
                    };
                    const colKey = colMap[label];
                    if (colKey) {
                        if (tableState.sortColumn === colKey) {
                            tableState.sortDirection = tableState.sortDirection === 'asc' ? 'desc' : 'asc';
                        } else {
                            tableState.sortColumn = colKey;
                            tableState.sortDirection = 'asc';
                        }
                        updateTableHeaders();
                        updateTable();
                    }
                });
            }
        });

        function updateTableHeaders() {
            headers.forEach(th => {
                const label = th.textContent.trim().replace(/arrow_upward|arrow_downward/g, '').trim();
                const indicator = th.querySelector('.material-symbols-outlined');
                if (indicator) {
                    const colMap = {
                        'REF ID': '_id',
                        'PATIENT ID': 'patientId',
                        'INDICATION': 'clinicalIndication',
                        'FILE NAME': 'originalName',
                        'REVIEW STATUS': 'clinicalStatus',
                        'ANALYSIS DATE': 'createdAt'
                    };
                    const colKey = colMap[label];
                    if (colKey === tableState.sortColumn) {
                        indicator.style.display = 'inline-block';
                        indicator.textContent = tableState.sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
                    } else {
                        indicator.style.display = 'none';
                    }
                }
            });
        }

        function filteredReportsCount() {
            return getFilteredReports().length;
        }

        function getFilteredReports() {
            return allReports.filter(r => {
                // Search query match
                const refId = (r._id || '').substr(-8).toUpperCase();
                const patientId = (r.patientId || '').toLowerCase();
                const indication = (r.clinicalIndication || '').toLowerCase();
                const filename = (r.originalName || '').toLowerCase();
                const query = tableState.searchQuery;

                const searchMatch = !query || 
                    refId.includes(query.toUpperCase()) || 
                    patientId.includes(query) || 
                    indication.includes(query) || 
                    filename.includes(query);

                // Status match
                const statusMatch = tableState.statusFilter === 'all' || 
                    (r.clinicalStatus || 'Pending Approval') === tableState.statusFilter;

                return searchMatch && statusMatch;
            });
        }

        function updateTable() {
            let filtered = getFilteredReports();

            // Sort
            filtered.sort((a, b) => {
                let valA = a[tableState.sortColumn] || '';
                let valB = b[tableState.sortColumn] || '';
                if (tableState.sortColumn === 'createdAt') {
                    valA = new Date(valA).getTime();
                    valB = new Date(valB).getTime();
                } else {
                    valA = valA.toString().toLowerCase();
                    valB = valB.toString().toLowerCase();
                }

                if (valA < valB) return tableState.sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return tableState.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });

            // Pagination calculations
            const total = filtered.length;
            const startIdx = (tableState.currentPage - 1) * tableState.pageSize;
            const endIdx = Math.min(startIdx + tableState.pageSize, total);
            const paginated = filtered.slice(startIdx, endIdx);

            reportsTableBody.innerHTML = '';

            const overflowContainer = tableCard.querySelector('.overflow-x-auto');

            if (total === 0) {
                if (window.innerWidth <= 768) {
                    const tableEl = tableCard.querySelector('table');
                    if (tableEl) tableEl.style.display = 'none';
                    let cardContainer = tableCard.querySelector('.mobile-cards-container');
                    if (!cardContainer) {
                        cardContainer = document.createElement('div');
                        cardContainer.className = 'mobile-cards-container flex flex-col gap-4 p-4';
                        overflowContainer.appendChild(cardContainer);
                    }
                    cardContainer.innerHTML = '<div class="text-center italic p-8 text-slate-500">No reports match your filters.</div>';
                } else {
                    const tableEl = tableCard.querySelector('table');
                    if (tableEl) tableEl.style.display = 'table';
                    const cardContainer = tableCard.querySelector('.mobile-cards-container');
                    if (cardContainer) cardContainer.innerHTML = '';
                    const colCount = isResearcherPath ? 4 : 6;
                    reportsTableBody.innerHTML = `<tr><td colspan="${colCount}" class="text-center italic p-8 text-slate-500">No reports match your filters.</td></tr>`;
                }
                footerInfo.textContent = 'Showing 0-0 of 0 records';
                prevBtn.disabled = true;
                nextBtn.disabled = true;
                return;
            }

            // Update footer
            footerInfo.textContent = `Showing ${(startIdx + 1).toLocaleString()}-${endIdx.toLocaleString()} of ${total.toLocaleString()} records`;
            prevBtn.disabled = tableState.currentPage === 1;
            nextBtn.disabled = endIdx >= total;

            if (window.innerWidth <= 768) {
                // Mobile layout
                const tableEl = tableCard.querySelector('table');
                if (tableEl) tableEl.style.display = 'none';

                let cardContainer = tableCard.querySelector('.mobile-cards-container');
                if (!cardContainer) {
                    cardContainer = document.createElement('div');
                    cardContainer.className = 'mobile-cards-container flex flex-col gap-4 p-4';
                    overflowContainer.appendChild(cardContainer);
                }
                cardContainer.innerHTML = '';

                paginated.forEach(f => {
                    const date = new Date(f.createdAt).toLocaleDateString();
                    const card = document.createElement('div');
                    card.className = 'glass-card p-5 rounded-2xl border border-white/10 flex flex-col gap-3.5 hover:border-cyan/40 transition active:scale-[0.98] cursor-pointer';
                    card.setAttribute('tabindex', '0');

                    // Header: Ref ID and Date
                    const header = document.createElement('div');
                    header.className = 'flex justify-between items-center';
                    header.innerHTML = `
                        <span class="text-xs font-mono font-bold text-cyan">${f._id.substr(-8).toUpperCase()}</span>
                        <span class="text-[11px] text-slate-400 font-mono">${date}</span>
                    `;
                    card.appendChild(header);

                    // Body
                    const body = document.createElement('div');
                    body.className = 'flex flex-col gap-1';
                    
                    if (!isResearcherPath) {
                        body.innerHTML = `
                            <p class="text-xs text-slate-400 font-medium">Patient: <strong class="text-white">${f.patientId || 'GL-PAT-001'}</strong></p>
                            <p class="text-sm text-slate-300 font-semibold truncate">${f.clinicalIndication || 'Hereditary screening request'}</p>
                        `;
                    } else {
                        body.innerHTML = `
                            <p class="text-sm text-white font-semibold truncate">${f.originalName}</p>
                        `;
                    }
                    card.appendChild(body);

                    // Status and Actions
                    const footerEl = document.createElement('div');
                    footerEl.className = 'flex justify-between items-center mt-1 pt-3 border-t border-white/5';
                    
                    // Status Badge
                    const statusWrapper = document.createElement('div');
                    if (!isResearcherPath) {
                        const cStat = f.clinicalStatus || 'Pending Approval';
                        const statusSpan = document.createElement('span');
                        statusSpan.className = 'px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border';
                        if (cStat === 'Approved') {
                            statusSpan.style.cssText = 'color:var(--teal);border-color:rgba(6,255,160,0.3);background:rgba(6,255,160,0.08)';
                        } else {
                            statusSpan.style.cssText = 'color:var(--coral);border-color:rgba(255,107,107,0.3);background:rgba(255,107,107,0.08)';
                        }
                        statusSpan.textContent = cStat;
                        statusWrapper.appendChild(statusSpan);
                    }
                    footerEl.appendChild(statusWrapper);

                    // Action Group
                    const actionGroup = document.createElement('div');
                    actionGroup.className = 'flex items-center gap-1';

                    const mkTouchBtn = (icon, color, title, handler) => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors';
                        btn.style.color = `var(--${color})`;
                        btn.title = title;
                        btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">${icon}</span>`;
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            handler();
                        });
                        return btn;
                    };

                    actionGroup.appendChild(mkTouchBtn('visibility', 'teal', 'View', () => window.viewReport(f._id)));
                    actionGroup.appendChild(mkTouchBtn('picture_as_pdf', 'cyan', 'PDF', () => window.downloadReport(f._id)));
                    actionGroup.appendChild(mkTouchBtn('download', 'violet', 'CSV', () => window.exportReportCSV(f._id)));

                    footerEl.appendChild(actionGroup);
                    card.appendChild(footerEl);

                    card.addEventListener('click', () => {
                        window.viewReport(f._id);
                    });

                    card.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') window.viewReport(f._id);
                    });

                    cardContainer.appendChild(card);
                });
                return;
            }

            // Desktop Table Layout
            const tableEl = tableCard.querySelector('table');
            if (tableEl) tableEl.style.display = 'table';
            const cardContainer = tableCard.querySelector('.mobile-cards-container');
            if (cardContainer) cardContainer.innerHTML = '';

            paginated.forEach((f, index) => {
                const date = new Date(f.createdAt).toLocaleDateString();
                const row = document.createElement('tr');
                row.className = 'hover:bg-white/5 transition focus:outline-none focus:ring-1 focus:ring-cyan rounded-lg cursor-pointer';
                row.style.borderBottom = '1px solid var(--border)';
                row.setAttribute('tabindex', '0');

                // Ref ID
                const tdId = document.createElement('td');
                tdId.className = 'p-4 font-mono text-xs';
                tdId.style.color = 'var(--cyan)';
                tdId.textContent = f._id.substr(-8).toUpperCase();
                row.appendChild(tdId);

                if (!isResearcherPath) {
                    // Patient ID
                    const tdPatId = document.createElement('td');
                    tdPatId.className = 'p-4 font-mono text-xs font-bold text-white';
                    tdPatId.textContent = f.patientId || 'GL-PAT-001';
                    row.appendChild(tdPatId);

                    // Indication
                    const tdInd = document.createElement('td');
                    tdInd.className = 'p-4 text-sm text-slate-300 max-w-[200px] truncate';
                    tdInd.textContent = f.clinicalIndication || 'Hereditary screening request';
                    row.appendChild(tdInd);

                    // Review Status
                    const tdStatus = document.createElement('td');
                    tdStatus.className = 'p-4 text-xs';
                    const cStat = f.clinicalStatus || 'Pending Approval';
                    const statusSpan = document.createElement('span');
                    statusSpan.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border';
                    if (cStat === 'Approved') {
                        statusSpan.style.cssText = 'color:var(--teal);border-color:rgba(6,255,160,0.3);background:rgba(6,255,160,0.08)';
                    } else if (cStat === 'Needs Review') {
                        statusSpan.style.cssText = 'color:var(--coral);border-color:rgba(255,107,107,0.3);background:rgba(255,107,107,0.08)';
                    } else {
                        statusSpan.style.cssText = 'color:var(--coral);border-color:rgba(255,107,107,0.3);background:rgba(255,107,107,0.08)';
                    }
                    statusSpan.textContent = cStat;
                    tdStatus.appendChild(statusSpan);
                    row.appendChild(tdStatus);
                } else {
                    // File name (for researcher)
                    const tdName = document.createElement('td');
                    tdName.className = 'p-4 font-bold';
                    tdName.style.color = 'var(--text)';
                    tdName.textContent = f.originalName;
                    row.appendChild(tdName);
                }

                // Date
                const tdDate = document.createElement('td');
                tdDate.className = 'p-4 text-sm';
                tdDate.style.color = 'var(--text-muted)';
                tdDate.textContent = date;
                row.appendChild(tdDate);

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
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation(); // prevent row click triggers
                        handler();
                    });
                    return btn;
                };

                btnWrap.appendChild(mkBtn('View', 'visibility',   'teal',   () => window.viewReport(f._id)));
                btnWrap.appendChild(mkBtn('PDF',  'picture_as_pdf','cyan',  () => window.downloadReport(f._id)));
                btnWrap.appendChild(mkBtn('CSV',  'download',     'violet', () => window.exportReportCSV(f._id)));

                tdActions.appendChild(btnWrap);
                row.appendChild(tdActions);
                reportsTableBody.appendChild(row);

                // Add Keyboard Support to row
                row.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const nextRow = row.nextElementSibling;
                        if (nextRow) nextRow.focus();
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prevRow = row.previousElementSibling;
                        if (prevRow) prevRow.focus();
                    } else if (e.key === 'Enter') {
                        window.viewReport(f._id);
                    }
                });

                // Row click navigation
                row.addEventListener('click', () => {
                    window.viewReport(f._id);
                });
            });
        }

        function exportTableToCSV() {
            showToast('Preparing batch CSV export…', 'info');
            const filtered = getFilteredReports();
            if (filtered.length === 0) {
                showToast('No records to export.', 'warning');
                return;
            }

            let csv = '\uFEFF';
            csv += 'GeneLab Reports Table Export\n';
            csv += `Export Date,${new Date().toLocaleString()}\n`;
            csv += `Total Records,${filtered.length}\n\n`;

            if (!isResearcherPath) {
                csv += 'Ref ID,Patient ID,Indication,Review Status,Analysis Date\n';
                filtered.forEach(r => {
                    csv += `"${r._id.substr(-8).toUpperCase()}",`;
                    csv += `"${r.patientId || 'GL-PAT-001'}",`;
                    csv += `"${r.clinicalIndication || ''}",`;
                    csv += `"${r.clinicalStatus || 'Pending Approval'}",`;
                    csv += `"${new Date(r.createdAt).toLocaleDateString()}"\n`;
                });
            } else {
                csv += 'Ref ID,File Name,Analysis Date\n';
                filtered.forEach(r => {
                    csv += `"${r._id.substr(-8).toUpperCase()}",`;
                    csv += `"${r.originalName || ''}",`;
                    csv += `"${new Date(r.createdAt).toLocaleDateString()}"\n`;
                });
            }

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            _triggerDownload(blob, `genelab_reports_table_export.csv`);
            showToast('Table exported successfully!', 'success');
        }
    }

    async function loadReports() {
        const colCount = isResearcherPath ? 4 : 6;
        reportsTableBody.innerHTML = `<tr><td colspan="${colCount}" class="p-10 text-center italic" style="color:var(--text-faint)">Accessing clinical records...</td></tr>`;
        try {
            const files = await api.get('/dna/my-files');
            allReports = files.filter(f => f.status === 'analyzed');
            
            if (tableCard) {
                updateTable();
            }
        } catch (err) {
            reportsTableBody.innerHTML = `<tr><td colspan="${colCount}" class="text-center p-8 italic" style="color:var(--coral)">Failed to load reports. Please refresh.</td></tr>`;
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

            // Fetch file record
            const data = await api.get(`/dna/file/${id}`);
            if (!data) return showToast('Failed to load file details.', 'error');

            const jobId = data.analysisJobId || data._id;

            const API_BASE = window.__GENELAB_API_BASE_URL__
                || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname
                    ? 'http://localhost:5000/api'
                    : '/api');

            const token    = localStorage.getItem('genelab_token') || sessionStorage.getItem('genelab_token');
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

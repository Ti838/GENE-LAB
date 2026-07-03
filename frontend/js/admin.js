/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * admin.js — Admin Dashboard Logic
 * Covers: doctors management, DNA data registry, activity logs, announcements.
 * All DOM rendering uses textContent / DOM APIs — NO innerHTML with server data (XSS safe).
 */

// ─────────────────────────────────────────────────────────────────────────────
// XSS-safe cell builder helper: creates a <td> with textContent
// ─────────────────────────────────────────────────────────────────────────────
function _td(text, className = '') {
    const td = document.createElement('td');
    td.className = 'p-4' + (className ? ' ' + className : '');
    td.textContent = text ?? '—';
    return td;
}

// ─────────────────────────────────────────────────────────────────────────────
// XSS-safe empty-row builder
// ─────────────────────────────────────────────────────────────────────────────
function _emptyRow(colSpan, msg) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = colSpan;
    td.className = 'p-10 text-center italic';
    td.style.color = 'var(--text-faint)';
    td.textContent = msg;
    tr.appendChild(td);
    return tr;
}

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    // ═══════════════════════════════════════════════════════════════
    // USER / DOCTOR MANAGEMENT  — console/doctors.html
    // ═══════════════════════════════════════════════════════════════
    if (path.includes('console/doctors.html')) {
        const tableBody  = document.getElementById('doctors-table-body');
        const searchInput = document.getElementById('doctor-search');
        let allUsers = [];

        async function loadUsers() {
            if (tableBody) {
                tableBody.innerHTML = '';
                tableBody.appendChild(_emptyRow(6, 'Loading personnel...'));
            }
            try {
                const data = await api.get('/admin/users');
                allUsers = data.users || [];
                renderUsers(allUsers);
            } catch (err) {
                if (tableBody) {
                    tableBody.innerHTML = '';
                    tableBody.appendChild(_emptyRow(6, 'Failed to load users. Please refresh.'));
                }
            }
        }

        function renderUsers(users) {
            if (!tableBody) return;
            tableBody.innerHTML = '';

            if (!users.length) {
                tableBody.appendChild(_emptyRow(6, 'No users found matching your criteria.'));
                return;
            }

            users.forEach(user => {
                const isActive    = user.isActive;
                const statusClass = isActive
                    ? 'bg-teal/20 text-teal border-teal/30'
                    : 'bg-coral/20 text-coral border-coral/30';

                const row = document.createElement('tr');
                row.className = 'hover:bg-white/5 transition';
                row.style.borderBottom = '1px solid var(--border)';

                // Col 1: avatar + name + email
                const tdCred = document.createElement('td');
                tdCred.className = 'p-4';
                const credWrap = document.createElement('div');
                credWrap.className = 'flex items-center gap-3';
                const avatar = document.createElement('div');
                avatar.className = 'w-9 h-9 rounded-xl bg-cyan/10 flex items-center justify-center text-cyan text-sm font-bold flex-shrink-0';
                avatar.textContent = (user.name?.charAt(0) || '?').toUpperCase();
                const credText = document.createElement('div');
                const nameP = document.createElement('p');
                nameP.className = 'text-sm font-bold text-white';
                nameP.textContent = user.name || '—';
                const emailP = document.createElement('p');
                emailP.className = 'text-[10px]';
                emailP.style.color = 'var(--text-faint)';
                emailP.textContent = user.email || '—';
                credText.appendChild(nameP);
                credText.appendChild(emailP);
                credWrap.appendChild(avatar);
                credWrap.appendChild(credText);
                tdCred.appendChild(credWrap);

                // Col 2: specialization
                const tdSpec = _td(user.specialization || '—', 'text-sm');
                tdSpec.style.color = 'var(--text-muted)';

                // Col 3: role
                const tdRole = document.createElement('td');
                tdRole.className = 'p-4 text-[10px] font-bold uppercase tracking-widest';
                tdRole.style.color = 'var(--text-faint)';
                tdRole.textContent = user.role || '—';

                // Col 4: status badge
                const tdStatus = document.createElement('td');
                tdStatus.className = 'p-4';
                const badge = document.createElement('span');
                badge.className = `text-[9px] font-bold uppercase px-3 py-1 rounded-full border ${statusClass}`;
                badge.textContent = isActive ? 'Active' : 'Deactivated';
                tdStatus.appendChild(badge);

                // Col 5: joined date
                const tdDate = _td(new Date(user.createdAt).toLocaleDateString(), 'text-[10px] font-mono');
                tdDate.style.color = 'var(--text-faint)';

                // Col 6: action buttons
                const tdActions = document.createElement('td');
                tdActions.className = 'p-4';
                const btnWrap = document.createElement('div');
                btnWrap.className = 'flex gap-2 justify-end';

                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'px-3 py-1.5 rounded-lg text-[10px] font-bold transition';
                toggleBtn.style.cssText = 'background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.3);color:var(--violet)';
                toggleBtn.textContent = isActive ? 'Suspend' : 'Restore';
                toggleBtn.addEventListener('click', () => toggleUserStatus(user._id, isActive));

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'px-3 py-1.5 rounded-lg text-[10px] font-bold transition';
                deleteBtn.style.cssText = 'background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);color:var(--coral)';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', () => deleteUser(user._id, user.name));

                btnWrap.appendChild(toggleBtn);
                btnWrap.appendChild(deleteBtn);
                tdActions.appendChild(btnWrap);

                row.appendChild(tdCred);
                row.appendChild(tdSpec);
                row.appendChild(tdRole);
                row.appendChild(tdStatus);
                row.appendChild(tdDate);
                row.appendChild(tdActions);
                tableBody.appendChild(row);
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', e => {
                const q = e.target.value.toLowerCase();
                renderUsers(allUsers.filter(u =>
                    u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
                ));
            });
        }

        async function toggleUserStatus(id, currentStatus) {
            try {
                await api.put(`/admin/users/${id}`, { isActive: !currentStatus });
                showToast('User status updated.', 'success');
                await loadUsers();
            } catch (err) { /* api.js handles toast */ }
        }

        async function deleteUser(id, name) {
            if (!confirm(`Permanently delete user "${name}"?\nThis action cannot be undone.`)) return;
            try {
                await api.delete(`/admin/users/${id}`);
                showToast('User deleted.', 'success');
                await loadUsers();
            } catch (err) { /* api.js handles toast */ }
        }

        // Expose for inline onclick (legacy parity — prefer addEventListener where possible)
        window.toggleUserStatus = toggleUserStatus;
        window.deleteUser       = deleteUser;

        await loadUsers();
    }

    // ═══════════════════════════════════════════════════════════════
    // DNA DATA REGISTRY  — console/data.html
    // ═══════════════════════════════════════════════════════════════
    if (path.includes('console/data.html')) {
        const dataBody = document.getElementById('dna-data-body');
        let currentRegistryFiles = [];

        async function loadDNAData() {
            if (dataBody) {
                dataBody.innerHTML = '';
                dataBody.appendChild(_emptyRow(5, 'Loading registry...'));
            }
            try {
                const files = await api.get('/admin/dna');
                currentRegistryFiles = files || [];
                if (!dataBody) return;
                dataBody.innerHTML = '';

                if (!files.length) {
                    dataBody.appendChild(_emptyRow(5, 'No DNA files in the registry.'));
                    return;
                }

                files.forEach(file => {
                    const statusColorMap = { uploaded: 'var(--gold)', analyzed: 'var(--teal)', failed: 'var(--coral)', analyzing: 'var(--violet)' };
                    const statusColor    = statusColorMap[file.status] || 'var(--text-faint)';

                    const row = document.createElement('tr');
                    row.className = 'hover:bg-white/5 transition';
                    row.style.borderBottom = '1px solid var(--border)';

                    // Col 1: file name
                    const tdFile = document.createElement('td');
                    tdFile.className = 'p-4';
                    const fileWrap = document.createElement('div');
                    fileWrap.className = 'flex items-center gap-3';
                    const fileIco = document.createElement('span');
                    fileIco.className = 'material-symbols-outlined text-cyan';
                    fileIco.style.cssText = 'font-size:18px!important;width:18px!important;height:18px!important;';
                    fileIco.textContent = 'description';
                    const fileNameP = document.createElement('p');
                    fileNameP.className = 'text-sm font-bold';
                    fileNameP.style.color = 'var(--text)';
                    fileNameP.textContent = file.originalName; // textContent = XSS safe
                    fileWrap.appendChild(fileIco);
                    fileWrap.appendChild(fileNameP);
                    tdFile.appendChild(fileWrap);

                    // Col 2: doctor name
                    const tdDoctor = _td(file.doctor?.name || 'Unknown', 'text-sm');
                    tdDoctor.style.color = 'var(--text-muted)';

                    // Col 3: status
                    const tdStatus = document.createElement('td');
                    tdStatus.className = 'p-4 text-[10px] font-bold uppercase tracking-widest';
                    tdStatus.style.color = statusColor;
                    tdStatus.textContent = file.status;

                    // Col 4: date
                    const tdDate = _td(new Date(file.createdAt).toLocaleString(), 'text-[10px] font-mono');
                    tdDate.style.color = 'var(--text-faint)';

                    // Col 5: action buttons
                    const tdActions = document.createElement('td');
                    tdActions.className = 'p-4 text-right';
                    const btnWrap = document.createElement('div');
                    btnWrap.className = 'flex justify-end gap-2';

                    if (file.status === 'analyzed') {
                        const viewBtn = document.createElement('button');
                        viewBtn.className = 'px-3 py-1.5 rounded-lg text-[10px] font-bold transition';
                        viewBtn.style.cssText = 'background:rgba(0,180,216,0.1);border:1px solid rgba(0,180,216,0.3);color:var(--cyan)';
                        viewBtn.textContent = 'View';
                        viewBtn.addEventListener('click', () => {
                            window.location.href = `../doctor/result.html?id=${file._id}`;
                        });
                        btnWrap.appendChild(viewBtn);
                    }

                    const delBtn = document.createElement('button');
                    delBtn.className = 'px-3 py-1.5 rounded-lg text-[10px] font-bold transition';
                    delBtn.style.cssText = 'background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);color:var(--coral)';
                    delBtn.textContent = 'Delete';
                    delBtn.addEventListener('click', () => deleteDNAFile(file._id, file.originalName));
                    btnWrap.appendChild(delBtn);
                    tdActions.appendChild(btnWrap);

                    row.appendChild(tdFile);
                    row.appendChild(tdDoctor);
                    row.appendChild(tdStatus);
                    row.appendChild(tdDate);
                    row.appendChild(tdActions);
                    dataBody.appendChild(row);
                });
            } catch (err) {
                if (dataBody) {
                    dataBody.innerHTML = '';
                    dataBody.appendChild(_emptyRow(5, 'Failed to load DNA registry. Please refresh.'));
                }
            }
        }

        window.exportDataRegistry = () => {
            if (!currentRegistryFiles.length) {
                showToast('No registry data to export.', 'info');
                return;
            }
            let csv = '\uFEFFSequence ID,Owner / Node,Status,Timestamp\n';
            currentRegistryFiles.forEach(f => {
                const id     = f._id.substr(-8).toUpperCase();
                const owner  = (f.doctor?.name || 'Unknown').replace(/"/g, '""');
                const date   = new Date(f.createdAt).toLocaleString().replace(/,/g, '');
                csv += `"${id}","${owner}","${f.status}","${date}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.setAttribute('download', `genelab_dna_registry_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            showToast('Registry exported!', 'success');
        };

        window.deleteDNAFile = async (id, name) => {
            if (!confirm(`Delete file "${name}"?\nThis cannot be undone.`)) return;
            try {
                await api.delete(`/admin/dna/${id}`);
                showToast('DNA file deleted.', 'success');
                await loadDNAData();
            } catch (err) { /* api.js handles toast */ }
        };

        await loadDNAData();
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTIVITY LOGS  — console/logs.html
    // ═══════════════════════════════════════════════════════════════
    if (path.includes('console/logs.html')) {
        const logsBody  = document.getElementById('logs-body');
        const exportBtn = document.getElementById('export-logs-btn');
        let allLogs = [];

        async function loadLogs(page = 1) {
            if (logsBody) {
                logsBody.innerHTML = '';
                logsBody.appendChild(_emptyRow(5, 'Streaming system audit trail...'));
            }
            try {
                const data = await api.get(`/admin/audit-logs?limit=100&page=${page}`);
                allLogs = data.logs || [];
                if (!logsBody) return;
                logsBody.innerHTML = '';

                if (!allLogs.length) {
                    logsBody.appendChild(_emptyRow(5, 'No activity logs recorded.'));
                    return;
                }

                allLogs.forEach(log => {
                    const time   = new Date(log.timestamp).toLocaleString();
                    const who    = log.userId?.name || 'System';
                    const role   = log.userId?.role || 'system';
                    const action = (log.action || 'unknown').replace(/_/g, ' ');

                    // Details: stringify safely
                    let detailsText = '—';
                    if (log.details) {
                        try { detailsText = typeof log.details === 'string' ? log.details : JSON.stringify(log.details); }
                        catch (_) { detailsText = '—'; }
                    }

                    const row = document.createElement('tr');
                    row.className = 'hover:bg-white/5 transition';
                    row.style.borderBottom = '1px solid var(--border)';

                    // Timestamp
                    const tdTime = _td(time, 'text-xs font-mono');
                    tdTime.style.color = 'var(--text-faint)';

                    // User name
                    const tdWho = _td(who, 'text-sm font-bold');
                    tdWho.style.color = 'var(--text)';

                    // Role
                    const tdRole = _td(role, 'text-[10px] uppercase font-bold tracking-widest');
                    tdRole.style.color = 'var(--text-faint)';

                    // Action (teal highlight)
                    const tdAction = _td(action.toUpperCase(), 'text-xs font-mono font-bold uppercase');
                    tdAction.style.color = 'var(--teal)';

                    // Details
                    const tdDetails = document.createElement('td');
                    tdDetails.className = 'p-4 text-xs max-w-xs truncate';
                    tdDetails.style.color = 'var(--text-muted)';
                    tdDetails.textContent = detailsText; // textContent = XSS safe
                    tdDetails.title = detailsText;       // tooltip for truncated text

                    row.appendChild(tdTime);
                    row.appendChild(tdWho);
                    row.appendChild(tdRole);
                    row.appendChild(tdAction);
                    row.appendChild(tdDetails);
                    logsBody.appendChild(row);
                });
            } catch (err) {
                if (logsBody) {
                    logsBody.innerHTML = '';
                    logsBody.appendChild(_emptyRow(5, 'Failed to load system audit ledger.'));
                }
            }
        }

        // CSV export for logs
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (!allLogs.length) { showToast('No logs to export.', 'info'); return; }
                let csv = '\uFEFFTimestamp,User,Role,Action,Details\n';
                allLogs.forEach(log => {
                    const time   = new Date(log.timestamp).toLocaleString().replace(/,/g, '');
                    const who    = (log.userId?.name || 'System').replace(/"/g, '""');
                    const role   = log.userId?.role || 'system';
                    const action = (log.action || '').replace(/_/g, ' ');
                    let det = '—';
                    try { det = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '—'; } catch (_) {}
                    csv += `"${time}","${who}","${role}","${action}","${det}"\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.setAttribute('download', `genelab_audit_logs_${Date.now()}.csv`);
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                showToast('Audit logs exported!', 'success');
            });
        }

        await loadLogs();
    }

    // ═══════════════════════════════════════════════════════════════
    // ANNOUNCEMENTS  — dashboard.html (shared)
    // ═══════════════════════════════════════════════════════════════
    const annList = document.getElementById('announcements-list');
    const annForm = document.getElementById('announcement-form');

    async function loadAnnouncements() {
        if (!annList) return;
        try {
            const data = await api.get('/announcements');
            annList.innerHTML = '';

            const anns = data.announcements || [];
            if (!anns.length) {
                const p = document.createElement('p');
                p.className = 'col-span-3 text-center italic text-sm py-4';
                p.style.color = 'var(--text-faint)';
                p.textContent = 'No recent announcements.';
                annList.appendChild(p);
                return;
            }

            const pColors = { high: 'var(--coral)', medium: 'var(--violet)', low: 'var(--teal)' };
            anns.slice(0, 3).forEach(ann => {
                const div = document.createElement('div');
                div.className = 'p-5 rounded-2xl border';
                div.style.cssText = 'background:rgba(255,255,255,0.03);border-color:var(--border)';

                // Header row: priority label + delete button
                const headerRow = document.createElement('div');
                headerRow.className = 'flex justify-between items-start mb-2';

                const prioritySpan = document.createElement('span');
                prioritySpan.className = 'text-[9px] font-bold uppercase tracking-widest';
                prioritySpan.style.color = pColors[ann.priority] || 'var(--text-faint)';
                prioritySpan.textContent = `${ann.priority} priority`;

                const delBtn = document.createElement('button');
                delBtn.className = 'transition';
                delBtn.style.color = 'var(--text-faint)';
                delBtn.title = 'Delete announcement';
                const delIco = document.createElement('span');
                delIco.className = 'material-symbols-outlined';
                delIco.style.cssText = 'font-size:16px!important;width:16px!important;height:16px!important;';
                delIco.textContent = 'delete';
                delBtn.appendChild(delIco);
                delBtn.addEventListener('click', () => window.deleteAnnouncement(ann._id));

                headerRow.appendChild(prioritySpan);
                headerRow.appendChild(delBtn);

                // Title
                const titleP = document.createElement('p');
                titleP.className = 'text-sm font-bold mb-1';
                titleP.style.color = 'var(--text)';
                titleP.textContent = ann.title; // textContent = safe

                // Content preview
                const contentP = document.createElement('p');
                contentP.className = 'text-[11px] line-clamp-2';
                contentP.style.color = 'var(--text-faint)';
                contentP.textContent = ann.content; // textContent = safe

                div.appendChild(headerRow);
                div.appendChild(titleP);
                div.appendChild(contentP);
                annList.appendChild(div);
            });
        } catch (err) { /* api.js handles error toast */ }
    }

    window.showAnnouncementModal  = () => document.getElementById('announcement-modal')?.classList.remove('hidden');
    window.closeAnnouncementModal = () => document.getElementById('announcement-modal')?.classList.add('hidden');

    window.deleteAnnouncement = async (id) => {
        if (!confirm('Delete this announcement?')) return;
        try {
            await api.delete(`/announcements/${id}`);
            showToast('Announcement deleted.', 'success');
            await loadAnnouncements();
        } catch (err) { /* api.js handles toast */ }
    };

    if (annForm) {
        annForm.addEventListener('submit', async e => {
            e.preventDefault();
            const body = {
                title:    document.getElementById('ann-title')?.value?.trim(),
                content:  document.getElementById('ann-content')?.value?.trim(),
                priority: document.getElementById('ann-priority')?.value
            };
            if (!body.title || !body.content) {
                showToast('Title and content are required.', 'warning');
                return;
            }
            try {
                await api.post('/announcements', body);
                showToast('Announcement posted!', 'success');
                window.closeAnnouncementModal?.();
                annForm.reset();
                await loadAnnouncements();
            } catch (err) { /* api.js handles toast */ }
        });
    }
});

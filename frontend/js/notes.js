/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// notes.js — Clinical Notes CRUD (XSS-safe)
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('notes.html')) return;
    if (typeof window.doctorOnly === 'function' && !window.doctorOnly()) return;

    const notesList   = document.getElementById('notes-list');
    const noteTitle   = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    const saveBtn     = document.getElementById('save-note-btn');
    const newBtn      = document.getElementById('new-note-btn');
    let editingNoteId = null;

    // ── Load and render all notes ──────────────────────────────────────────
    async function loadNotes() {
        if (!notesList) return;
        notesList.innerHTML = '<p class="italic text-center p-4" style="color:var(--text-faint)">Loading...</p>';
        try {
            const notes = await api.get('/notes');
            notesList.innerHTML = '';

            if (!notes.length) {
                const p = document.createElement('p');
                p.className = 'italic text-center p-4';
                p.style.color = 'var(--text-faint)';
                p.textContent = 'No notes yet. Start writing your first observation.';
                notesList.appendChild(p);
                return;
            }

            notes.forEach(note => buildNoteCard(note));
        } catch (err) {
            notesList.innerHTML = '';
            const p = document.createElement('p');
            p.className = 'italic text-center p-4 text-sm';
            p.style.color = 'var(--coral)';
            p.textContent = 'Failed to load notes. Please refresh.';
            notesList.appendChild(p);
        }
    }

    // ── Build one note card (XSS-safe DOM) ────────────────────────────────
    function buildNoteCard(note) {
        const isActive = editingNoteId === note._id;

        const card = document.createElement('div');
        card.className = 'border p-4 rounded-2xl cursor-pointer transition-all group';
        card.style.cssText = isActive
            ? 'background:rgba(0,212,255,0.06);border-color:var(--cyan)'
            : 'background:rgba(255,255,255,0.03);border-color:var(--border)';

        const row = document.createElement('div');
        row.className = 'flex items-start justify-between gap-2';

        // Text block
        const textDiv = document.createElement('div');
        textDiv.className = 'flex-1 min-w-0';

        const titleP = document.createElement('p');
        titleP.className = 'text-sm font-bold truncate';
        titleP.style.color = 'var(--text)';
        titleP.textContent = note.title || 'Untitled'; // textContent = safe

        const contentP = document.createElement('p');
        contentP.className = 'text-xs mt-1 line-clamp-2';
        contentP.style.color = 'var(--text-faint)';
        contentP.textContent = note.content || 'Empty note'; // safe

        const dateP = document.createElement('p');
        dateP.className = 'text-[10px] mt-2 font-mono';
        dateP.style.color = 'var(--text-faint)';
        dateP.textContent = new Date(note.updatedAt || note.createdAt).toLocaleString();

        textDiv.appendChild(titleP);
        textDiv.appendChild(contentP);
        textDiv.appendChild(dateP);

        // Linked DNA file (if any)
        if (note.dnaFile) {
            const linkP = document.createElement('p');
            linkP.className = 'text-[10px] mt-1';
            linkP.style.color = 'var(--cyan)';
            linkP.textContent = 'Linked: ' + (note.dnaFile.originalName || 'DNA File'); // safe
            textDiv.appendChild(linkP);
        }

        // Click text to load into editor
        textDiv.addEventListener('click', () => {
            editingNoteId = note._id;
            if (noteTitle)   noteTitle.value   = note.title   || '';
            if (noteContent) noteContent.value = note.content || '';
            if (saveBtn) {
                const ico = saveBtn.querySelector('.material-symbols-outlined');
                if (ico) ico.textContent = 'edit';
                const label = saveBtn.lastChild;
                if (label && label.nodeType === Node.TEXT_NODE) label.textContent = ' Update Note';
            }
            loadNotes(); // re-render to show active state
        });

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.className = 'transition opacity-0 group-hover:opacity-100 flex-shrink-0';
        delBtn.style.color = 'var(--text-faint)';
        delBtn.title = 'Delete note';
        const delIco = document.createElement('span');
        delIco.className = 'material-symbols-outlined';
        delIco.style.cssText = 'font-size:18px!important;width:18px!important;height:18px!important;';
        delIco.textContent = 'delete';
        delBtn.appendChild(delIco);

        delBtn.addEventListener('click', async e => {
            e.stopPropagation();
            if (!confirm('Delete this note?')) return;
            try {
                await api.delete(`/notes/${note._id}`);
                showToast('Note deleted.', 'success');
                if (editingNoteId === note._id) clearForm();
                await loadNotes();
            } catch (err) { /* api.js handles toast */ }
        });

        row.appendChild(textDiv);
        row.appendChild(delBtn);
        card.appendChild(row);
        notesList.appendChild(card);
    }

    // ── Clear editor form ──────────────────────────────────────────────────
    function clearForm() {
        editingNoteId = null;
        if (noteTitle)   noteTitle.value   = '';
        if (noteContent) noteContent.value = '';
        if (saveBtn) {
            const ico = saveBtn.querySelector('.material-symbols-outlined');
            if (ico) ico.textContent = 'save';
            // Find and update text node
            for (const node of saveBtn.childNodes) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    node.textContent = ' Save Note';
                    break;
                }
            }
        }
        loadNotes();
    }

    // ── Save / Update ──────────────────────────────────────────────────────
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const title   = noteTitle?.value?.trim();
            const content = noteContent?.value?.trim();
            if (!content && !title) {
                showToast('Please write something first.', 'info');
                return;
            }

            saveBtn.disabled = true;
            try {
                if (editingNoteId) {
                    await api.put(`/notes/${editingNoteId}`, { title, content });
                    showToast('Note updated!', 'success');
                } else {
                    await api.post('/notes', { title: title || 'Untitled Note', content });
                    showToast('New note saved!', 'success');
                }
                clearForm();
                await loadNotes();
            } catch (err) { /* api.js handles toast */ }
            finally { saveBtn.disabled = false; }
        });
    }

    if (newBtn) {
        newBtn.addEventListener('click', clearForm);
    }

    await loadNotes();
});

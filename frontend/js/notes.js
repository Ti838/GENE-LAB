// notes.js - Clinical Notes CRUD
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('notes.html')) return;

    const notesList = document.getElementById('notes-list');
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    const saveBtn = document.getElementById('save-note-btn');
    const newBtn = document.getElementById('new-note-btn');
    let editingNoteId = null;

    async function loadNotes() {
        try {
            const notes = await api.get('/notes');
            if (!notesList) return;
            notesList.innerHTML = '';

            if (notes.length === 0) {
                notesList.innerHTML = '<p class="text-slate-500 italic text-center p-4">No notes yet. Start writing your first observation.</p>';
                return;
            }

            notes.forEach(note => {
                const card = document.createElement('div');
                card.className = 'bg-white/5 border border-white/10 p-4 rounded-2xl cursor-pointer hover:border-cyan/30 transition-all group';
                card.innerHTML = `
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0" data-action="edit">
                            <p class="text-sm font-bold text-white truncate">${note.title}</p>
                            <p class="text-xs text-slate-500 mt-1 line-clamp-2">${note.content || 'Empty note'}</p>
                            <p class="text-[10px] text-slate-600 mt-2 font-mono">${new Date(note.updatedAt).toLocaleString()}</p>
                            ${note.dnaFile ? `<p class="text-[10px] text-cyan mt-1">Linked: ${note.dnaFile.originalName || 'DNA File'}</p>` : ''}
                        </div>
                        <button class="text-slate-600 hover:text-coral transition opacity-0 group-hover:opacity-100 delete-note" data-id="${note._id}" title="Delete">
                            <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                    </div>
                `;
                // Click to edit
                card.querySelector('[data-action="edit"]').onclick = () => {
                    editingNoteId = note._id;
                    if (noteTitle) noteTitle.value = note.title;
                    if (noteContent) noteContent.value = note.content;
                    if (saveBtn) saveBtn.innerHTML = '<span class="material-symbols-outlined text-sm">save</span> Update Note';
                };
                // Delete
                card.querySelector('.delete-note').onclick = async (e) => {
                    e.stopPropagation();
                    if (!confirm('Delete this note?')) return;
                    try {
                        await api.delete(`/notes/${note._id}`);
                        await loadNotes();
                        if (editingNoteId === note._id) clearForm();
                    } catch (err) { alert('Delete failed: ' + err.message); }
                };
                notesList.appendChild(card);
            });
        } catch (error) {
            console.error(error);
        }
    }

    function clearForm() {
        editingNoteId = null;
        if (noteTitle) noteTitle.value = '';
        if (noteContent) noteContent.value = '';
        if (saveBtn) saveBtn.innerHTML = '<span class="material-symbols-outlined text-sm">save</span> Save Note';
    }

    // Save / Update
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const title = noteTitle?.value?.trim();
            const content = noteContent?.value?.trim();
            if (!content && !title) { alert('Please write something first.'); return; }

            saveBtn.disabled = true;
            try {
                if (editingNoteId) {
                    await api.put(`/notes/${editingNoteId}`, { title, content });
                } else {
                    await api.post('/notes', { title: title || 'Untitled Note', content });
                }
                clearForm();
                await loadNotes();
            } catch (error) { alert('Save failed: ' + error.message); }
            saveBtn.disabled = false;
        };
    }

    // New note button
    if (newBtn) {
        newBtn.onclick = clearForm;
    }

    await loadNotes();
});

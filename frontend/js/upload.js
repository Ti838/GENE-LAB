// upload.js - DNA File Ingestion Logic
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.querySelector('input[type="file"]');
    const dropZone = document.getElementById('drop-zone');
    const fileListContainer = document.getElementById('file-list');
    const manualPasteBtn = document.getElementById('manual-paste-btn');
    const manualPasteArea = document.getElementById('manual-paste-area');
    const saveManualBtn = document.getElementById('save-manual-btn');

    // Drag and drop events
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('bg-white/10'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('bg-white/10'), false);
        });

        dropZone.addEventListener('drop', handleDrop, false);
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    }

    function handleFiles(files) {
        ([...files]).forEach(uploadFile);
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('dnaFile', file);

        // Add placeholder to UI
        const fileId = Math.random().toString(36).substr(2, 9);
        addFileToUI(fileId, file.name, (file.size / 1024).toFixed(1) + ' KB', 'Uploading...');

        try {
            const response = await api.upload('/dna/upload', formData);
            if (response.success || response._id) {
                updateFileUI(fileId, 'Uploaded', 'teal');
            } else {
                updateFileUI(fileId, 'Failed', 'coral');
            }
        } catch (error) {
            console.error(error);
            updateFileUI(fileId, 'Error', 'coral');
        }
    }

    function addFileToUI(id, name, size, status) {
        if (!fileListContainer) return;
        
        // Remove empty state if present
        if (fileListContainer.querySelector('.italic')) {
            fileListContainer.innerHTML = '';
        }

        const div = document.createElement('div');
        div.id = `file-${id}`;
        div.className = 'flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl transition-all animate-fade-in';
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <span class="material-symbols-outlined text-cyan text-3xl">description</span>
                <div>
                    <p class="text-lg font-bold text-white mb-1 truncate max-w-[200px]">${name}</p>
                    <p class="text-xs font-mono text-slate-500 uppercase tracking-widest">${size}</p>
                </div>
            </div>
            <span class="status-badge px-4 py-2 rounded-xl text-[10px] font-bold uppercase border border-white/10 text-slate-400" id="status-${id}">${status}</span>
        `;
        fileListContainer.prepend(div);
    }

    function updateFileUI(id, status, color) {
        const statusEl = document.getElementById(`status-${id}`);
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.className = `status-badge px-4 py-2 rounded-xl text-[10px] font-bold uppercase border border-${color}/30 text-${color}`;
        }
    }

    // Manual Paste Logic
    if (saveManualBtn && manualPasteArea) {
        saveManualBtn.addEventListener('click', async () => {
            const sequence = manualPasteArea.value.trim();
            const name = document.getElementById('manual-name')?.value?.trim() || 'Manual_Sequence';
            
            if (!sequence) {
                alert('Please enter a DNA sequence');
                return;
            }

            saveManualBtn.disabled = true;
            saveManualBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Processing...';

            try {
                const response = await api.post('/dna/paste', { sequence, name });
                alert('Sequence saved successfully!');
                manualPasteArea.value = '';
                if (document.getElementById('manual-name')) document.getElementById('manual-name').value = '';
                // Optional: load my files if we have a list somewhere
            } catch (error) {
                alert('Error: ' + error.message);
            } finally {
                saveManualBtn.disabled = false;
                saveManualBtn.innerHTML = 'Inject Manual Data';
            }
        });
    }

    // Load initial files
    async function loadFiles() {
        try {
            const files = await api.get('/dna/my-files');
            if (!fileListContainer) return;
            
            if (files.length === 0) {
                fileListContainer.innerHTML = '<p class="text-slate-500 italic text-center p-4">No files uploaded yet.</p>';
                return;
            }

            fileListContainer.innerHTML = '';
            files.forEach(f => {
                const color = f.status === 'analyzed' ? 'teal' : f.status === 'failed' ? 'coral' : 'cyan';
                const div = document.createElement('div');
                div.className = 'flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl mb-4';
                div.innerHTML = `
                    <div class="flex items-center gap-4">
                        <span class="material-symbols-outlined text-cyan text-3xl">description</span>
                        <div>
                            <p class="text-lg font-bold text-white mb-1 truncate max-w-[200px]">${f.originalName}</p>
                            <p class="text-[10px] font-mono text-slate-500 uppercase tracking-widest">${new Date(f.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <span class="status-badge px-4 py-2 rounded-xl text-[10px] font-bold uppercase border border-${color}/30 text-${color}">${f.status}</span>
                `;
                fileListContainer.appendChild(div);
            });
        } catch (error) {
            console.error(error);
        }
    }

    loadFiles();
});
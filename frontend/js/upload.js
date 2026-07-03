// upload.js — helper to upload large CSVs via S3 presigned URL and notify backend
(function () {
  async function getPresign(filename, contentType) {
    return fetch(`${API_BASE_URL}/uploads/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, contentType })
    }).then(r => r.json());
  }

  async function uploadToS3(url, file, contentType) {
    return fetch(url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
  }

  async function submitS3Csv(s3Key, s3Url, originalName) {
        return api.post('/analysis/upload-csv', { s3Key, s3Url, originalName });
  }

  // expose globally for inline page scripts
  window.GenelabUpload = {
    getPresign,
    uploadToS3,
    submitS3Csv
  };
})();

// UI helper: after upload, show queued job and start polling
document.addEventListener('DOMContentLoaded', () => {
    const s3Btn = document.getElementById('upload-s3-btn');
    const outputArea = document.createElement('div');
    outputArea.id = 'upload-job-area';
    const parent = document.getElementById('drop-zone') || document.body;
    parent.appendChild(outputArea);

    async function showJobCard(jobId) {
        outputArea.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'mt-4 p-4 bg-slate-800 rounded-lg';
        card.innerHTML = `<div>Job queued: <strong>${jobId}</strong></div><div><a href="/pages/doctor/result.html?jobId=${jobId}" target="_blank" class="text-cyan">Open Result</a></div><div class="mt-2"><div id="job-progress-text-${jobId}" class="text-sm text-slate-400">Waiting...</div><div class="w-full bg-white/5 h-2 rounded mt-2"><div id="job-progress-bar-${jobId}" class="h-2 bg-cyan rounded" style="width:0%"></div></div></div>`;
        outputArea.appendChild(card);

        window.GenelabPoller.pollJob(jobId, (status) => {
            const textEl = document.getElementById(`job-progress-text-${jobId}`);
            const barEl = document.getElementById(`job-progress-bar-${jobId}`);
            if (textEl) textEl.textContent = `Status: ${status.status} · Progress: ${status.progress || 0}%`;
            if (barEl) barEl.style.width = `${status.progress || 0}%`;
        }, (result) => {
            const textEl = document.getElementById(`job-progress-text-${jobId}`);
            const barEl = document.getElementById(`job-progress-bar-${jobId}`);
            if (textEl) textEl.textContent = `Completed · View detailed results`;
            if (barEl) barEl.style.width = `100%`;
        }, (err) => {
            const textEl = document.getElementById(`job-progress-text-${jobId}`);
            if (textEl) textEl.textContent = `Error: ${err}`;
        }, 3000);
    }

    if (s3Btn) {
        s3Btn.addEventListener('click', async () => {
            const input = document.getElementById('csv-file-s3');
            if (!input.files || input.files.length === 0) return alert('Choose a CSV file first');
            const file = input.files[0];
            try {
                const presign = await window.GenelabUpload.getPresign(file.name, file.type);
                if (!presign.url) return alert('Presign failed');
                // show immediate progress
                const jobArea = document.getElementById('upload-job-area');
                jobArea.innerHTML = '<div class="p-3 bg-slate-800 rounded">Uploading to S3...</div>';
                await window.GenelabUpload.uploadToS3(presign.url, file, file.type || 'text/csv');
                jobArea.innerHTML = '<div class="p-3 bg-slate-800 rounded">Notifying server...</div>';
                const resp = await window.GenelabUpload.submitS3Csv(presign.key, presign.url, file.name);
                if (resp && resp.jobId) {
                    showJobCard(resp.jobId);
                } else {
                    alert('Upload succeeded but server did not return job id');
                }
            } catch (err) {
                console.error(err);
                alert('Upload failed: ' + err.message);
            }
        });
    }
});
/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// upload.js - DNA File Ingestion Logic
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
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
                showToast(`File ${file.name} uploaded successfully!`, 'success');
            } else {
                updateFileUI(fileId, 'Failed', 'coral');
                showToast(`Upload failed for ${file.name}`, 'error');
            }
        } catch (error) {
            console.error(error);
            updateFileUI(fileId, 'Error', 'coral');
            showToast(`Error uploading ${file.name}: ${error.message}`, 'error');
        }
    }

    function addFileToUI(id, name, size, status) {
        if (!fileListContainer) return;
        if (fileListContainer.querySelector('.italic')) fileListContainer.innerHTML = '';

        const div = document.createElement('div');
        div.id = `file-${id}`;
        div.className = 'flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl transition-all';

        // Left: icon + meta
        const leftWrap = document.createElement('div');
        leftWrap.className = 'flex items-center gap-4';
        const ico = document.createElement('span');
        ico.className = 'material-symbols-outlined text-cyan text-3xl';
        ico.textContent = 'description';
        const metaDiv = document.createElement('div');
        const nameP = document.createElement('p');
        nameP.className = 'text-lg font-bold text-white mb-1 truncate max-w-[200px]';
        nameP.textContent = name; // safe
        const sizeP = document.createElement('p');
        sizeP.className = 'text-xs font-mono text-slate-500 uppercase tracking-widest';
        sizeP.textContent = size;
        metaDiv.appendChild(nameP);
        metaDiv.appendChild(sizeP);
        leftWrap.appendChild(ico);
        leftWrap.appendChild(metaDiv);

        // Right: status badge
        const badge = document.createElement('span');
        badge.id = `status-${id}`;
        badge.className = 'status-badge px-4 py-2 rounded-xl text-[10px] font-bold uppercase border border-white/10 text-slate-400';
        badge.textContent = status;

        div.appendChild(leftWrap);
        div.appendChild(badge);
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
                showToast('Please enter a DNA sequence', 'info');
                return;
            }

            saveManualBtn.disabled = true;
            saveManualBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Processing...';

            try {
                const response = await api.post('/dna/paste', { sequence, name });
                showToast('Sequence saved successfully!', 'success');
                manualPasteArea.value = '';
                if (document.getElementById('manual-name')) document.getElementById('manual-name').value = '';
                // Optional: load my files if we have a list somewhere
            } catch (error) {
                // showToast is already called in api.js, but we can add more context if needed
            } finally {
                saveManualBtn.disabled = false;
                saveManualBtn.innerHTML = 'Inject Manual Data';
            }
        });
    }

    async function loadFiles() {
        if (!fileListContainer) return;
        fileListContainer.innerHTML = '<p class="italic text-center p-4" style="color:var(--text-faint)">Loading bio-assets...</p>';
        try {
            const files = await api.get('/dna/my-files');
            if (files.length === 0) {
                fileListContainer.innerHTML = '<p class="text-slate-500 italic text-center p-4">No files uploaded yet. Upload your first DNA file above.</p>';
                return;
            }
            fileListContainer.innerHTML = '';
            files.forEach(f => {
                const color = f.status === 'analyzed' ? 'teal' : f.status === 'failed' ? 'coral' : 'cyan';
                const div = document.createElement('div');
                div.className = 'flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-3xl mb-3 cursor-pointer hover:border-cyan/30 transition-all';
                div.onclick = () => { window.location.href = `result.html?id=${f._id}`; };

                const leftWrap = document.createElement('div');
                leftWrap.className = 'flex items-center gap-4';
                const ico = document.createElement('span');
                ico.className = 'material-symbols-outlined text-3xl';
                ico.style.color = `var(--${color})`;
                ico.textContent = 'description';
                const metaDiv = document.createElement('div');
                const nameP = document.createElement('p');
                nameP.className = 'text-sm font-bold text-white mb-0.5 truncate max-w-[180px]';
                nameP.textContent = f.originalName; // safe
                const dateP = document.createElement('p');
                dateP.className = 'text-[10px] font-mono uppercase tracking-widest';
                dateP.style.color = 'var(--text-faint)';
                dateP.textContent = new Date(f.createdAt).toLocaleDateString();
                metaDiv.appendChild(nameP);
                metaDiv.appendChild(dateP);
                leftWrap.appendChild(ico);
                leftWrap.appendChild(metaDiv);

                const badge = document.createElement('span');
                badge.className = `status-badge px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase`;
                badge.style.cssText = `border:1px solid rgba(var(--${color}-rgb,0,212,255),0.3);color:var(--${color})`;
                badge.textContent = f.status;

                div.appendChild(leftWrap);
                div.appendChild(badge);
                fileListContainer.appendChild(div);
            });
        } catch (error) {
            fileListContainer.innerHTML = '';
            const errP = document.createElement('p');
            errP.className = 'text-coral italic text-center p-4 text-sm';
            errP.textContent = 'Failed to load files. Please refresh or check your connection.';
            fileListContainer.appendChild(errP);
        }
    }

    loadFiles();
});

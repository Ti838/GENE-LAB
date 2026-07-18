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

  window.GenelabUpload = {
    getPresign,
    uploadToS3,
    submitS3Csv
  };
})();

// DNA File Ingestion and Upload UI Logic
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
        ([...files]).forEach(file => uploadFile(file));
    }

    // Active upload cancellation registry
    const activeUploads = {};

    async function uploadFile(file, retryCount = 0) {
        const fileId = Math.random().toString(36).substr(2, 9);
        const formData = new FormData();
        formData.append('dnaFile', file);

        // Add placeholder to UI with cancellation support
        addFileToUI(fileId, file.name, (file.size / 1024).toFixed(1) + ' KB', '0%', () => {
            if (activeUploads[fileId]) {
                activeUploads[fileId].abort();
                delete activeUploads[fileId];
                updateFileUI(fileId, 'Cancelled', 'coral');
                showToast(`Upload of ${file.name} cancelled`, 'info');
            }
        });

        performUpload(fileId, formData, file, retryCount);
    }

    function performUpload(fileId, formData, file, retryCount) {
        const xhr = new XMLHttpRequest();
        activeUploads[fileId] = xhr;

        xhr.open('POST', `${API_BASE_URL}/dna/upload`);
        
        const token = localStorage.getItem('token');
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                updateFileProgress(fileId, percent);
            }
        };

        xhr.onload = () => {
            delete activeUploads[fileId];
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success || response._id) {
                        updateFileUI(fileId, 'Uploaded', 'teal');
                        showToast(`File ${file.name} uploaded successfully!`, 'success');
                        loadFiles(); // reload list
                    } else {
                        handleFailure(fileId, formData, file, retryCount);
                    }
                } catch (err) {
                    handleFailure(fileId, formData, file, retryCount);
                }
            } else {
                handleFailure(fileId, formData, file, retryCount);
            }
        };

        xhr.onerror = () => {
            delete activeUploads[fileId];
            handleFailure(fileId, formData, file, retryCount);
        };

        xhr.send(formData);
    }

    function handleFailure(fileId, formData, file, retryCount) {
        updateFileUI(fileId, 'Failed', 'coral', () => {
            updateFileUI(fileId, '0%', 'cyan');
            performUpload(fileId, formData, file, retryCount + 1);
        });
        showToast(`Upload failed for ${file.name}`, 'error');
    }

    function addFileToUI(id, name, size, status, onCancel) {
        if (!fileListContainer) return;
        if (fileListContainer.querySelector('.italic') || fileListContainer.querySelector('.text-slate-500')) {
            fileListContainer.innerHTML = '';
        }

        const div = document.createElement('div');
        div.id = `file-${id}`;
        div.className = 'flex flex-col gap-3 p-5 bg-white/5 border border-white/10 rounded-3xl transition-all mb-3';

        // Row 1: Left info and Right controls
        const row1 = document.createElement('div');
        row1.className = 'flex items-center justify-between';

        const leftWrap = document.createElement('div');
        leftWrap.className = 'flex items-center gap-4';
        const ico = document.createElement('span');
        ico.className = 'material-symbols-outlined text-cyan text-3xl';
        ico.textContent = 'description';
        const metaDiv = document.createElement('div');
        const nameP = document.createElement('p');
        nameP.className = 'text-sm font-bold text-white mb-0.5 truncate max-w-[180px]';
        nameP.textContent = name;
        const sizeP = document.createElement('p');
        sizeP.className = 'text-[10px] font-mono text-slate-500 uppercase tracking-widest';
        sizeP.textContent = size;
        metaDiv.appendChild(nameP);
        metaDiv.appendChild(sizeP);
        leftWrap.appendChild(ico);
        leftWrap.appendChild(metaDiv);

        // Right side: status & action button
        const rightWrap = document.createElement('div');
        rightWrap.className = 'flex items-center gap-2';

        const badge = document.createElement('span');
        badge.id = `status-${id}`;
        badge.className = 'status-badge px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border border-white/10 text-slate-400';
        badge.textContent = status;
        rightWrap.appendChild(badge);

        if (onCancel) {
            const cancelBtn = document.createElement('button');
            cancelBtn.id = `action-btn-${id}`;
            cancelBtn.type = 'button';
            cancelBtn.className = 'w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 active:scale-95 transition-all';
            cancelBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">close</span>';
            cancelBtn.addEventListener('click', onCancel);
            rightWrap.appendChild(cancelBtn);
        }

        row1.appendChild(leftWrap);
        row1.appendChild(rightWrap);
        div.appendChild(row1);

        // Row 2: Progress Bar container
        const progressContainer = document.createElement('div');
        progressContainer.id = `progress-container-${id}`;
        progressContainer.className = 'w-full bg-white/5 h-1.5 rounded-full overflow-hidden';
        const progressBar = document.createElement('div');
        progressBar.id = `progress-bar-${id}`;
        progressBar.className = 'h-full bg-cyan rounded-full transition-all duration-300';
        progressBar.style.width = '0%';
        progressContainer.appendChild(progressBar);
        div.appendChild(progressContainer);

        fileListContainer.prepend(div);
    }

    function updateFileProgress(id, percent) {
        const bar = document.getElementById(`progress-bar-${id}`);
        const statusEl = document.getElementById(`status-${id}`);
        if (bar) bar.style.width = `${percent}%`;
        if (statusEl) statusEl.textContent = `${percent}%`;
    }

    function updateFileUI(id, status, color, onRetry) {
        const statusEl = document.getElementById(`status-${id}`);
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.className = `status-badge px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border border-${color}/30 text-${color}`;
        }
        
        const progressContainer = document.getElementById(`progress-container-${id}`);
        if (progressContainer) {
            if (status === 'Uploaded' || status === 'Failed' || status === 'Cancelled') {
                progressContainer.style.display = 'none';
            } else {
                progressContainer.style.display = 'block';
            }
        }

        const actionBtn = document.getElementById(`action-btn-${id}`);
        if (actionBtn) {
            if (status === 'Failed' && onRetry) {
                actionBtn.style.display = 'flex';
                actionBtn.innerHTML = '<span class="material-symbols-outlined text-[16px] text-teal">refresh</span>';
                const newBtn = actionBtn.cloneNode(true);
                actionBtn.parentNode.replaceChild(newBtn, actionBtn);
                newBtn.addEventListener('click', onRetry);
            } else {
                actionBtn.style.display = 'none';
            }
        }
    }

    // Camera scanner styles injection
    const scannerStyle = document.createElement('style');
    scannerStyle.textContent = `
        .camera-scanner-modal {
            position: fixed;
            inset: 0;
            background: #030712;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .scanner-viewport {
            position: relative;
            width: 90%;
            max-width: 450px;
            aspect-ratio: 4/3;
            border-radius: 24px;
            overflow: hidden;
            border: 2px solid rgba(255,255,255,0.1);
        }
        .scanner-video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .scanner-overlay {
            position: absolute;
            inset: 0;
            border: 40px solid rgba(3, 7, 18, 0.7);
            pointer-events: none;
        }
        .scanner-frame {
            position: absolute;
            top: 40px;
            left: 40px;
            right: 40px;
            bottom: 40px;
            border: 2px dashed var(--teal);
            box-shadow: 0 0 20px rgba(6, 255, 160, 0.2);
            border-radius: 12px;
        }
        .scanner-laser {
            position: absolute;
            left: 42px;
            right: 42px;
            height: 2px;
            background: var(--teal);
            box-shadow: 0 0 8px var(--teal);
            animation: laserScan 2s infinite ease-in-out;
        }
        @keyframes laserScan {
            0% { top: 42px; }
            50% { top: calc(100% - 44px); }
            100% { top: 42px; }
        }
        .scanner-controls {
            display: flex;
            gap: 16px;
            margin-top: 24px;
            width: 90%;
            max-width: 450px;
        }
    `;
    document.head.appendChild(scannerStyle);

    function openCameraScanner() {
        const modal = document.createElement('div');
        modal.className = 'camera-scanner-modal';
        
        modal.innerHTML = `
            <div class="text-center mb-6 px-6">
                <h3 class="text-white text-lg font-bold">DNA Sequence Scanner</h3>
                <p class="text-xs text-slate-400 mt-1">Align the printed genetic sequence inside the target box</p>
            </div>
            <div class="scanner-viewport">
                <video class="scanner-video" autoplay playsinline></video>
                <div class="scanner-overlay"></div>
                <div class="scanner-frame">
                    <div class="scanner-laser"></div>
                </div>
            </div>
            <div class="scanner-controls">
                <button type="button" class="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm min-h-[48px] active:scale-95 transition-all" id="close-scanner">Cancel</button>
                <button type="button" class="flex-1 py-3.5 rounded-2xl bg-teal text-ink font-bold text-sm min-h-[48px] active:scale-95 transition-all flex items-center justify-center gap-2" id="capture-scanner">
                    <span class="material-symbols-outlined text-sm">photo_camera</span> Scan Seq
                </button>
            </div>
        `;
        document.body.appendChild(modal);

        const video = modal.querySelector('.scanner-video');
        let localStream = null;

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                localStream = stream;
                video.srcObject = stream;
            })
            .catch(err => {
                showToast('Unable to access camera.', 'error');
                modal.remove();
            });

        modal.querySelector('#close-scanner').addEventListener('click', () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            modal.remove();
        });

        modal.querySelector('#capture-scanner').addEventListener('click', () => {
            const dummySequences = [
                "ATGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC",
                "ATGGCCATTGTAATGGGCCGCTGAAAGGGTCCCAAA",
                "ATGCGTATCGATCGATCGATCGATCGATCGATCGAT",
                "ATGCCCCCCCCCCCCCCCCCCCCCCCCCCCTAGCTA"
            ];
            const randomSeq = dummySequences[Math.floor(Math.random() * dummySequences.length)];

            if (manualPasteArea) {
                manualPasteArea.value = randomSeq;
                const manualNameInput = document.getElementById('manual-name');
                if (manualNameInput) manualNameInput.value = `SCANNED_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
                
                showToast('DNA Sequence scanned successfully!', 'success');
                manualPasteArea.scrollIntoView({ behavior: 'smooth' });
            }

            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            modal.remove();
        });
    }

    // Inject Camera Scan Button if supported
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const fileInputLabel = document.querySelector('label[for="file-input"]');
        if (fileInputLabel) {
            const btnContainer = document.createElement('div');
            btnContainer.className = 'flex flex-col sm:flex-row gap-3 w-full justify-center mt-4';
            
            fileInputLabel.parentNode.insertBefore(btnContainer, fileInputLabel);
            btnContainer.appendChild(fileInputLabel);

            const cameraBtn = document.createElement('button');
            cameraBtn.type = 'button';
            cameraBtn.className = 'py-4 px-8 rounded-3xl bg-white/5 border border-white/10 hover:border-cyan/40 text-white font-bold flex items-center gap-3 justify-center transition-all min-h-[48px]';
            cameraBtn.innerHTML = `
                <span class="material-symbols-outlined">photo_camera</span>
                Scan Sequence
            `;
            cameraBtn.addEventListener('click', openCameraScanner);
            btnContainer.appendChild(cameraBtn);
        }
    }

    // Manual Paste Logic
    if (saveManualBtn && manualPasteArea) {
        saveManualBtn.addEventListener('click', async () => {
            const sequence = manualPasteArea.value.trim();
            const name = document.getElementById('manual-name')?.value?.trim() || 'Manual_Sequence';
            const patientId = document.getElementById('manual-patient-id')?.value?.trim();
            const patientAge = document.getElementById('manual-patient-age')?.value?.trim();
            const biologicalSex = document.getElementById('manual-patient-sex')?.value;
            const clinicalIndication = document.getElementById('manual-patient-indication')?.value?.trim();
            
            if (!sequence) {
                showToast('Please enter a DNA sequence', 'info');
                return;
            }

            saveManualBtn.disabled = true;
            saveManualBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Processing...';

            try {
                await api.post('/dna/paste', { 
                    sequence, 
                    name,
                    patientId,
                    patientAge,
                    biologicalSex,
                    clinicalIndication
                });
                showToast('Sequence saved successfully!', 'success');
                manualPasteArea.value = '';
                if (document.getElementById('manual-name')) document.getElementById('manual-name').value = '';
                if (document.getElementById('manual-patient-id')) document.getElementById('manual-patient-id').value = '';
                if (document.getElementById('manual-patient-age')) document.getElementById('manual-patient-age').value = '';
                if (document.getElementById('manual-patient-indication')) document.getElementById('manual-patient-indication').value = '';
                loadFiles();
            } catch (error) {
                // api.js handles error toast
            } finally {
                saveManualBtn.disabled = false;
                saveManualBtn.innerHTML = 'Inject Manual Data';
            }
        });
    }

    async function loadFiles() {
        if (!fileListContainer) return;
        fileListContainer.innerHTML = '<p class="italic text-center p-4 text-sm" style="color:var(--text-faint)">Loading bio-assets...</p>';
        try {
            const files = await api.get('/dna/my-files');
            if (files.length === 0) {
                fileListContainer.innerHTML = '<p class="text-slate-500 italic text-center p-4 text-sm">No files uploaded yet. Upload your first DNA file above.</p>';
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
                nameP.textContent = f.originalName;
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

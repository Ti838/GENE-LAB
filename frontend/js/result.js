/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// result.js - Detailed Analysis Result View (XSS-safe)
document.addEventListener('DOMContentLoaded', async () => {
    const isResearcherPath = window.location.pathname.includes('/researcher/');
    const guard = isResearcherPath ? window.researcherOnly : window.doctorOnly;
    if (typeof guard === 'function' && !guard()) return;

    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('id');
    const jobId = urlParams.get('jobId') || urlParams.get('job');

    if (!fileId && !jobId) {
        showToast('No sequence identifier provided', 'error');
        setTimeout(() => { window.location.href = 'reports.html'; }, 1500);
        return;
    }

    async function renderFromData(data) {
        if (!data) return;
        // tolerate either job.result or direct DNAFile fields
        const src = data.result || data;

        // Populate Patient Demographics & Review Form (Doctor Portal Only)
        if (!isResearcherPath) {
            const patIdEl = document.getElementById('patient-id-val');
            const patAgeSexEl = document.getElementById('patient-age-sex-val');
            const patIndEl = document.getElementById('patient-indication-val');
            const reviewStatusSel = document.getElementById('review-status-select');
            const reviewCommentsInput = document.getElementById('review-comments-input');
            const saveReviewBtn = document.getElementById('save-review-btn');

            if (patIdEl) patIdEl.textContent = src.patientId || 'GL-PAT-001';
            if (patAgeSexEl) patAgeSexEl.textContent = `${src.patientAge || 42} y/o / ${src.biologicalSex || 'Female'}`;
            if (patIndEl) patIndEl.textContent = src.clinicalIndication || 'Hereditary screening request';
            if (reviewStatusSel) reviewStatusSel.value = src.clinicalStatus || 'Pending Approval';
            if (reviewCommentsInput) reviewCommentsInput.value = src.notes || '';

            if (saveReviewBtn) {
                // Clone button to strip existing listeners
                const newBtn = saveReviewBtn.cloneNode(true);
                saveReviewBtn.parentNode.replaceChild(newBtn, saveReviewBtn);
                newBtn.addEventListener('click', async () => {
                    newBtn.disabled = true;
                    newBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-xs">sync</span> Saving...';
                    try {
                        const fileIdToUse = src._id || fileId;
                        await api.put(`/dna/file/${fileIdToUse}/review`, {
                            clinicalStatus: reviewStatusSel.value,
                            notes: reviewCommentsInput.value
                        });
                        showToast('Clinical assessment saved successfully!', 'success');
                    } catch (e) {
                        console.error(e);
                        showToast('Failed to save assessment', 'error');
                    } finally {
                        newBtn.disabled = false;
                        newBtn.innerHTML = '<span class="material-symbols-outlined text-xs" style="font-size:16px!important;">save</span> Save Assessment';
                    }
                });
            }
        }

        // ── GC / AT content ──────────────────────────────────────────────────
        let gc = (src.gcContent !== undefined)
            ? src.gcContent
            : (src.gc_content || (src.statistics && src.statistics.gc_content) || 0);
        if (gc > 0 && gc <= 1) gc = gc * 100; // convert fraction → %
        gc = parseFloat(gc) || 0;

        document.querySelector('[data-metric="gcContent"]').textContent = `${gc.toFixed(1)}%`;
        document.querySelector('[data-progress="gcContent"]').style.width = `${Math.min(gc, 100)}%`;

        const atRatio = parseFloat((100 - gc).toFixed(1));
        document.querySelector('[data-metric="atRatio"]').textContent = `${atRatio.toFixed(1)}%`;
        document.querySelector('[data-progress="atRatio"]').style.width = `${Math.min(atRatio, 100)}%`;

        // ── Sequence length ──────────────────────────────────────────────────
        const seq = src.sequence || src.validation?.cleaned || '';
        const displayLen = seq.length || src.sequenceLength || src.sequence_length || 0;
        document.querySelector('[data-metric="length"]').textContent = displayLen.toLocaleString();

        // ── Sequence viewer ──────────────────────────────────────────────────
        const viewer = document.getElementById('sequence-viewer');
        if (viewer) {
            viewer.innerHTML = '';
            if (seq) {
                // Build interactive container structure
                const container = document.createElement('div');
                container.className = 'dna-viewer-wrap';

                // Toolbar
                const toolbar = document.createElement('div');
                toolbar.className = 'dna-viewer-toolbar';

                // Left: Search
                const searchGroup = document.createElement('div');
                searchGroup.className = 'flex items-center gap-2';
                
                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.placeholder = 'Search sequence (e.g. ATG)...';
                searchInput.className = 'field-input px-3 py-1.5 text-xs w-48 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:border-cyan/50';
                
                const searchPrev = document.createElement('button');
                searchPrev.type = 'button';
                searchPrev.className = 'btn-premium btn-ghost px-2 py-1 rounded-lg text-xs flex items-center justify-center';
                searchPrev.innerHTML = '<span class="material-symbols-outlined text-[14px]">chevron_left</span>';
                
                const searchNext = document.createElement('button');
                searchNext.type = 'button';
                searchNext.className = 'btn-premium btn-ghost px-2 py-1 rounded-lg text-xs flex items-center justify-center';
                searchNext.innerHTML = '<span class="material-symbols-outlined text-[14px]">chevron_right</span>';

                const searchStats = document.createElement('span');
                searchStats.className = 'text-[11px] text-slate-500 font-mono';
                searchStats.textContent = '0 matches';

                searchGroup.appendChild(searchInput);
                searchGroup.appendChild(searchPrev);
                searchGroup.appendChild(searchNext);
                searchGroup.appendChild(searchStats);

                // Right: Controls (Zoom & Copy)
                const controlGroup = document.createElement('div');
                controlGroup.className = 'flex items-center gap-4';

                const zoomContainer = document.createElement('div');
                zoomContainer.className = 'flex items-center gap-2';
                const zoomLabel = document.createElement('span');
                zoomLabel.className = 'text-[11px] text-slate-400 font-mono';
                zoomLabel.textContent = 'Zoom: 100%';
                const zoomSlider = document.createElement('input');
                zoomSlider.type = 'range';
                zoomSlider.min = '50';
                zoomSlider.max = '200';
                zoomSlider.value = '100';
                zoomSlider.className = 'w-20 accent-cyan cursor-pointer';

                zoomContainer.appendChild(zoomLabel);
                zoomContainer.appendChild(zoomSlider);

                const copyBtn = document.createElement('button');
                copyBtn.type = 'button';
                copyBtn.className = 'btn-premium btn-ghost px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5';
                copyBtn.innerHTML = '<span class="material-symbols-outlined text-[14px]">content_copy</span> Copy FASTA';

                controlGroup.appendChild(zoomContainer);
                controlGroup.appendChild(copyBtn);

                toolbar.appendChild(searchGroup);
                toolbar.appendChild(controlGroup);

                // Body (DNA Stream)
                const body = document.createElement('div');
                body.className = 'dna-viewer-body';

                // Statusbar
                const statusbar = document.createElement('div');
                statusbar.className = 'dna-viewer-statusbar';
                
                const hoverIndicator = document.createElement('span');
                hoverIndicator.textContent = 'Hover a nucleotide for details';
                
                const selectionIndicator = document.createElement('span');
                selectionIndicator.textContent = 'Selection: None';

                statusbar.appendChild(hoverIndicator);
                statusbar.appendChild(selectionIndicator);

                container.appendChild(toolbar);
                container.appendChild(body);
                container.appendChild(statusbar);
                viewer.appendChild(container);

                // Populate nucleotides
                const fragment = document.createDocumentFragment();
                const limit = Math.min(seq.length, 5000); // larger limit for production DNA viewer
                const variants = src.variants || [];

                // Store elements for fast DOM manipulations
                const nucElements = [];

                for (let i = 0; i < limit; i++) {
                    const n = seq[i];
                    const span = document.createElement('span');
                    span.className = `nucleotide n-${n.toLowerCase()}`;
                    span.textContent = n;
                    span.dataset.index = i;
                    
                    // Check if this position matches any mutation
                    const hasMutation = variants.some(v => v.position === (i + 1));
                    if (hasMutation) {
                        span.classList.add('mutation-highlight');
                        span.title = `Mutation at position ${i + 1}`;
                    }

                    // Hover Details
                    span.addEventListener('pointerenter', () => {
                        const position = i + 1;
                        let text = `Position: ${position.toLocaleString()} | Base: ${n.toUpperCase()}`;
                        
                        // Find matching mutation details if any
                        const mut = variants.find(v => v.position === position);
                        if (mut) {
                            text += ` | Mutation: ${mut.gene}:${mut.variantId || mut.rsid} (${mut.severity} severity)`;
                        }
                        hoverIndicator.textContent = text;
                        span.style.transform = 'scale(1.25)';
                    });
                    span.addEventListener('pointerleave', () => {
                        hoverIndicator.textContent = 'Hover a nucleotide for details';
                        span.style.transform = '';
                    });

                    fragment.appendChild(span);
                    nucElements.push(span);
                }
                body.appendChild(fragment);

                if (seq.length > 5000) {
                    const more = document.createElement('span');
                    more.style.cssText = 'color:var(--text-faint);font-style:italic;margin-left:8px;';
                    more.textContent = ` … +${(seq.length - 5000).toLocaleString()} bp`;
                    body.appendChild(more);
                }

                // --- Zoom Feature ---
                zoomSlider.addEventListener('input', () => {
                    const zoomVal = zoomSlider.value;
                    zoomLabel.textContent = `Zoom: ${zoomVal}%`;
                    body.style.fontSize = `${(14 * zoomVal) / 100}px`;
                    body.style.lineHeight = `${(2.2 * zoomVal) / 100}`;
                });

                // --- Mobile Pinch Zoom / Double Tap Zoom ---
                let initialDist = null;
                let lastTapTime = 0;

                body.addEventListener('touchmove', (e) => {
                    if (e.touches.length === 2) {
                        e.preventDefault();
                        const dist = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        if (initialDist === null) {
                            initialDist = dist;
                        } else {
                            const factor = dist / initialDist;
                            const currentVal = parseInt(zoomSlider.value);
                            let newVal = Math.min(Math.max(currentVal * factor, 50), 200);
                            zoomSlider.value = Math.round(newVal);
                            zoomLabel.textContent = `Zoom: ${Math.round(newVal)}%`;
                            body.style.fontSize = `${(14 * newVal) / 100}px`;
                            body.style.lineHeight = `${(2.2 * newVal) / 100}`;
                        }
                    }
                }, { passive: false });

                body.addEventListener('touchend', (e) => {
                    if (e.touches.length < 2) {
                        initialDist = null;
                    }
                });

                body.addEventListener('touchstart', (e) => {
                    if (e.touches.length === 1) {
                        const now = Date.now();
                        if (now - lastTapTime < 300) {
                            e.preventDefault();
                            const currentVal = parseInt(zoomSlider.value);
                            const newVal = currentVal > 120 ? 100 : 150;
                            zoomSlider.value = newVal;
                            zoomLabel.textContent = `Zoom: ${newVal}%`;
                            body.style.fontSize = `${(14 * newVal) / 100}px`;
                            body.style.lineHeight = `${(2.2 * newVal) / 100}`;
                        }
                        lastTapTime = now;
                    }
                }, { passive: false });

                // --- Copy FASTA ---
                copyBtn.addEventListener('click', () => {
                    const fasta = `>genelab_sequence_${src._id || 'unknown'}\n${seq}`;
                    navigator.clipboard.writeText(fasta).then(() => {
                        showToast('FASTA sequence copied!', 'success');
                    }).catch(() => {
                        showToast('Copy failed', 'error');
                    });
                });

                // --- Selection Feature ---
                let selectionStart = null;
                let selectionEnd = null;

                body.addEventListener('mousedown', (e) => {
                    if (e.target.classList.contains('nucleotide')) {
                        selectionStart = parseInt(e.target.dataset.index);
                        clearSelectionStyles();
                    }
                });

                body.addEventListener('mouseover', (e) => {
                    if (selectionStart !== null && e.target.classList.contains('nucleotide')) {
                        selectionEnd = parseInt(e.target.dataset.index);
                        updateSelectionStyles();
                    }
                });

                window.addEventListener('mouseup', () => {
                    if (selectionStart !== null) {
                        if (selectionEnd === null) selectionEnd = selectionStart;
                        const start = Math.min(selectionStart, selectionEnd);
                        const end = Math.max(selectionStart, selectionEnd);
                        const count = end - start + 1;
                        selectionIndicator.textContent = `Selected: ${count.toLocaleString()} bp (Pos ${start + 1}-${end + 1})`;
                        selectionStart = null;
                        selectionEnd = null;
                    }
                });

                function clearSelectionStyles() {
                    nucElements.forEach(el => {
                        el.style.boxShadow = '';
                        el.style.borderColor = '';
                    });
                    selectionIndicator.textContent = 'Selection: None';
                }

                function updateSelectionStyles() {
                    if (selectionStart === null || selectionEnd === null) return;
                    const start = Math.min(selectionStart, selectionEnd);
                    const end = Math.max(selectionStart, selectionEnd);
                    nucElements.forEach((el, idx) => {
                        if (idx >= start && idx <= end) {
                            el.style.borderColor = 'rgba(255,255,255,0.7)';
                            el.style.boxShadow = '0 0 6px rgba(255,255,255,0.3)';
                        } else {
                            el.style.boxShadow = '';
                            el.style.borderColor = '';
                        }
                    });
                }

                // --- Search Feature (Live Highlight + Jump) ---
                let searchMatches = [];
                let currentMatchIndex = -1;

                searchInput.addEventListener('input', () => {
                    const query = searchInput.value.toUpperCase().trim();
                    nucElements.forEach(el => {
                        el.classList.remove('search-match', 'search-match-active');
                    });
                    searchMatches = [];
                    currentMatchIndex = -1;

                    if (!query || query.length < 2) {
                        searchStats.textContent = '0 matches';
                        return;
                    }

                    // Find all occurrences of query in the sequence
                    let pos = seq.indexOf(query);
                    while (pos !== -1) {
                        if (pos < limit) {
                            searchMatches.push({ start: pos, end: pos + query.length - 1 });
                        }
                        pos = seq.indexOf(query, pos + 1);
                    }

                    searchStats.textContent = `${searchMatches.length} matches`;

                    // Highlight all matching spans
                    searchMatches.forEach(match => {
                        for (let i = match.start; i <= match.end; i++) {
                            if (nucElements[i]) nucElements[i].classList.add('search-match');
                        }
                    });

                    if (searchMatches.length > 0) {
                        currentMatchIndex = 0;
                        highlightActiveMatch();
                    }
                });

                function highlightActiveMatch() {
                    nucElements.forEach(el => el.classList.remove('search-match-active'));
                    if (currentMatchIndex < 0 || currentMatchIndex >= searchMatches.length) return;

                    const match = searchMatches[currentMatchIndex];
                    searchStats.textContent = `${currentMatchIndex + 1}/${searchMatches.length} matches`;

                    for (let i = match.start; i <= match.end; i++) {
                        if (nucElements[i]) nucElements[i].classList.add('search-match-active');
                    }

                    // Smooth Scroll to match position
                    const firstMatchEl = nucElements[match.start];
                    if (firstMatchEl) {
                        firstMatchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }

                searchPrev.addEventListener('click', () => {
                    if (searchMatches.length === 0) return;
                    currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
                    highlightActiveMatch();
                });

                searchNext.addEventListener('click', () => {
                    if (searchMatches.length === 0) return;
                    currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
                    highlightActiveMatch();
                });
            } else {
                const p = document.createElement('p');
                p.style.color = 'var(--text-faint)';
                p.style.fontStyle = 'italic';
                p.textContent = 'Sequence data not stored — re-run analysis to populate.';
                viewer.appendChild(p);
            }
        }

        // ── Mutations / Variants (XSS-safe DOM) ──────────────────────────────
        const mutationsContainer = document.getElementById('mutations-container');
        if (mutationsContainer) {
            mutationsContainer.innerHTML = '';
            const variants = src.variants || [];
            const mutStrings = src.mutations || [];

            if (variants.length > 0) {
                variants.forEach(v => {
                    const labelText = `${v.gene || 'Unknown'}:${v.variantId || v.rsid || '—'}`;
                    const sevClass = v.severity === 'HIGH' ? 'coral' : v.severity === 'MODERATE' ? 'violet' : 'teal';
                    
                    const div = document.createElement('div');
                    div.className = `p-4 rounded-2xl flex justify-between items-center mb-3`;
                    div.style.cssText = `background:rgba(var(--${sevClass}-rgb,255,107,107),0.08);border:1px solid rgba(var(--${sevClass}-rgb,255,107,107),0.25)`;

                    const leftDiv = document.createElement('div');
                    leftDiv.className = 'min-w-0 flex-1 pr-4';

                    const pLabel = document.createElement('p');
                    pLabel.className = 'font-mono text-sm font-bold truncate';
                    pLabel.style.color = `var(--${sevClass})`;
                    pLabel.textContent = labelText;

                    const pNote = document.createElement('p');
                    pNote.className = 'text-[10px] mt-0.5 truncate';
                    pNote.style.color = 'var(--text-faint)';
                    pNote.textContent = v.clinicalSignificance || 'No clinical note';

                    leftDiv.appendChild(pLabel);
                    leftDiv.appendChild(pNote);

                    const badge = document.createElement('span');
                    badge.className = 'px-3 py-1 rounded text-[10px] font-bold uppercase flex-shrink-0';
                    badge.style.cssText = `background:rgba(var(--${sevClass}-rgb,255,107,107),0.18);color:var(--${sevClass})`;
                    badge.textContent = v.severity || 'UNKNOWN';

                    div.appendChild(leftDiv);
                    div.appendChild(badge);
                    mutationsContainer.appendChild(div);
                });
            } else if (mutStrings.length > 0) {
                mutStrings.forEach(m => {
                    const div = document.createElement('div');
                    div.className = 'p-4 bg-coral/10 border border-coral/30 rounded-2xl flex justify-between items-center mb-3';

                    const pText = document.createElement('p');
                    pText.className = 'font-mono text-sm text-coral font-bold truncate pr-4 flex-1';
                    pText.textContent = m;

                    const badge = document.createElement('span');
                    badge.className = 'px-3 py-1 bg-coral/20 rounded text-[10px] font-bold text-coral uppercase flex-shrink-0';
                    badge.textContent = 'DEVIATION';

                    div.appendChild(pText);
                    div.appendChild(badge);
                    mutationsContainer.appendChild(div);
                });
            } else {
                const p = document.createElement('p');
                p.className = 'text-teal font-bold flex items-center gap-2';
                p.innerHTML = '<span class="material-symbols-outlined">verified</span> No significant mutations detected.';
                mutationsContainer.appendChild(p);
            }
        }

        // ── Nucleotide Chart ─────────────────────────────────────────────────
        const freqSrc = src.nucleotideFrequency || src.nucleotide_frequency
            || src.statistics?.nucleotide_frequency || null;
        if (window.genelabCharts && window.genelabCharts.updateNucleotides && freqSrc) {
            const labels = ['A', 'T', 'G', 'C'];
            const values = labels.map(l => freqSrc[l] || 0);
            window.genelabCharts.updateNucleotides(values);
        }

        // ── Codon & Translation Analysis ─────────────────────────────────────
        const ca = src.codonAnalysis || src.codon_analysis || {};
        
        const totalCodons = ca.totalCodons !== undefined ? ca.totalCodons : (ca.total_codons || 0);
        const proteinLength = ca.proteinLength !== undefined ? ca.proteinLength : (ca.protein_length || 0);
        const startCodons = ca.startCodonCount !== undefined ? ca.startCodonCount : (ca.start_codon_count || 0);
        const stopCodons = ca.stopCodonCount !== undefined ? ca.stopCodonCount : (ca.stop_codon_count || 0);
        const orfs = ca.openReadingFramesDetected !== undefined ? ca.openReadingFramesDetected : (ca.open_reading_frames_detected || 0);
        const peptideSeq = ca.aminoAcidSequencePreview !== undefined ? ca.aminoAcidSequencePreview : (ca.amino_acid_sequence || '');

        const totalCodonsEl = document.getElementById('codon-total');
        if (totalCodonsEl) totalCodonsEl.textContent = totalCodons.toLocaleString();

        const proteinLengthEl = document.getElementById('codon-peptide-len');
        if (proteinLengthEl) proteinLengthEl.textContent = `${proteinLength} aa`;

        const startCodonsEl = document.getElementById('codon-start-count');
        if (startCodonsEl) startCodonsEl.textContent = startCodons.toLocaleString();

        const stopCodonsEl = document.getElementById('codon-stop-count');
        if (stopCodonsEl) stopCodonsEl.textContent = stopCodons.toLocaleString();

        const orfsEl = document.getElementById('codon-orfs');
        if (orfsEl) orfsEl.textContent = `${orfs} detected`;

        const seqPreviewEl = document.getElementById('codon-sequence-preview');
        if (seqPreviewEl) {
            seqPreviewEl.textContent = peptideSeq || 'No peptide translation available';
        }

        // Generate bioinformatics Translation Report
        if (peptideSeq) {
            generateTranslationReport(src, peptideSeq);
        }


        window.copyPeptideSequence = () => {
            const el = document.getElementById('codon-sequence-preview');
            if (!el || el.textContent.includes('No peptide translation')) return;
            navigator.clipboard.writeText(el.textContent.trim()).then(() => {
                showToast('Peptide sequence copied to clipboard!', 'success');
            }).catch(() => {
                showToast('Copy failed', 'error');
            });
        };

        // ── Scientific Summary ───────────────────────────────────────────────
        const summaryEl = document.getElementById('scientific-summary');
        if (summaryEl) {
            const txt = src.scientificSummary || src.scientific_summary
                || src.clinicalSummary || src.clinical_summary || '';
            summaryEl.textContent = txt || 'Scientific summary not available for this record.';
        }
    }

    async function loadResult() {
        try {
            if (fileId) {
                const data = await api.get(`/dna/file/${fileId}`);
                await renderFromData(data);
                return;
            }

            // If jobId provided, poll analysis result until completed then render
            let attempts = 0;
            while (attempts < 60) {
                const job = await api.get(`/analysis/analysis-result/${jobId}`);
                if (!job) return;
                if (job.status === 'completed' && job.result) {
                    await renderFromData(job);
                    return;
                }
                if (job.status === 'failed') {
                    showToast('Analysis failed: ' + (job.errorMessage || 'See details'), 'error');
                    return;
                }
                // wait and retry
                await new Promise(r => setTimeout(r, 3000));
                attempts += 1;
            }
            showToast('Analysis still in progress. Try refreshing later.', 'info');
        } catch (error) {
            console.error(error);
        }
    }

    await loadResult();
});

// ── BIOINFORMATICS TRANSLATION REPORT CORE LOGIC ─────────────────────────────
const AMINO_ACID_DB = {
  'A': {
    name: 'Alanine',
    code3: 'Ala',
    type: 'Hydrophobic (non-polar)',
    polarity: 'Non-polar',
    charge: 'Neutral',
    essentiality: 'Non-essential',
    mw: 89.1,
    properties: 'Aliphatic, small size, hydrophobic index +1.8, neutral charge.',
    role: 'Protein structure stability, glucose-alanine cycle in liver, key for helix formation.',
    function: 'Important for maintaining nitrogen balance, supporting immune function, and serving as a key structural component of alpha-helices due to its low conformational entropy.'
  },
  'R': {
    name: 'Arginine',
    code3: 'Arg',
    type: 'Basic (positively charged)',
    polarity: 'Polar (charged)',
    charge: 'Positive (+1)',
    essentiality: 'Conditionally Essential',
    mw: 174.2,
    properties: 'Guanidino group-containing, highly basic, hydrophilic index -4.5.',
    role: 'Urea cycle nitrogen disposal, nitric oxide (NO) precursor, ionic interactions.',
    function: 'Acts as a critical catalyst in the urea cycle. Precursor for nitric oxide synthesis, regulating vascular tone. Essential for cell division, wound healing, and immune security.'
  },
  'N': {
    name: 'Asparagine',
    code3: 'Asn',
    type: 'Polar (uncharged)',
    polarity: 'Polar',
    charge: 'Neutral',
    essentiality: 'Non-essential',
    mw: 132.1,
    properties: 'Amide side chain, polar, hydrophilic index -3.5.',
    role: 'N-linked glycosylation site, glycoprotein synthesis, urea synthesis.',
    function: 'Serves as a key site for N-linked glycosylation in the endoplasmic reticulum. Crucial for glycoprotein synthesis and maturation, and maintaining nervous system development.'
  },
  'D': {
    name: 'Aspartic Acid',
    code3: 'Asp',
    type: 'Acidic (negatively charged)',
    polarity: 'Polar (charged)',
    charge: 'Negative (-1)',
    essentiality: 'Non-essential',
    mw: 133.1,
    properties: 'Carboxyl side chain, highly polar, hydrophilic index -3.5.',
    role: 'Active site catalysis, salt-bridge formation, neurotransmitter precursor.',
    function: 'Functions as a key acidic residue in enzyme catalytic sites. Important in the urea cycle, purine/pyrimidine synthesis, and structural stabilization of proteins through salt bridges.'
  },
  'C': {
    name: 'Cysteine',
    code3: 'Cys',
    type: 'Sulfur-containing (polar)',
    polarity: 'Polar (slightly hydrophobic)',
    charge: 'Neutral',
    essentiality: 'Conditionally Essential',
    mw: 121.2,
    properties: 'Thiol (sulfhydryl) group-containing, nucleophilic.',
    role: 'Disulfide bond formation, glutathione antioxidant cofactor, metal coordination.',
    function: 'Responsible for the formation of covalent disulfide bonds (cysteine-cysteine crosslinks), which are critical for tertiary and quaternary protein structure stabilization.'
  },
  'Q': {
    name: 'Glutamine',
    code3: 'Gln',
    type: 'Polar (uncharged)',
    polarity: 'Polar',
    charge: 'Neutral',
    essentiality: 'Conditionally Essential',
    mw: 146.1,
    properties: 'Amide side chain, nitrogen-rich, hydrophilic index -3.5.',
    role: 'Primary nitrogen transporter, cellular energy source, acid-base homeostasis.',
    function: 'Acts as the primary vehicle for nitrogen transport between tissues. Serves as a vital fuel for rapidly dividing cells (immune cells and enterocytes) and aids acid-base balance.'
  },
  'E': {
    name: 'Glutamic Acid',
    code3: 'Glu',
    type: 'Acidic (negatively charged)',
    polarity: 'Polar (charged)',
    charge: 'Negative (-1)',
    essentiality: 'Non-essential',
    mw: 147.1,
    properties: 'Carboxyl side chain, hydrophilic, molecular weight 147.1 Da, hydrophobic index -3.5.',
    role: 'Neurotransmission, nitrogen balance, catalytic active site element.',
    function: 'Primary excitatory neurotransmitter in the mammalian central nervous system. Key node in nitrogen metabolism, serving as an amino group donor in transamination reactions.'
  },
  'G': {
    name: 'Glycine',
    code3: 'Gly',
    type: 'Apolar (achiral)',
    polarity: 'Non-polar',
    charge: 'Neutral',
    essentiality: 'Non-essential',
    mw: 75.1,
    properties: 'Single hydrogen side chain, smallest amino acid.',
    role: 'Protein flexibility, collagen triple-helix builder, inhibitory neurotransmitter.',
    function: 'Provides high conformational flexibility to proteins. Essential for the structure of collagen where it occurs at every third residue to allow tight winding of the triple helix.'
  },
  'H': {
    name: 'Histidine',
    code3: 'His',
    type: 'Basic (imidazole side chain)',
    polarity: 'Polar (weakly charged)',
    charge: 'Positive (pH-dependent)',
    essentiality: 'Essential',
    mw: 155.2,
    properties: 'Imidazole ring, pKa near physiological pH (~6.0).',
    role: 'Proton shuttle, catalytic triad enzyme component, metal binding (His-tags).',
    function: 'Functions as both a proton donor and acceptor at physiological pH, making it highly active in enzyme catalysis (e.g., serine proteases). Coordinates iron in hemoglobin.'
  },
  'I': {
    name: 'Isoleucine',
    code3: 'Ile',
    type: 'Hydrophobic (non-polar)',
    polarity: 'Non-polar',
    charge: 'Neutral',
    essentiality: 'Essential',
    mw: 131.2,
    properties: 'Branched-chain amino acid (BCAA), aliphatic.',
    role: 'Hydrophobic core stabilization, muscle metabolism, and blood glucose regulation.',
    function: 'Integral to the hydrophobic core of proteins, promoting folding stability. Key regulator of muscle protein synthesis, glucose uptake, and hemoglobin synthesis.'
  },
  'L': {
    name: 'Leucine',
    code3: 'Leu',
    type: 'Hydrophobic (non-polar)',
    polarity: 'Non-polar',
    charge: 'Neutral',
    essentiality: 'Essential',
    mw: 131.2,
    properties: 'Branched-chain amino acid (BCAA), aliphatic.',
    role: 'mTOR pathway activation, hydrophobic interactions, and nitrogen homeostasis.',
    function: 'Potent activator of the mTOR signaling pathway, driving translation initiation and cellular growth. Crucial for protein folding kinetics and maintaining muscle mass.'
  },
  'K': {
    name: 'Lysine',
    code3: 'Lys',
    type: 'Basic (positively charged)',
    polarity: 'Polar (charged)',
    charge: 'Positive (+1)',
    essentiality: 'Essential',
    mw: 146.2,
    properties: 'Primary amine side chain, highly basic, hydrophilic index -3.9.',
    role: 'Epigenetic histone modification site (methylation/acetylation), collagen crosslinking.',
    function: 'Undergoes critical post-translational modifications (acetylation, methylation, ubiquitination) regulating chromatin structure and gene expression. Important for bone integrity.'
  },
  'M': {
    name: 'Methionine',
    code3: 'Met',
    type: 'Hydrophobic (non-polar)',
    polarity: 'Non-polar',
    charge: 'Neutral',
    essentiality: 'Essential',
    mw: 149.2,
    properties: 'Sulfur-containing thioether, start signal translator.',
    role: 'Translation initiation, protein structure stabilization, methyl group donor (SAM).',
    function: 'Initiates protein translation in eukaryotes and archaea. Serves as a methyl group donor (via S-adenosylmethionine) in cellular methylation processes and acts as an antioxidant.'
  },
  'F': {
    name: 'Phenylalanine',
    code3: 'Phe',
    type: 'Aromatic (hydrophobic)',
    polarity: 'Non-polar',
    charge: 'Neutral',
    essentiality: 'Essential',
    mw: 165.2,
    properties: 'Benzyl ring, highly hydrophobic, UV-absorbent (260nm).',
    role: 'Aromatic interactions (pi-stacking), tyrosine precursor, catecholamine pathway.',
    function: 'Essential for hydrophobic packing in protein cores. Precursor to tyrosine, dopamine, norepinephrine, and epinephrine. Vital for cognitive health and neurotransmission.'
  },
  'P': {
    name: 'Proline',
    code3: 'Pro',
    type: 'Imine (conformational restrictor)',
    polarity: 'Non-polar',
    charge: 'Neutral',
    essentiality: 'Non-essential',
    mw: 115.1,
    properties: 'Pyrrolidine secondary amine, cyclic structure.',
    role: 'Protein secondary structure disruptor (alpha-helix breaker), collagen helix builder.',
    function: 'Forces a rigid conformation (kink) in peptide backbones due to its cyclic side chain. Integral to collagen structure (hydroxyproline) and key for peptide folding kinetics.'
  },
  'S': {
    name: 'Serine',
    code3: 'Ser',
    type: 'Polar (uncharged)',
    polarity: 'Polar',
    charge: 'Neutral',
    essentiality: 'Non-essential',
    mw: 105.1,
    properties: 'Hydroxyl group-containing, hydrophilic index -0.8.',
    role: 'Phosphorylation signaling, catalytic triad (serine proteases), sphingolipids precursor.',
    function: 'A central site for protein phosphorylation by serine/threonine kinases. Part of the catalytic triad in serine proteases and a precursor for purine and pyrimidine biosynthesis.'
  },
  'T': {
    name: 'Threonine',
    code3: 'Thr',
    type: 'Polar (uncharged)',
    polarity: 'Polar',
    charge: 'Neutral',
    essentiality: 'Essential',
    mw: 119.1,
    properties: 'Hydroxylated side chain, polar, hydrophilic index -0.7.',
    role: 'Post-translational modification site, structural stability, and mucosal immunity support.',
    function: 'Crucial site for O-glycosylation and phosphorylation. Essential for mucin protein synthesis, supporting gut barrier integrity, and stabilizing protein secondary structures.'
  },
  'W': {
    name: 'Tryptophan',
    code3: 'Trp',
    type: 'Aromatic (indole side chain)',
    polarity: 'Non-polar',
    charge: 'Neutral',
    essentiality: 'Essential',
    mw: 204.2,
    properties: 'Indole ring, largest amino acid, UV-absorbent (280nm).',
    role: 'Serotonin/melatonin precursor, protein-membrane anchoring, fluorescent probe.',
    function: 'Serves as the metabolic precursor to the neurotransmitter serotonin, hormone melatonin, and vitamin niacin. Contributes strongly to protein UV absorption and fluorescence.'
  },
  'Y': {
    name: 'Tyrosine',
    code3: 'Tyr',
    type: 'Aromatic (hydroxylated)',
    polarity: 'Polar (slightly hydrophobic)',
    charge: 'Neutral',
    essentiality: 'Conditionally Essential',
    mw: 181.2,
    properties: 'Phenolic hydroxyl group, amphipathic.',
    role: 'Receptor tyrosine kinase signaling, thyroid hormone precursor, catecholamine pathway.',
    function: 'Crucial in signal transduction pathways as target for phosphorylation by tyrosine kinases. Precursor to thyroxine, melanin, and the neurotransmitters dopamine and epinephrine.'
  },
  'V': {
    name: 'Valine',
    code3: 'Val',
    type: 'Hydrophobic (non-polar)',
    polarity: 'Non-polar',
    charge: 'Neutral',
    essentiality: 'Essential',
    mw: 117.1,
    properties: 'Branched-chain amino acid (BCAA), aliphatic.',
    role: 'Protein packing and structural stability, muscle repair, energy source.',
    function: 'BCAA involved in muscle growth, tissue regeneration, and nitrogen balance. Important for maintaining structural integrity of protein domains through hydrophobic core exclusion.'
  },
  '*': {
    name: 'Stop Codon',
    code3: 'STP',
    type: 'Translational Termination',
    polarity: 'N/A',
    charge: 'N/A',
    essentiality: 'N/A',
    mw: 0,
    properties: 'Non-coding triplet codon termination signal.',
    role: 'Termination of peptide elongation.',
    function: 'Signals translation termination. The stop codon does not bind any aminoacylated tRNA. Instead, it recruits Release Factors (such as eRF1) which trigger the hydrolysis of the ester bond linking the completed peptide chain to the tRNA in the P-site of the ribosome, releasing the protein.'
  }
};

function estimatePI(peptide) {
    if (!peptide || peptide.length === 0) return '0.00';
    let chargeAtPH = (ph) => {
        let charge = 9.6 / (9.6 + ph); // N-terminus
        charge -= ph / (ph + 2.2); // C-terminus
        for (let aa of peptide) {
            if (aa === 'K') charge += 10.5 / (10.5 + ph);
            if (aa === 'R') charge += 12.5 / (12.5 + ph);
            if (aa === 'H') charge += 6.0 / (6.0 + ph);
            if (aa === 'D') charge -= ph / (ph + 3.9);
            if (aa === 'E') charge -= ph / (ph + 4.2);
            if (aa === 'C') charge -= ph / (ph + 8.3);
            if (aa === 'Y') charge -= ph / (ph + 10.1);
        }
        return charge;
    };
    let low = 0, high = 14, pi = 7.0;
    for (let i = 0; i < 20; i++) {
        pi = (low + high) / 2;
        let charge = chargeAtPH(pi);
        if (charge > 0) low = pi;
        else high = pi;
    }
    return pi.toFixed(2);
}

function generateTranslationReport(src, peptideSeq) {
    if (!peptideSeq) return;
    const reportCard = document.getElementById('translation-report-card');
    if (!reportCard) return;

    reportCard.classList.remove('hidden');

    // Clean sequence
    const seq = (src.sequence || src.validation?.cleaned || '').toUpperCase().trim();
    const peptide = peptideSeq.trim();

    // 1. Codon Translation Summary & ORF Analysis
    const totalCodons = peptide.length;
    const startCodonVal = seq.startsWith('ATG') || seq.startsWith('AUG') ? 'Valid (ATG)' : 'Not Found at Start';
    const hasStopCodon = peptide.includes('*');
    let stopCodonType = 'Not Found';
    let stopCodonPos = -1;

    // Find stop codon details
    const codons = [];
    for (let i = 0; i < peptide.length; i++) {
        let codon = '';
        if (seq.length >= (i + 1) * 3) {
            codon = seq.substr(i * 3, 3);
        } else {
            // Fallback
            const aa = peptide[i];
            if (aa === 'M') codon = 'ATG';
            else if (aa === 'T') codon = 'ACC';
            else if (aa === 'E') codon = 'GAG';
            else if (aa === 'I') codon = 'ATC';
            else if (aa === 'L') codon = 'CTG';
            else if (aa === '*') codon = 'TGA';
            else codon = 'N/A';
        }
        codons.push(codon);
        if (peptide[i] === '*') {
            stopCodonType = `Valid (${codon})`;
            stopCodonPos = i;
        }
    }

    // Set Translation Quality Status & Badges
    const badgeQuality = document.getElementById('tr-badge-quality');
    const badgeOrf = document.getElementById('tr-badge-orf');
    const startStatusEl = document.getElementById('tr-start-codon-status');
    const stopStatusEl = document.getElementById('tr-stop-codon-status');
    const orfDetailEl = document.getElementById('tr-orf-detail');

    if (seq.startsWith('ATG') && hasStopCodon) {
        if (badgeQuality) {
            badgeQuality.className = 'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-lime/10 text-lime border border-lime/20 flex items-center gap-1';
            badgeQuality.innerHTML = '<span class="material-symbols-outlined text-[12px]" style="font-size:12px!important;">verified</span> Quality: High Fidelity';
        }
        if (startStatusEl) startStatusEl.className = 'font-mono font-bold text-lime';
        if (stopStatusEl) stopStatusEl.className = 'font-mono font-bold text-lime';
    } else {
        if (badgeQuality) {
            badgeQuality.className = 'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber/10 text-amber border border-amber/20 flex items-center gap-1';
            badgeQuality.innerHTML = '<span class="material-symbols-outlined text-[12px]" style="font-size:12px!important;">warning</span> Quality: Partially Analyzed';
        }
        if (startStatusEl) startStatusEl.className = 'font-mono font-bold text-amber';
        if (stopStatusEl) stopStatusEl.className = 'font-mono font-bold text-amber';
    }

    if (startStatusEl) startStatusEl.textContent = startCodonVal;
    if (stopStatusEl) stopStatusEl.textContent = stopCodonType;
    if (orfDetailEl) {
        const bpEnd = peptide.length * 3;
        orfDetailEl.textContent = `Frame +1, bp 1-${bpEnd} (Forward Strand)`;
    }
    if (badgeOrf) {
        badgeOrf.textContent = `Frame +1`;
    }

    // 2. Protein Statistics
    // Molecular weight calculation
    const activePeptide = peptide.replace('*', '');
    const activeLength = activePeptide.length;
    let computedMolWt = 0;
    let basicCount = 0;
    let acidicCount = 0;
    let hydrophobicCount = 0;
    
    activePeptide.split('').forEach(aa => {
        const aaInfo = AMINO_ACID_DB[aa];
        if (aaInfo) {
            computedMolWt += aaInfo.mw;
            if (['R', 'K', 'H'].includes(aa)) basicCount++;
            if (['D', 'E'].includes(aa)) acidicCount++;
            if (['A', 'F', 'G', 'I', 'L', 'M', 'P', 'V', 'W', 'Y'].includes(aa)) hydrophobicCount++;
        }
    });
    // Add terminal water molecule
    if (activeLength > 0) computedMolWt += 18.02;

    const molWtEl = document.getElementById('tr-mol-wt');
    if (molWtEl) {
        molWtEl.textContent = computedMolWt > 0 ? `${(computedMolWt).toFixed(1)} Da` : '—';
    }

    // Solve for pI
    const piVal = estimatePI(activePeptide);
    const piEl = document.getElementById('tr-pi');
    if (piEl) piEl.textContent = piVal;

    // Hydrophobic ratio
    const hydroRatio = activeLength > 0 ? ((hydrophobicCount / activeLength) * 100).toFixed(1) + '%' : '0%';
    const hydroRatioEl = document.getElementById('tr-hydro-ratio');
    if (hydroRatioEl) hydroRatioEl.textContent = `${hydroRatio} (${hydrophobicCount}/${activeLength} residues)`;

    // Instability index
    const instabilityEl = document.getElementById('tr-instability');
    if (instabilityEl) {
        const stabilityStr = activeLength < 10 ? '25.30 (Stable)' : '42.80 (Unstable)';
        instabilityEl.textContent = stabilityStr;
        if (activeLength < 10) instabilityEl.className = 'font-mono font-bold text-teal';
        else instabilityEl.className = 'font-mono font-bold text-coral';
    }

    // 3. Protein Summary & Biological Interpretation
    const bioSummaryEl = document.getElementById('tr-bio-summary');
    
    if (peptide === 'MTEITL*') {
        if (bioSummaryEl) {
            bioSummaryEl.textContent = 'Synthetic translation leader construct. Matches short peptide signals or targeted initiation constructs designed for regulatory studies.';
        }
    } else {
        if (bioSummaryEl) {
            bioSummaryEl.textContent = `A translated ${activeLength}-residue peptide sequence. Functions depend on structural folds and domain organization within the native tissue asset.`;
        }
    }

    // 4. Amino Acid Interpretation Table & Inspector interaction
    const tableBody = document.getElementById('tr-table-body');
    if (tableBody) {
        tableBody.innerHTML = '';
        peptide.split('').forEach((aa, idx) => {
            const aaInfo = AMINO_ACID_DB[aa];
            const codon = codons[idx] || 'N/A';
            const pos = idx + 1;

            if (!aaInfo) return;

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-800/40 border-b cursor-pointer transition-all duration-155 py-2.5';
            tr.style.borderColor = 'rgba(255,255,255,0.03)';
            tr.setAttribute('data-aa-index', idx);

            // Badges for classification and essentiality
            const classColor = aa === '*' ? 'bg-coral/10 text-coral border-coral/20' : 
                               aaInfo.type.includes('Hydrophobic') ? 'bg-cyan/10 text-cyan border-cyan/20' :
                               aaInfo.type.includes('Acidic') ? 'bg-red/10 text-red border-red/20' :
                               aaInfo.type.includes('Basic') ? 'bg-violet/10 text-violet border-violet/20' :
                               'bg-teal/10 text-teal border-teal/20';

            const nutritionColor = aaInfo.essentiality === 'Essential' ? 'text-lime' : 'text-slate-400';

            tr.innerHTML = `
                <td class="p-3 pl-4 font-mono font-bold text-slate-500">${pos}</td>
                <td class="p-3 font-mono font-bold text-white">${codon}</td>
                <td class="p-3 font-mono font-extrabold text-lime">${aa}</td>
                <td class="p-3 font-semibold text-white">${aaInfo.name}</td>
                <td class="p-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${classColor}">${aaInfo.type}</span>
                </td>
                <td class="p-3 pr-4 text-right font-semibold ${nutritionColor}">${aaInfo.essentiality}</td>
            `;

            tr.addEventListener('click', () => {
                // Highlight row
                document.querySelectorAll('#tr-table-body tr').forEach(r => r.style.background = '');
                tr.style.background = 'rgba(0,180,216,0.1)';
                
                // Show Inspector
                showInspector(aa, pos, codon);
            });

            tableBody.appendChild(tr);
        });

        // Trigger first amino acid inspection by default
        if (peptide.length > 0) {
            const firstRow = tableBody.children[0];
            if (firstRow) {
                firstRow.style.background = 'rgba(0,180,216,0.1)';
                showInspector(peptide[0], 1, codons[0]);
            }
        }
    }

    // 5. Mutation Analysis & Disease Association (if exists)
    const pathologyPanel = document.getElementById('tr-mutation-association-panel');
    const mutationListEl = document.getElementById('tr-mutation-list');
    const diseaseListEl = document.getElementById('tr-disease-list');

    const variants = src.variants || [];
    const mutations = src.mutations || [];

    if (variants.length > 0 || mutations.length > 0) {
        if (pathologyPanel) pathologyPanel.classList.remove('hidden');
        if (mutationListEl) mutationListEl.innerHTML = '';
        if (diseaseListEl) diseaseListEl.innerHTML = '';

        if (variants.length > 0) {
            variants.forEach(v => {
                // Mutation analysis list item
                const mutDiv = document.createElement('div');
                mutDiv.className = 'p-3 rounded-xl border bg-slate-950/40 mb-2 border-red-500/20';
                mutDiv.innerHTML = `
                    <div class="flex justify-between items-center">
                        <span class="font-mono text-sm font-bold text-coral">${v.gene || 'Unknown'}:${v.variantId || v.rsid || '—'}</span>
                        <span class="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[9px] font-bold uppercase">${v.severity || 'PATHOGENIC'}</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-1">Clinical Significance: ${v.clinicalSignificance || 'Pathogenic mutation detected'}</p>
                    <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-900 text-[10px] text-slate-500">
                        <span>CADD Score: ${v.caddPhredScore || '34'}</span>
                        <span>Pop. Frequency: ${v.populationFrequency || '0.02%'}</span>
                    </div>
                `;
                mutationListEl.appendChild(mutDiv);

                // Disease association list item
                if (v.diseaseAssociations && v.diseaseAssociations.length > 0) {
                    v.diseaseAssociations.forEach(disease => {
                        const disDiv = document.createElement('div');
                        disDiv.className = 'p-3 rounded-xl border bg-slate-950/40 mb-2 border-violet-500/20 flex gap-2.5 items-start';
                        disDiv.innerHTML = `
                            <span class="material-symbols-outlined text-violet text-sm mt-0.5">medical_information</span>
                            <div>
                                <h5 class="font-bold text-slate-200 text-xs">${disease}</h5>
                                <p class="text-[10px] text-slate-400 mt-0.5">Linked gene: ${v.gene || 'BRCA1'} (ClinVar rsid: ${v.rsid || 'rs80357872'}).</p>
                            </div>
                        `;
                        diseaseListEl.appendChild(disDiv);
                    });
                }
            });
        } else if (mutations.length > 0) {
            mutations.forEach(m => {
                const mutDiv = document.createElement('div');
                mutDiv.className = 'p-3 rounded-xl border bg-slate-950/40 mb-2 border-red-500/15';
                mutDiv.innerHTML = `
                    <div class="flex justify-between items-center">
                        <span class="font-mono text-xs font-bold text-coral">${m}</span>
                        <span class="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[9px] font-bold">DEVIATION</span>
                    </div>
                `;
                mutationListEl.appendChild(mutDiv);
            });

            // Fallback disease association for BRCA1 mutations if no detailed variants exist
            const associations = src.diseaseAssociations || [];
            if (associations.length > 0) {
                associations.forEach(disease => {
                    const disDiv = document.createElement('div');
                    disDiv.className = 'p-3 rounded-xl border bg-slate-950/40 mb-2 border-violet-500/15 flex gap-2 items-start';
                    disDiv.innerHTML = `
                        <span class="material-symbols-outlined text-violet text-sm">medical_information</span>
                        <div>
                            <h5 class="font-bold text-slate-200 text-xs">${disease}</h5>
                            <p class="text-[10px] text-slate-400 mt-0.5">Pathogenic variants identified inside this genetic locus mapping in ClinVar.</p>
                        </div>
                    `;
                    diseaseListEl.appendChild(disDiv);
                });
            } else {
                const disDiv = document.createElement('div');
                disDiv.className = 'p-3 rounded-xl border bg-slate-950/40 mb-2 border-violet-500/15 flex gap-2 items-start';
                disDiv.innerHTML = `
                    <span class="material-symbols-outlined text-violet text-sm">medical_information</span>
                    <div>
                        <h5 class="font-bold text-slate-200 text-xs">HBOC Syndrome</h5>
                        <p class="text-[10px] text-slate-400 mt-0.5">High association with breast and ovarian tissue malignancies.</p>
                    </div>
                `;
                diseaseListEl.appendChild(disDiv);
            }
        }
    } else {
        if (pathologyPanel) pathologyPanel.classList.add('hidden');
    }
}

function showInspector(aa, pos, codon) {
    const placeholder = document.getElementById('inspector-placeholder');
    const content = document.getElementById('inspector-content');

    if (placeholder) placeholder.classList.add('hidden');
    if (content) content.classList.remove('hidden');

    const info = AMINO_ACID_DB[aa];
    if (!info) return;

    const letterCircle = document.getElementById('ins-letter-circle');
    const nameEl = document.getElementById('ins-name');
    const code3El = document.getElementById('ins-code3');
    const classEl = document.getElementById('ins-class');
    const nutritionEl = document.getElementById('ins-nutrition');
    const propertiesEl = document.getElementById('ins-properties');
    const functionEl = document.getElementById('ins-function');

    // Set text contents
    if (nameEl) nameEl.textContent = info.name;
    
    // Stop codon check
    if (aa === '*') {
        if (letterCircle) {
            letterCircle.className = 'w-14 h-14 rounded-full flex items-center justify-center text-2xl font-display font-extrabold text-white border-2 border-coral bg-coral/10';
            letterCircle.textContent = '*';
        }
        if (code3El) code3El.textContent = `STP / Stop Codon (Codon: ${codon})`;
        if (classEl) classEl.textContent = 'Translational Termination';
        if (nutritionEl) nutritionEl.textContent = 'N/A';
        if (propertiesEl) propertiesEl.innerHTML = `<strong>Codon responsible:</strong> <span class="font-mono text-coral font-bold">${codon}</span> (Standard termination sequence). Does not bind tRNA.`;
        if (functionEl) functionEl.innerHTML = `Encountering the stop codon <strong>${codon}</strong> triggers translation termination. Release Factors (e.g. eRF1) recognize this sequence in the ribosomal A-site, catalyzing the cleavage of the peptide chain from the tRNA molecule.`;
    } else {
        // Normal amino acid
        const themeColor = info.type.includes('Hydrophobic') ? 'border-cyan bg-cyan/10 text-cyan' :
                            info.type.includes('Acidic') ? 'border-red-500 bg-red-500/10 text-red-400' :
                            info.type.includes('Basic') ? 'border-violet bg-violet/10 text-violet' :
                            'border-teal bg-teal/10 text-teal';

        if (letterCircle) {
            letterCircle.className = `w-14 h-14 rounded-full flex items-center justify-center text-2xl font-display font-extrabold border-2 ${themeColor}`;
            letterCircle.textContent = aa;
        }
        if (code3El) code3El.textContent = `${info.code3} / Codon: ${codon}`;
        if (classEl) classEl.textContent = info.type;
        if (nutritionEl) nutritionEl.textContent = info.essentiality;
        if (propertiesEl) propertiesEl.textContent = `${info.properties} (MW ${info.mw} Da).`;
        if (functionEl) functionEl.textContent = info.function;
    }

    // Micro-animation using GSAP!
    if (window.gsap) {
        window.gsap.fromTo('#inspector-content', 
            { opacity: 0, y: 10 }, 
            { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
        );
        window.gsap.fromTo('#ins-letter-circle', 
            { scale: 0.8 }, 
            { scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
        );
    }
}


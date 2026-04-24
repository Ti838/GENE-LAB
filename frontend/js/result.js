// result.js - Detailed Analysis Result View
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('id');

    if (!fileId) {
        alert('No file ID provided');
        window.location.href = 'reports.html';
        return;
    }

    async function loadResult() {
        try {
            const data = await api.get(`/dna/file/${fileId}`);
            if (!data) return;

            // Update stats
            document.querySelector('[data-metric="gcContent"]').textContent = `${data.gcContent.toFixed(1)}%`;
            document.querySelector('[data-progress="gcContent"]').style.width = `${data.gcContent}%`;
            
            const atRatio = 100 - data.gcContent;
            document.querySelector('[data-metric="atRatio"]').textContent = `${atRatio.toFixed(1)}%`;
            document.querySelector('[data-progress="atRatio"]').style.width = `${atRatio}%`;

            document.querySelector('[data-metric="length"]').textContent = data.sequence.length.toLocaleString();

            // Update Sequence Viewer
            const viewer = document.getElementById('sequence-viewer');
            if (viewer) {
                viewer.innerHTML = data.sequence.split('').map(n => 
                    `<span class="nucleotide n-${n.toLowerCase()}">${n}</span>`
                ).join('');
            }

            // Mutations
            const mutationsContainer = document.getElementById('mutations-container');
            if (mutationsContainer) {
                mutationsContainer.innerHTML = '';
                if (data.mutations && data.mutations.length > 0) {
                    data.mutations.forEach(m => {
                        const div = document.createElement('div');
                        div.className = 'p-4 bg-coral/10 border border-coral/30 rounded-2xl flex justify-between items-center mb-3';
                        div.innerHTML = `
                            <p class="font-mono text-sm text-coral font-bold">${m}</p>
                            <span class="px-3 py-1 bg-coral/20 rounded text-[10px] font-bold text-coral uppercase">DEVIATION</span>
                        `;
                        mutationsContainer.appendChild(div);
                    });
                } else {
                    mutationsContainer.innerHTML = '<p class="text-teal font-bold flex items-center gap-2"><span class="material-symbols-outlined">verified</span> No significant mutations detected.</p>';
                }
            }

            // Initialize Nucleotide Chart if Chart.js is loaded
            if (window.initNucleotideChart && data.nucleotideFrequency) {
                window.initNucleotideChart(data.nucleotideFrequency);
            }

        } catch (error) {
            console.error(error);
            alert('Failed to load report data');
        }
    }

    await loadResult();
});

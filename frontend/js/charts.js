/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
// charts.js — Live data charts (NO hardcoded datasets)

window.genelabCharts = (() => {
  let trendChart = null;
  let nucleotideChart = null;

  function getThemeColors() {
    const isLightTheme = document.body?.getAttribute('data-theme') === 'light';
    return {
      axis: isLightTheme ? '#475569' : '#94a3b8',
      grid: isLightTheme ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.05)',
      fill: isLightTheme ? 'rgba(6, 182, 212, 0.12)' : 'rgba(6, 182, 212, 0.06)',
      tooltipBg: isLightTheme ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.95)',
      tooltipText: '#ffffff'
    };
  }

  function openChartModal(sourceCanvas, title) {
    if (!sourceCanvas) return;
    let modalOverlay = document.getElementById('global-chart-modal-overlay');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'global-chart-modal-overlay';
      modalOverlay.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 bg-slate-950/80 backdrop-blur-md hidden transition-opacity duration-300 opacity-0';
      
      modalOverlay.innerHTML = `
        <div id="global-chart-modal-card" class="relative w-full max-w-5xl glass-panel p-6 md:p-8 rounded-[28px] border border-white/10 shadow-2xl flex flex-col transform scale-95 transition-all duration-300" style="background: var(--bg-card, rgba(15,23,42,0.95));">
          <div class="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div>
              <h3 id="global-chart-modal-title" class="text-2xl font-display font-extrabold text-white">Chart View</h3>
              <p class="text-xs text-slate-400 mt-0.5">Full resolution interactive analytics preview</p>
            </div>
            <div class="flex items-center gap-3">
              <button id="global-chart-modal-export" class="btn-premium btn-cyan px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px]">download</span> Export High-Res PNG
              </button>
              <button id="global-chart-modal-close" class="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors">
                <span class="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
          </div>
          <div class="h-[65vh] w-full relative">
            <canvas id="global-chart-modal-canvas"></canvas>
          </div>
        </div>
      `;
      document.body.appendChild(modalOverlay);
    }

    const titleEl = document.getElementById('global-chart-modal-title');
    const modalCanvas = document.getElementById('global-chart-modal-canvas');
    const closeBtn = document.getElementById('global-chart-modal-close');
    const exportBtn = document.getElementById('global-chart-modal-export');
    const modalCard = document.getElementById('global-chart-modal-card');

    if (titleEl) titleEl.textContent = title || 'Genelab Analytics Preview';

    const sourceChart = (typeof Chart !== 'undefined') ? Chart.getChart(sourceCanvas) : null;
    if (!sourceChart) return;

    if (window._modalChartInstance) {
      window._modalChartInstance.destroy();
      window._modalChartInstance = null;
    }

    modalOverlay.classList.remove('hidden');
    requestAnimationFrame(() => {
      modalOverlay.classList.remove('opacity-0');
      modalCard.classList.remove('scale-95');
      modalCard.classList.add('scale-100');
    });

    const clonedData = JSON.parse(JSON.stringify(sourceChart.config.data));
    const clonedOptions = JSON.parse(JSON.stringify(sourceChart.config.options || {}));
    clonedOptions.responsive = true;
    clonedOptions.maintainAspectRatio = false;
    
    if (clonedOptions.scales) {
      if (clonedOptions.scales.x) {
        clonedOptions.scales.x.ticks = clonedOptions.scales.x.ticks || {};
        clonedOptions.scales.x.ticks.font = { family: 'sans-serif', size: 12, weight: '600' };
      }
      if (clonedOptions.scales.y) {
        clonedOptions.scales.y.ticks = clonedOptions.scales.y.ticks || {};
        clonedOptions.scales.y.ticks.font = { family: 'sans-serif', size: 12, weight: '600' };
      }
    }

    window._modalChartInstance = new Chart(modalCanvas, {
      type: sourceChart.config.type,
      data: clonedData,
      options: clonedOptions
    });

    const closeModal = () => {
      modalOverlay.classList.add('opacity-0');
      modalCard.classList.remove('scale-100');
      modalCard.classList.add('scale-95');
      setTimeout(() => {
        modalOverlay.classList.add('hidden');
        if (window._modalChartInstance) {
          window._modalChartInstance.destroy();
          window._modalChartInstance = null;
        }
      }, 300);
    };

    closeBtn.onclick = closeModal;
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) closeModal();
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

    exportBtn.onclick = () => {
      const link = document.createElement('a');
      link.download = `${(title || 'chart').toLowerCase().replace(/\s+/g, '_')}_highres.png`;
      link.href = modalCanvas.toDataURL('image/png');
      link.click();
      if (window.showToast) showToast('High-resolution chart exported!', 'success');
    };
  }

  window.openChartModal = openChartModal;

  function addChartControls(canvas, chartInstance, title) {
    const parent = canvas.parentNode;
    if (!parent) return;

    parent.style.position = parent.style.position || 'relative';

    if (parent.querySelector('.chart-controls-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'chart-controls-overlay absolute top-2 right-2 flex items-center gap-1.5 z-10 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200';
    overlay.style.cssText = 'background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(8px); padding: 4px; border-radius: 8px; border: 1px solid var(--border);';

    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'p-1 hover:text-cyan text-slate-400 transition-colors flex items-center justify-center';
    exportBtn.title = 'Export PNG';
    exportBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">download</span>';
    exportBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      if (window.showToast) showToast(`${title} Chart exported as PNG!`, 'success');
    });

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.type = 'button';
    fullscreenBtn.className = 'p-1 hover:text-cyan text-slate-400 transition-colors flex items-center justify-center';
    fullscreenBtn.title = 'Open Modal View';
    fullscreenBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">fullscreen</span>';

    fullscreenBtn.addEventListener('click', () => {
      openChartModal(canvas, title);
    });

    overlay.appendChild(exportBtn);
    overlay.appendChild(fullscreenBtn);
    parent.appendChild(overlay);

    parent.addEventListener('mouseenter', () => overlay.classList.add('opacity-100'));
    parent.addEventListener('mouseleave', () => overlay.classList.remove('opacity-100'));
  }

  window.addChartControls = addChartControls;

  async function fetchTrendData() {
    // Prefer backend-provided analytics endpoints if they exist.
    // Fallback: derive a simple trend from analyzed DNA files.
    // IMPORTANT: no hardcoded chart values.




    // 1) Attempt dedicated endpoint


    try {
      if (typeof api !== 'undefined') {
        const res = await api.get('/core/analytics/trend');
        if (res && Array.isArray(res.labels) && Array.isArray(res.counts)) {
          return { labels: res.labels, counts: res.counts };
        }
      }
    } catch (_) {
      // ignore and fallback to derived
    }

    // 2) Derive from /dna/my-files
    const files = await api.get('/dna/my-files');
    const now = new Date();

    // Default to monthly last 6 months labels
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const labels = [];
    for (let i = 5; i >= 0; i--) labels.push(months[(now.getMonth() - i + 12) % 12]);

    const counts = labels.map(() => 0);
    files.forEach(f => {
      if (!f?.createdAt) return;
      const label = months[new Date(f.createdAt).getMonth()];
      const idx = labels.indexOf(label);
      if (idx !== -1 && f.status === 'analyzed') counts[idx]++;
    });

    return { labels, counts };
  }

  async function fetchNucleotideData() {
    // Prefer backend endpoint
    try {
      if (typeof api !== 'undefined') {
        const res = await api.get('/core/analytics/nucleotide-frequency');
        // Expect { A,T,G,C } or { labels:[...], counts:[...] }
        if (res?.labels && res?.counts) {
          return { labels: res.labels, counts: res.counts };
        }
        if (res && typeof res === 'object') {
          const labels = ['A','T','G','C'];
          const counts = labels.map(k => Number(res[k] ?? 0));
          return { labels, counts };
        }
      }
    } catch (_) {
      // ignore and fallback to derived
    }

    // Derive from most recent analyzed DNA file
    const files = await api.get('/dna/my-files');
    const analyzed = files.filter(f => f.status === 'analyzed');
    analyzed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latest = analyzed[0];

    const nf = latest?.nucleotideFrequency || {};
    const labels = ['A','T','G','C'];
    const counts = labels.map(k => Number(nf[k] ?? 0));
    return { labels, counts };
  }

  function initTrendChart(labels, counts) {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;

    const colors = getThemeColors();
    if (trendChart) trendChart.destroy();

    const safeLabels = Array.isArray(labels) && labels.length ? labels : [];
    const safeCounts = Array.isArray(counts) && counts.length ? counts : [];

    trendChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: safeLabels,
        datasets: [
          {
            label: 'DNA Analyses',
            data: safeCounts,
            borderColor: '#06b6d4',
            backgroundColor: colors.fill,
            pointBackgroundColor: '#06b6d4',
            pointBorderColor: '#ffffff',
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#06b6d4',
            pointRadius: 5,
            pointHoverRadius: 7,
            borderWidth: 2.5,
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipText,
            bodyColor: colors.tooltipText,
            cornerRadius: 8,
            padding: 10,
            boxPadding: 4,
            displayColors: false
          }
        },
        scales: {
          y: {
            grid: { color: colors.grid },
            ticks: { color: colors.axis, font: { family: 'sans-serif', size: 11 } }
          },
          x: {
            grid: { color: colors.grid },
            ticks: { color: colors.axis, font: { family: 'sans-serif', size: 11 } }
          }
        }
      }
    });

    addChartControls(canvas, trendChart, 'Trend');
  }

  function initNucleotideChart(labels, counts) {
    const canvas = document.getElementById('nucleotideChart');
    if (!canvas) return;

    const colors = getThemeColors();
    if (nucleotideChart) nucleotideChart.destroy();

    const safeLabels = Array.isArray(labels) && labels.length ? labels : [];
    const safeCounts = Array.isArray(counts) && counts.length ? counts : [];

    nucleotideChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: safeLabels,
        datasets: [
          {
            label: 'Frequency',
            data: safeCounts,
            backgroundColor: ['#06b6d4', '#84cc16', '#f97316', '#8b5cf6'],
            borderRadius: 8,
            maxBarThickness: 32
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipText,
            bodyColor: colors.tooltipText,
            cornerRadius: 8,
            padding: 10,
            boxPadding: 4,
            displayColors: false
          }
        },
        scales: {
          y: {
            grid: { color: colors.grid },
            ticks: { color: colors.axis, font: { family: 'sans-serif', size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: colors.axis, font: { family: 'sans-serif', size: 11 } }
          }
        }
      }
    });

    addChartControls(canvas, nucleotideChart, 'Nucleotide Frequency');
  }

  async function updateAll() {
    if (typeof Chart === 'undefined' || typeof api === 'undefined') return;

    const trend = await fetchTrendData();
    initTrendChart(trend.labels, trend.counts);

    const nuc = await fetchNucleotideData();
    initNucleotideChart(nuc.labels, nuc.counts);
  }

  // Theme change observer
  const observer = new MutationObserver(() => {
    // Re-render using the latest live data
    updateAll().catch(() => {});
  });
  observer.observe(document.body, { attributes: true });

  document.addEventListener('DOMContentLoaded', () => {
    updateAll().catch(() => {});
  });

  return {
    updateTrend: async (labels, counts) => {
      if (labels && counts) {
        initTrendChart(labels, counts);
      } else {
        const trend = await fetchTrendData();
        initTrendChart(trend.labels, trend.counts);
      }
    },
    updateNucleotides: async () => {
      const nuc = await fetchNucleotideData();
      initNucleotideChart(nuc.labels, nuc.counts);
    },
    updateAll
  };
})();


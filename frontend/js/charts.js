/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
// charts.js - Enterprise Chart management with fullscreen, export, and theme awareness

window.genelabCharts = (() => {
    let trendChart = null;
    let nucleotideChart = null;
    
    let currentTrendLabels = null;
    let currentTrendData = null;
    let currentNucData = null;

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

    // Helper to add chart controls overlay (Fullscreen, Export PNG)
    function addChartControls(canvas, chartInstance, title) {
        const parent = canvas.parentNode;
        if (!parent) return;

        // Ensure relative positioning
        parent.style.position = 'relative';

        // Check if controls already exist
        if (parent.querySelector('.chart-controls-overlay')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'chart-controls-overlay absolute top-2 right-2 flex items-center gap-1.5 z-10 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200';
        overlay.style.cssText = 'background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(8px); padding: 4px; border-radius: 8px; border: 1px solid var(--border);';

        // Export PNG button
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
            showToast(`${title} Chart exported as PNG!`, 'success');
        });

        // Fullscreen button
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.type = 'button';
        fullscreenBtn.className = 'p-1 hover:text-cyan text-slate-400 transition-colors flex items-center justify-center';
        fullscreenBtn.title = 'Toggle Fullscreen';
        fullscreenBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">fullscreen</span>';
        
        fullscreenBtn.addEventListener('click', () => {
            if (parent.classList.contains('chart-fullscreen')) {
                // Exit fullscreen
                parent.classList.remove('chart-fullscreen');
                parent.style.cssText = 'height: inherit;';
                fullscreenBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">fullscreen</span>';
            } else {
                // Enter fullscreen
                parent.classList.add('chart-fullscreen');
                parent.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999; background: var(--bg-base); padding: 40px;';
                fullscreenBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">fullscreen_exit</span>';
            }
            setTimeout(() => {
                chartInstance.resize();
            }, 100);
        });

        overlay.appendChild(exportBtn);
        overlay.appendChild(fullscreenBtn);
        parent.appendChild(overlay);

        // Show overlay briefly to introduce, then hide
        parent.addEventListener('mouseenter', () => overlay.classList.add('opacity-100'));
        parent.addEventListener('mouseleave', () => overlay.classList.remove('opacity-100'));
    }

    function initTrendChart(labels, data) {
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;

        currentTrendLabels = labels || currentTrendLabels;
        currentTrendData = data || currentTrendData;

        const colors = getThemeColors();
        if (trendChart) trendChart.destroy();

        trendChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: currentTrendLabels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'DNA Analyses',
                    data: currentTrendData || [12, 19, 3, 5, 2, 3],
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
                }]
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

    function initNucleotideChart(data) {
        const canvas = document.getElementById('nucleotideChart');
        if (!canvas) return;

        currentNucData = data || currentNucData;

        const colors = getThemeColors();
        if (nucleotideChart) nucleotideChart.destroy();

        nucleotideChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ['A', 'T', 'G', 'C'],
                datasets: [{
                    label: 'Frequency',
                    data: currentNucData || [250, 310, 180, 260],
                    backgroundColor: ['#06b6d4', '#84cc16', '#f97316', '#8b5cf6'],
                    borderRadius: 8,
                    maxBarThickness: 32
                }]
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

    // Theme Change Observer
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                initTrendChart();
                initNucleotideChart();
            }
        });
    });
    observer.observe(document.body, { attributes: true });

    // Initialize charts on DOM loaded
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof Chart === 'undefined') return;
        initTrendChart();
        initNucleotideChart();
    });

    return {
        updateTrend: initTrendChart,
        updateNucleotides: initNucleotideChart
    };
})();

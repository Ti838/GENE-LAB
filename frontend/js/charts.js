/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
// charts.js - Dynamic Chart management for GeneLab

window.genelabCharts = (() => {
    let trendChart = null;
    let nucleotideChart = null;

    function getThemeColors() {
        const isLightTheme = document.body?.dataset.theme === 'light';
        return {
            axis: isLightTheme ? '#5b6c84' : '#8d9bb5',
            grid: isLightTheme ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255,255,255,0.06)',
            fill: isLightTheme ? 'rgba(83, 230, 255, 0.16)' : 'rgba(83, 230, 255, 0.14)'
        };
    }

    function initTrendChart(labels, data) {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        const colors = getThemeColors();
        
        if (trendChart) trendChart.destroy();

        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Analyses',
                    data: data || [0, 0, 0, 0, 0, 0],
                    borderColor: '#53e6ff',
                    backgroundColor: colors.fill,
                    pointBackgroundColor: '#53e6ff',
                    pointRadius: 4,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: colors.grid }, ticks: { color: colors.axis, stepSize: 1 } },
                    x: { grid: { color: colors.grid }, ticks: { color: colors.axis } }
                }
            }
        });
    }

    function initNucleotideChart(data) {
        const ctx = document.getElementById('nucleotideChart');
        if (!ctx) return;

        const colors = getThemeColors();
        if (nucleotideChart) nucleotideChart.destroy();

        nucleotideChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['A', 'T', 'G', 'C'],
                datasets: [{
                    data: data || [0, 0, 0, 0],
                    backgroundColor: ['#ff6b6b', '#00d4ff', '#06ffa0', '#ffd166'],
                    borderRadius: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: colors.grid }, ticks: { color: colors.axis } },
                    x: { grid: { display: false }, ticks: { color: colors.axis } }
                }
            }
        });
    }

    // Initialize with defaults or wait for data
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

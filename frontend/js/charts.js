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

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.25)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');

        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Analyses',
                    data: data || [0, 0, 0, 0, 0, 0],
                    borderColor: '#00d4ff',
                    borderWidth: 3,
                    backgroundColor: gradient,
                    pointBackgroundColor: '#00d4ff',
                    pointBorderColor: 'rgba(255,255,255,0.2)',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.45,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(10, 25, 41, 0.9)',
                        titleFont: { family: 'Manrope', size: 13, weight: 'bold' },
                        bodyFont: { family: 'IBM Plex Sans', size: 12 },
                        padding: 12,
                        cornerRadius: 12,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        grid: { color: colors.grid, drawBorder: false },
                        ticks: { color: colors.axis, font: { size: 10, weight: '600' }, stepSize: 1, padding: 10 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: colors.axis, font: { size: 10, weight: '600' }, padding: 10 }
                    }
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

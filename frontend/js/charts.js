// charts.js - Chart.js Initializations for GeneLab
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Chart === 'undefined') {
        return;
    }

    const isLightTheme = document.body?.dataset.theme === 'light';
    const axisColor = isLightTheme ? '#5b6c84' : '#8d9bb5';
    const gridColor = isLightTheme ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255,255,255,0.06)';
    const lineFill = isLightTheme ? 'rgba(83, 230, 255, 0.16)' : 'rgba(83, 230, 255, 0.14)';

    Chart.defaults.color = axisColor;
    Chart.defaults.borderColor = gridColor;

    const barCtx = document.getElementById('nucleotideChart');
    if (barCtx) {
        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['A', 'T', 'G', 'C'],
                datasets: [{
                    label: 'Count',
                    data: [2800, 2200, 1900, 3100],
                    backgroundColor: ['#53e6ff', '#3ff0bf', '#c9f071', '#ff9e72'],
                    borderRadius: 14,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: gridColor }, ticks: { color: axisColor } },
                    x: { grid: { display: false }, ticks: { color: axisColor } }
                }
            }
        });
    }

    const lineCtx = document.getElementById('trendChart');
    if (lineCtx) {
        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Analyses',
                    data: [12, 19, 25, 45, 60, 85],
                    borderColor: '#53e6ff',
                    backgroundColor: lineFill,
                    pointBackgroundColor: '#53e6ff',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.42,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: axisColor }
                    }
                },
                scales: {
                    y: { grid: { color: gridColor }, ticks: { color: axisColor } },
                    x: { grid: { color: gridColor }, ticks: { color: axisColor } }
                }
            }
        });
    }

    const storageCtx = document.getElementById('storageChart');
    if (storageCtx) {
        new Chart(storageCtx, {
            type: 'doughnut',
            data: {
                labels: ['Used', 'Free'],
                datasets: [{
                    data: [84, 16],
                    backgroundColor: ['#ff9e72', isLightTheme ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255,255,255,0.05)'],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                cutout: '78%',
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: axisColor }
                    }
                }
            }
        });
    }
});
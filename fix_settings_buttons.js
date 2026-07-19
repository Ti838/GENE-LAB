const fs = require('fs');

const path = 'frontend/pages/ops-control/settings.html';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    `<button class="btn-premium btn-ghost py-2.5 rounded-xl text-sm" onclick="window.showToast?.('Security policies refreshed successfully.', 'success')">Refresh Policy</button>`,
    `<button id="qa-refresh-policy" class="btn-premium btn-ghost py-2.5 rounded-xl text-sm">Refresh Policy</button>`
);
content = content.replace(
    `<button class="btn-premium btn-ghost py-2.5 rounded-xl text-sm" onclick="window.showToast?.('Configuration exported to secure log.', 'success')">Export Config</button>`,
    `<button id="qa-export-config" class="btn-premium btn-ghost py-2.5 rounded-xl text-sm">Export Config</button>`
);
content = content.replace(
    `<button class="btn-premium btn-ghost py-2.5 rounded-xl text-sm" onclick="window.showToast?.('Analysis queue restarted.', 'warning')">Restart Queue</button>`,
    `<button id="qa-restart-queue" class="btn-premium btn-ghost py-2.5 rounded-xl text-sm">Restart Queue</button>`
);
content = content.replace(
    `<button class="btn-premium btn-cyan py-2.5 rounded-xl text-sm font-bold" onclick="window.showToast?.('System health check passed: All services optimal.', 'success')">Run Health Check</button>`,
    `<button id="qa-health-check" class="btn-premium btn-cyan py-2.5 rounded-xl text-sm font-bold">Run Health Check</button>`
);

const scriptToAdd = `
                document.getElementById('qa-refresh-policy')?.addEventListener('click', () => {
                    if (window.showToast) window.showToast('Security policies refreshed successfully.', 'success');
                });
                document.getElementById('qa-export-config')?.addEventListener('click', () => {
                    if (window.showToast) window.showToast('Configuration exported to secure log.', 'success');
                });
                document.getElementById('qa-restart-queue')?.addEventListener('click', () => {
                    if (window.showToast) window.showToast('Analysis queue restarted.', 'warning');
                });
                document.getElementById('qa-health-check')?.addEventListener('click', () => {
                    if (window.showToast) window.showToast('System health check passed: All services optimal.', 'success');
                });
`;

content = content.replace('});\n            </script>', scriptToAdd + '});\n            </script>');

fs.writeFileSync(path, content, 'utf8');
console.log("Updated Quick Actions event listeners in settings.html");

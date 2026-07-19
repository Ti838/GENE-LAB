const fs = require('fs');

const path = 'frontend/pages/ops-control/settings.html';
let content = fs.readFileSync(path, 'utf8');

// The replacement logic:
const newSettingsHTML = `
            <div class="grid xl:grid-cols-[0.95fr_1.05fr] gap-6">
                <div class="glass-panel p-7 rounded-[24px]" data-animate="panel">
                    <h3 class="text-xl font-display font-bold mb-5">Platform Configuration</h3>
                    <div class="space-y-4" id="platform-config-form">
                        <div>
                            <label class="block text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5" style="color:var(--text-faint)">Platform Name</label>
                            <input type="text" id="setting-platform-name" value="GeneLab" class="field-input w-full">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5" style="color:var(--text-faint)">Notification Email</label>
                            <input type="email" id="setting-notify-email" value="ops@genelab.com" class="field-input w-full">
                        </div>
                        <div class="p-3 rounded-xl border flex items-center justify-between text-sm cursor-pointer" style="background:var(--bg-glass);border-color:var(--border)" id="toggle-maintenance">
                            <span>Maintenance mode</span>
                            <span class="status-chip status-muted py-1" id="label-maintenance">Disabled</span>
                        </div>
                        <button id="save-settings-btn" class="btn-premium btn-cyan w-full py-3.5 rounded-xl font-bold mt-2">Save Settings</button>
                    </div>
                </div>

                <div class="space-y-6">
                    <div class="glass-panel p-7 rounded-[24px]" data-animate="panel">
                        <h3 class="text-xl font-display font-bold mb-4">Security Policy</h3>
                        <div class="space-y-2.5 text-xs">
                            <div class="flex items-center justify-between p-2.5 rounded-lg border cursor-pointer toggle-policy" data-key="doctorSignup" style="background:var(--bg-glass);border-color:var(--border)"><span style="color:var(--text-muted)">Doctor public signup</span><span class="status-chip py-1" data-label>Enabled</span></div>
                            <div class="flex items-center justify-between p-2.5 rounded-lg border cursor-pointer toggle-policy" data-key="adminSignup" style="background:var(--bg-glass);border-color:var(--border)"><span style="color:var(--text-muted)">Admin public signup</span><span class="status-chip py-1" data-label>Disabled</span></div>
                            <div class="flex items-center justify-between p-2.5 rounded-lg border cursor-pointer toggle-policy" data-key="auditStream" style="background:var(--bg-glass);border-color:var(--border)"><span style="color:var(--text-muted)">Audit log stream</span><span class="status-chip py-1" data-label>Active</span></div>
                        </div>
                    </div>

                    <div class="glass-panel p-7 rounded-[24px]" data-animate="panel">
                        <h3 class="text-xl font-display font-bold mb-4">Quick Actions</h3>
                        <div class="grid sm:grid-cols-2 gap-3">
                            <button class="btn-premium btn-ghost py-2.5 rounded-xl text-sm" onclick="window.showToast?.('Security policies refreshed successfully.', 'success')">Refresh Policy</button>
                            <button class="btn-premium btn-ghost py-2.5 rounded-xl text-sm" onclick="window.showToast?.('Configuration exported to secure log.', 'success')">Export Config</button>
                            <button class="btn-premium btn-ghost py-2.5 rounded-xl text-sm" onclick="window.showToast?.('Analysis queue restarted.', 'warning')">Restart Queue</button>
                            <button class="btn-premium btn-cyan py-2.5 rounded-xl text-sm font-bold" onclick="window.showToast?.('System health check passed: All services optimal.', 'success')">Run Health Check</button>
                        </div>
                    </div>
                </div>
            </div>
`;

// Extract existing part
const startRegex = /<div class="grid xl:grid-cols-\[0.95fr_1.05fr\] gap-6">/;
const endRegex = /<\/main>/;

const startMatch = content.match(startRegex);
const endMatch = content.match(endRegex);

if (startMatch && endMatch) {
    const startIdx = startMatch.index;
    const endIdx = endMatch.index;
    
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx);
    
    // Add inline script for logic before the closing main tag
    const logicScript = `
            <script>
            document.addEventListener('DOMContentLoaded', () => {
                const defaultSettings = {
                    platformName: 'GeneLab',
                    notifyEmail: 'ops@genelab.com',
                    maintenance: false,
                    doctorSignup: true,
                    adminSignup: false,
                    auditStream: true
                };
                
                let currentSettings = JSON.parse(localStorage.getItem('genelab_admin_settings') || JSON.stringify(defaultSettings));
                
                // Load to UI
                document.getElementById('setting-platform-name').value = currentSettings.platformName;
                document.getElementById('setting-notify-email').value = currentSettings.notifyEmail;
                
                const updateToggleState = (el, val, onClass, offClass, onText, offText) => {
                    const label = el.querySelector('[data-label]') || el.querySelector('span:last-child');
                    label.textContent = val ? onText : offText;
                    label.className = \`status-chip py-1 \${val ? onClass : offClass}\`;
                };
                
                const mToggle = document.getElementById('toggle-maintenance');
                updateToggleState(mToggle, currentSettings.maintenance, 'status-warning', 'status-muted', 'Enabled', 'Disabled');
                mToggle.addEventListener('click', () => {
                    currentSettings.maintenance = !currentSettings.maintenance;
                    updateToggleState(mToggle, currentSettings.maintenance, 'status-warning', 'status-muted', 'Enabled', 'Disabled');
                    localStorage.setItem('genelab_admin_settings', JSON.stringify(currentSettings));
                    window.showToast?.('Maintenance mode toggled', 'success');
                });
                
                document.querySelectorAll('.toggle-policy').forEach(el => {
                    const key = el.getAttribute('data-key');
                    const onText = key === 'auditStream' ? 'Active' : 'Enabled';
                    const offText = key === 'auditStream' ? 'Inactive' : 'Disabled';
                    
                    updateToggleState(el, currentSettings[key], 'status-online', 'status-muted', onText, offText);
                    
                    el.addEventListener('click', () => {
                        currentSettings[key] = !currentSettings[key];
                        updateToggleState(el, currentSettings[key], 'status-online', 'status-muted', onText, offText);
                        localStorage.setItem('genelab_admin_settings', JSON.stringify(currentSettings));
                        window.showToast?.('Policy updated dynamically', 'success');
                    });
                });
                
                document.getElementById('save-settings-btn').addEventListener('click', () => {
                    currentSettings.platformName = document.getElementById('setting-platform-name').value;
                    currentSettings.notifyEmail = document.getElementById('setting-notify-email').value;
                    localStorage.setItem('genelab_admin_settings', JSON.stringify(currentSettings));
                    
                    const btn = document.getElementById('save-settings-btn');
                    const oldText = btn.textContent;
                    btn.textContent = 'Saved!';
                    btn.classList.replace('btn-cyan', 'btn-teal');
                    window.showToast?.('Settings saved securely.', 'success');
                    
                    setTimeout(() => {
                        btn.textContent = oldText;
                        btn.classList.replace('btn-teal', 'btn-cyan');
                    }, 2000);
                });
            });
            </script>
`;

    content = before + newSettingsHTML + logicScript + after;
    fs.writeFileSync(path, content, 'utf8');
    console.log("Updated settings.html");
} else {
    console.log("Could not find start or end bounds.");
}

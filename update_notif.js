const fs = require('fs');

const appJsPath = 'frontend/js/app.js';
let appJs = fs.readFileSync(appJsPath, 'utf8');

const targetStr = `  function markAllRead() {
    badge.classList.add('hidden');
    localStorage.setItem('genelab_notif_read_at', Date.now().toString());
  }`;

const replacementStr = `  function markAllRead() {
    badge.classList.add('hidden');
    localStorage.setItem('genelab_notif_read_at', Date.now().toString());
    listEl.innerHTML = '';
    const emptyEl = document.createElement('div');
    emptyEl.className = 'text-center py-6 text-xs text-slate-500 font-medium';
    emptyEl.textContent = 'All caught up! No new notifications.';
    listEl.appendChild(emptyEl);
  }`;

if (appJs.includes(targetStr)) {
    appJs = appJs.replace(targetStr, replacementStr);
    fs.writeFileSync(appJsPath, appJs, 'utf8');
    console.log("Updated markAllRead()");
} else {
    console.log("Could not find targetStr");
}

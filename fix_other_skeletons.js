const fs = require('fs');
const path = require('path');

const filesToUpdate = {
    'analysis.js': {
        target: `fileContainer.innerHTML = '<p class="italic text-center p-4" style="color:var(--text-faint)">Loading bio-assets...</p>';`,
        replacement: `fileContainer.innerHTML = Array(3).fill('<div class="p-4 rounded-xl border mb-3 flex items-center justify-between" style="background:var(--bg-glass);border-color:var(--border)"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-slate-400/20 animate-pulse"></div><div class="space-y-2"><div class="w-32 h-3 bg-slate-400/20 rounded animate-pulse"></div><div class="w-20 h-2 bg-slate-400/20 rounded animate-pulse"></div></div></div></div>').join('');`
    },
    'upload.js': {
        target: `fileListContainer.innerHTML = '<p class="italic text-center p-4 text-sm" style="color:var(--text-faint)">Loading bio-assets...</p>';`,
        replacement: `fileListContainer.innerHTML = Array(3).fill('<div class="p-4 rounded-xl border mb-3 flex items-center justify-between" style="background:var(--bg-glass);border-color:var(--border)"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-slate-400/20 animate-pulse"></div><div class="space-y-2"><div class="w-32 h-3 bg-slate-400/20 rounded animate-pulse"></div><div class="w-20 h-2 bg-slate-400/20 rounded animate-pulse"></div></div></div></div>').join('');`
    },
    'compare.js': {
        target: `container.innerHTML = '<p class="italic text-center col-span-2 p-4" style="color:var(--text-faint)">Loading files...</p>';`,
        replacement: `container.innerHTML = Array(4).fill('<div class="p-4 rounded-xl border flex flex-col gap-3" style="background:var(--bg-glass);border-color:var(--border)"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-slate-400/20 animate-pulse"></div><div class="space-y-2"><div class="w-24 h-3 bg-slate-400/20 rounded animate-pulse"></div><div class="w-16 h-2 bg-slate-400/20 rounded animate-pulse"></div></div></div></div>').join('');`
    },
    'notes.js': {
        target: `notesList.innerHTML = '<p class="italic text-center p-4" style="color:var(--text-faint)">Loading...</p>';`,
        replacement: `notesList.innerHTML = Array(3).fill('<div class="p-4 rounded-xl border mb-3 flex flex-col gap-2" style="background:var(--bg-glass);border-color:var(--border)"><div class="w-3/4 h-3 bg-slate-400/20 rounded animate-pulse"></div><div class="w-1/2 h-3 bg-slate-400/20 rounded animate-pulse"></div></div>').join('');`
    },
    'app.js': {
        target: `const loadingEl = document.createElement('div');
    loadingEl.className = 'text-center py-6 text-xs text-slate-500';
    loadingEl.textContent = 'Loading...';
    listEl.appendChild(loadingEl);`,
        replacement: `const loadingEl = document.createElement('div');
    loadingEl.innerHTML = Array(3).fill('<div class="p-4 rounded-xl border mb-2 flex items-center gap-3" style="background:var(--bg-glass);border-color:var(--border)"><div class="w-8 h-8 rounded-full bg-slate-400/20 animate-pulse"></div><div class="space-y-2 flex-1"><div class="w-full h-3 bg-slate-400/20 rounded animate-pulse"></div><div class="w-1/2 h-2 bg-slate-400/20 rounded animate-pulse"></div></div></div>').join('');
    listEl.appendChild(loadingEl);`
    }
};

const jsDir = path.join(__dirname, 'frontend', 'js');

for (const [filename, config] of Object.entries(filesToUpdate)) {
    const filePath = path.join(jsDir, filename);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes(config.target)) {
            content = content.replace(config.target, config.replacement);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log("Updated", filename);
        } else {
            console.log("Could not find target in", filename);
        }
    }
}

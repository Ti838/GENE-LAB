const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, 'frontend', 'js');
const files = fs.readdirSync(jsDir).map(f => path.join(jsDir, f)).filter(f => f.endsWith('.js'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    const replacements = [
        ["includes('ops-control/doctors.html')", "includes('ops-control/doctors')"],
        ["includes('ops-control/data.html')", "includes('ops-control/data')"],
        ["includes('ops-control/logs.html')", "includes('ops-control/logs')"],
        ["endsWith('login.html')", "(path.endsWith('login.html') || path.endsWith('/login'))"],
        ["endsWith('index.html')", "(path.endsWith('index.html') || path === '/' || path === '')"],
        ["includes('compare.html')", "includes('compare')"],
        ["includes('mobile-blocked.html')", "includes('mobile-blocked')"],
        ["includes('doctor/dashboard.html')", "includes('doctor/dashboard')"],
        ["includes('notes.html')", "includes('notes')"],
        ["includes('reports.html')", "includes('reports')"],
        ["includes('researcher/dashboard.html')", "includes('researcher/dashboard')"]
    ];

    replacements.forEach(([target, rep]) => {
        if (content.includes(target)) {
            content = content.replaceAll(target, rep);
            changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log("Fixed routing in", path.basename(file));
    }
});

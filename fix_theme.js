const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.html')) {
            results.push(file);
        }
    });
    return results;
}

const htmlFiles = walkDir(path.join(__dirname, 'frontend', 'pages'));
const loginFile = path.join(__dirname, 'frontend', 'login.html');
if (fs.existsSync(loginFile)) htmlFiles.push(loginFile);
const indexFile = path.join(__dirname, 'frontend', 'index.html');
if (fs.existsSync(indexFile)) htmlFiles.push(indexFile);

htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // Find the toggle button which has 'text-white' and remove it, add text-inherit or nothing
    content = content.replace(/<button([^>]*)data-theme-toggle([^>]*)text-white/g, '<button$1data-theme-toggle$2');
    content = content.replace(/text-white([^>]*)data-theme-toggle/g, '$1data-theme-toggle');
    content = content.replace(/<button class="([^"]*) text-white" data-theme-toggle>/g, '<button class="$1 text-[var(--text)]" data-theme-toggle>');
    content = content.replace(/<button class="fixed top-8 right-8 z-50 p-3 rounded-full glass-panel hover:scale-105 transition-all text-white" data-theme-toggle>/g, '<button class="fixed top-8 right-8 z-50 p-3 rounded-full glass-panel hover:scale-105 transition-all" data-theme-toggle style="color: var(--text);">');

    // Make sure ?v=3 becomes ?v=4 to bust cache again for the login issue
    content = content.replace(/\?v=3/g, '?v=4');

    fs.writeFileSync(file, content, 'utf8');
});
console.log("Fixed theme toggle and incremented cache to v4");

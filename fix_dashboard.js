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
        } else if (file.endsWith('.html') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const frontendDir = path.join(__dirname, 'frontend');
const files = walkDir(frontendDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Fix css??v=...Text to cssText
    const newContent = content.replace(/css\?\?v=\d+Text/g, 'cssText');
    if (newContent !== content) {
        content = newContent;
        changed = true;
    }

    // If it's app.js, prevent sidebar avatar injection for admin
    if (file.endsWith('app.js')) {
        const target = `const avatarContainer = document.createElement('div');`;
        const replacement = `if (window.location.pathname.includes('/ops-control/')) return;\n            const avatarContainer = document.createElement('div');`;
        if (content.includes(target) && !content.includes(replacement)) {
            content = content.replace(target, replacement);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log("Updated", file);
    }
});

const fs = require('fs');

const path = 'frontend/js/app.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /function setupHeaderUserMenu\([^)]*\)\s*\{/;
if (regex.test(content)) {
    content = content.replace(regex, `function setupHeaderUserMenu(themeToggle, user) {\n  if (window.location.pathname.includes('/ops-control/')) return;`);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Replaced using regex.");
} else {
    console.log("Regex not found.");
}

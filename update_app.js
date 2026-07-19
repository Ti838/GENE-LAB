const fs = require('fs');

const path = 'frontend/js/app.js';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `function setupHeaderUserMenu(themeToggle, user) {
    const parent = themeToggle.parentElement;`;

const replacementStr = `function setupHeaderUserMenu(themeToggle, user) {
    if (window.location.pathname.includes('/ops-control/')) return;
    const parent = themeToggle.parentElement;`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Updated setupHeaderUserMenu");
} else {
    console.log("Could not find target string.");
}

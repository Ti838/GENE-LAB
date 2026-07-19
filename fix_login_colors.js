const fs = require('fs');
const path = require('path');

const loginFile = path.join(__dirname, 'frontend', 'pages', 'login.html');
if (fs.existsSync(loginFile)) {
    let content = fs.readFileSync(loginFile, 'utf8');

    // Remove inline color:white and use CSS variables or classes
    content = content.replace(/color:white;/g, 'color:var(--text);');
    content = content.replace(/color:white"/g, 'color:var(--text);"');
    content = content.replace(/color:rgba\(255,255,255,0\.7\)/g, 'color:var(--text-muted)');

    // Add a panel class to the right side form wrapper for light mode contrast if not present
    if (!content.includes('glass-panel" style="padding: 2rem;')) {
        content = content.replace(/<div class="form-wrap">/g, '<div class="form-wrap glass-panel" style="padding: 2rem; border-radius: 24px;">');
    }

    // Also remove any hardcoded text-white in classes
    content = content.replace(/text-white/g, 'text-[var(--text)]');

    fs.writeFileSync(loginFile, content, 'utf8');
    console.log("Fixed login.html inline colors.");
} else {
    console.log("login.html not found at", loginFile);
}

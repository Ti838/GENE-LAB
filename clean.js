const fs = require('fs');
let content = fs.readFileSync('frontend/theme.css', 'utf8');

// Replace all non-ascii characters in comments with hyphens
content = content.replace(/\/\*.*?\*\//gs, (match) => {
    return match.replace(/[^\x00-\x7F]/g, '-');
});

fs.writeFileSync('frontend/theme.css', content, 'utf8');
console.log("Cleaned");

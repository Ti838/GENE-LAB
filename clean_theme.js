const fs = require('fs');
const path = require('path');

const themePath = path.join(__dirname, 'frontend', 'theme.css');
let themeContent = fs.readFileSync(themePath, 'utf8');

// Replace all invalid UTF-8 sequences (Replacement Character U+FFFD) 
// and other weird artifacts in comments with standard hyphens
themeContent = themeContent.replace(//g, '-');
themeContent = themeContent.replace(/"\?/g, '-');
themeContent = themeContent.replace(/\?/g, '-');
themeContent = themeContent.replace(/--+-/g, '---'); // collapse long dashes

fs.writeFileSync(themePath, themeContent, 'utf8');
console.log("Cleaned theme.css");

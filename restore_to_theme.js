const fs = require('fs');
const path = require('path');

const varsPath = path.join(__dirname, 'extracted_vars.css');
const themePath = path.join(__dirname, 'frontend', 'theme.css');

const varsContent = fs.readFileSync(varsPath, 'utf8');
const themeContent = fs.readFileSync(themePath, 'utf8');

// To prevent duplicate insertion if someone runs this twice
if (!themeContent.includes('--bg-base:       #030b14;')) {
    fs.writeFileSync(themePath, varsContent + '\n\n' + themeContent, 'utf8');
    console.log("Prepended missing CSS variables to theme.css successfully.");
} else {
    console.log("CSS variables already exist in theme.css");
}

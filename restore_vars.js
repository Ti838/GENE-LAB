const fs = require('fs');
const path = require('path');

const oldThemePath = path.join(__dirname, 'old_theme.css');
const newThemePath = path.join(__dirname, 'frontend', 'theme.css');

let oldTheme = fs.readFileSync(oldThemePath, 'utf8');
let newTheme = fs.readFileSync(newThemePath, 'utf8');

// Extract the CSS variables from old_theme.css
// They start at "/* ─────────────────────────────────────────────────────────────────\n   DARK THEME"
// and end before "/* ─────────────────────────────────────────────────────────────────\n   TYPOGRAPHY" or similar.
const darkThemeMatch = oldTheme.indexOf('/* ─────────────────────────────────────────────────────────────────\r\n   DARK THEME (default)');
let darkThemeStart = darkThemeMatch;
if (darkThemeStart === -1) {
    darkThemeStart = oldTheme.indexOf('/* ─────────────────────────────────────────────────────────────────\n   DARK THEME (default)');
}

const endMatch = oldTheme.indexOf('/* ─────────────────────────────────────────────────────────────────\r\n   TYPOGRAPHY');
let endPos = endMatch;
if (endPos === -1) {
    endPos = oldTheme.indexOf('/* ─────────────────────────────────────────────────────────────────\n   TYPOGRAPHY');
}
if (endPos === -1) {
    // Just find the end of [data-theme="light"] block
    const lightEnd = oldTheme.indexOf('}\r\n\r\n/*', oldTheme.indexOf('[data-theme="light"]'));
    if (lightEnd !== -1) endPos = lightEnd + 1;
}

if (darkThemeStart !== -1 && endPos !== -1) {
    const variablesBlock = oldTheme.substring(darkThemeStart, endPos);
    
    // Prepend to new theme if it doesn't already have --bg-base
    if (!newTheme.includes('--bg-base')) {
        fs.writeFileSync(newThemePath, variablesBlock + '\n\n' + newTheme, 'utf8');
        console.log("Prepended variables to theme.css");
    } else {
        console.log("theme.css already has variables.");
    }
} else {
    console.log("Could not find variables block in old_theme.css");
}

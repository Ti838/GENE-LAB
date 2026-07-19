const fs = require('fs');
const { execSync } = require('child_process');

try {
    const currentThemePath = 'frontend/theme.css';
    let currentTheme = fs.readFileSync(currentThemePath, 'utf8');

    // Remove everything before .col-span-1
    const safeAnchor = '.col-span-1 { grid-column: span 1 / span 1; }';
    const anchorIdx = currentTheme.indexOf(safeAnchor);
    if (anchorIdx !== -1) {
        currentTheme = currentTheme.substring(anchorIdx);
    }

    // Now extract the clean variables from git
    const oldContent = execSync('git show c37b56f3afcf7cafbd79cda6017d764f31bc2638:frontend/theme.css').toString('utf8');
    
    // Find where the Light Theme variables end (we look for the closing brace after the light theme background prop)
    const lightThemeStart = oldContent.indexOf('[data-theme="light"] {');
    const backgroundProp = oldContent.indexOf('color: var(--text);', lightThemeStart);
    let endIdx = oldContent.indexOf('}', backgroundProp) + 1;

    if (lightThemeStart !== -1 && endIdx !== -1) {
        const cleanHeader = oldContent.substring(0, endIdx).trim();
        fs.writeFileSync(currentThemePath, cleanHeader + '\n\n' + currentTheme, 'utf8');
        console.log("SUCCESS: Rebuilt theme.css completely cleanly.");
    } else {
        console.log("Failed to find endIdx in oldContent.", { lightThemeStart, backgroundProp, endIdx });
    }

} catch (e) {
    console.error("Error:", e);
}

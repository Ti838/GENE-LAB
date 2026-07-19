const fs = require('fs');
const { execSync } = require('child_process');

try {
    // Read the old version directly via git to avoid encoding issues
    const oldContent = execSync('git show c37b56f3afcf7cafbd79cda6017d764f31bc2638:frontend/theme.css').toString('utf8');
    
    // Find where the Dark theme variables start
    const darkStartStr = '/* ─────────────────────────────────────────────────────────────────\n   DARK THEME (default)';
    let startIdx = oldContent.indexOf(darkStartStr);
    
    if (startIdx === -1) {
        // Fallback search
        startIdx = oldContent.indexOf(':root, [data-theme="dark"] {');
    }
    
    // Find where light theme variables end
    const lightThemeStr = '/* ─────────────────────────────────────────────────────────────────\n   LIGHT THEME';
    let endIdx = oldContent.indexOf('/* ─────────────────────────────────────────────────────────────────', oldContent.indexOf(lightThemeStr) + lightThemeStr.length);
    
    if (endIdx === -1) {
       // fallback search
       endIdx = oldContent.indexOf('.btn-danger {');
    }

    if (startIdx !== -1 && endIdx !== -1) {
        // Step back before the end block comment
        const variablesBlock = oldContent.substring(startIdx, endIdx).trim();
        
        const currentThemePath = 'frontend/theme.css';
        let currentTheme = fs.readFileSync(currentThemePath, 'utf8');
        
        if (!currentTheme.includes('--bg-base:       #030b14;')) {
            fs.writeFileSync(currentThemePath, variablesBlock + '\n\n' + currentTheme, 'utf8');
            console.log("Successfully restored CSS variables to theme.css");
        } else {
            console.log("theme.css already has variables");
        }
    } else {
        console.log("Failed to locate variables block bounds.", { startIdx, endIdx });
    }
} catch (e) {
    console.error("Error:", e);
}

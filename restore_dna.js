const fs = require('fs');
const { execSync } = require('child_process');

try {
    const currentThemePath = 'frontend/theme.css';
    let currentTheme = fs.readFileSync(currentThemePath, 'utf8');

    // Extract the full theme.css from 04cedce
    let oldContent = execSync('git show 04cedce:frontend/theme.css').toString('utf8');
    
    // Convert invalid unicode to hyphens in the old content to avoid corruption
    oldContent = oldContent.replace(/\/\*.*?\*\//gs, (match) => {
        return match.replace(/[^\x00-\x7F]/g, '-');
    });

    // Find the start of the DNA CANVAS LAYER
    const dnaStartStr = 'DNA CANVAS LAYER';
    let startIdx = oldContent.indexOf(dnaStartStr);
    
    // Find where the ICONS block begins
    let endIdx = oldContent.indexOf('ICONS');

    if (startIdx !== -1 && endIdx !== -1) {
        // Back up startIdx to the start of the comment block
        startIdx = oldContent.lastIndexOf('/*', startIdx);
        endIdx = oldContent.lastIndexOf('/*', endIdx);
        
        const missingBlock = oldContent.substring(startIdx, endIdx).trim();
        
        // Find insert point in current theme
        const insertTarget = '.col-span-1 {';
        const insertIdx = currentTheme.indexOf(insertTarget);
        
        if (insertIdx !== -1 && !currentTheme.includes('#dna-canvas')) {
            currentTheme = currentTheme.substring(0, insertIdx) + missingBlock + '\n\n' + currentTheme.substring(insertIdx);
            fs.writeFileSync(currentThemePath, currentTheme, 'utf8');
            console.log("SUCCESS: Restored missing DNA and Layout CSS!");
        } else {
            console.log("Could not find insertTarget or block already exists.");
        }
    } else {
        console.log("Could not find bounds in 04cedce.", { startIdx, endIdx });
    }
} catch (e) {
    console.error("Error:", e);
}

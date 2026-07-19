const fs = require('fs');
const { execSync } = require('child_process');

try {
    const currentThemePath = 'frontend/theme.css';
    let currentTheme = fs.readFileSync(currentThemePath, 'utf8');

    // Extract the full theme.css from 04cedce
    let oldContent = execSync('git show 04cedce:frontend/theme.css').toString('utf8');
    
    // SAFEGUARD: Replace invalid Unicode characters before doing anything
    oldContent = oldContent.replace(/\/\*.*?\*\//gs, (match) => {
        return match.replace(/[^\x00-\x7F]/g, '-');
    });

    // We need the block starting with "DNA CANVAS LAYER" up to ".col-span-1"
    const dnaStart = oldContent.indexOf('DNA CANVAS LAYER');
    let startIdx = oldContent.lastIndexOf('/*', dnaStart);
    let endIdx = oldContent.indexOf('.col-span-1');
    
    if (startIdx !== -1 && endIdx !== -1) {
        let missingBlock = oldContent.substring(startIdx, endIdx).trim();
        
        // Let's insert this block directly after the Light Theme block in currentTheme
        // OR we can just insert it right before `.col-span-1` in currentTheme!
        const insertTarget = '.col-span-1 {';
        const insertIdx = currentTheme.indexOf(insertTarget);
        
        if (insertIdx !== -1) {
            // Check if it's already there
            if (!currentTheme.includes('#dna-canvas {') || !currentTheme.includes('z-index: 0;')) {
                currentTheme = currentTheme.substring(0, insertIdx) + missingBlock + '\n\n' + currentTheme.substring(insertIdx);
                fs.writeFileSync(currentThemePath, currentTheme, 'utf8');
                console.log("SUCCESS: Restored DNA canvas and layout layers to theme.css");
            } else {
                console.log("Looks like it's already in there somewhere.");
            }
        } else {
            console.log("Could not find insertTarget in currentTheme.");
        }
    } else {
        console.log("Could not find start or end bounds in 04cedce.");
    }
} catch (e) {
    console.error("Error:", e);
}

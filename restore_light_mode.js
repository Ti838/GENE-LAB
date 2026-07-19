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
    
    // Find the LIGHT MODE OVERRIDES block
    let startIdx = oldContent.indexOf('LIGHT MODE OVERRIDES');
    if (startIdx !== -1) {
       // back up to the start of the comment block
       startIdx = oldContent.lastIndexOf('/*', startIdx);
    }
    
    if (startIdx !== -1) {
        // Just take everything from this block to the end of the old theme.css file
        let block = oldContent.substring(startIdx).trim();
        
        // Remove @media print from the block if it exists (it might be duplicated)
        const printStart = block.indexOf('@media print');
        if (printStart !== -1) {
            block = block.substring(0, printStart).trim();
        }
        
        // Let's make sure it's not already in currentTheme
        if (!currentTheme.includes('body[data-theme="light"] .glass-panel')) {
            const printIdx = currentTheme.indexOf('@media print');
            if (printIdx !== -1) {
                currentTheme = currentTheme.substring(0, printIdx) + '\n\n' + block + '\n\n' + currentTheme.substring(printIdx);
            } else {
                currentTheme += '\n\n' + block;
            }
            
            fs.writeFileSync(currentThemePath, currentTheme, 'utf8');
            console.log("SUCCESS: Appended LIGHT MODE OVERRIDES to theme.css.");
        } else {
            console.log("Overrides already exist.");
        }
    } else {
        console.log("Could not find LIGHT MODE OVERRIDES block in 04cedce.");
    }

} catch (e) {
    console.error("Error:", e);
}

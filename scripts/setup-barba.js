const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.html')) {
            results.push(file);
        }
    });
    return results;
}

const htmlFiles = walk('c:/Users/TIMON/Desktop/GENE/genelab/frontend/pages');

htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    if (content.includes('data-barba="wrapper"')) return;
    
    // Add wrapper to body
    content = content.replace(/<body([^>]*)>/, '<body$1 data-barba="wrapper">');
    
    // Add container to main
    if (content.includes('<main')) {
        content = content.replace(/<main([^>]*)>/, '<main$1 data-barba="container" data-barba-namespace="' + path.basename(file, '.html') + '">');
    } else {
        // If no main tag, wrap the content after body
        // Just as a fallback, most pages should have main
    }

    // Include Barba.js script before closing head
    const barbaScript = `
    <!-- Barba.js for smooth page transitions -->
    <script src="https://unpkg.com/@barba/core"></script>
    <script src="/frontend/js/barba-init.js" defer></script>
`;
    // Add to head but use absolute path or relative?
    // The relative depth is tricky, let's use the depth of the file
    const relDepth = file.split(path.sep).length - 'c:/Users/TIMON/Desktop/GENE/genelab/frontend/pages'.split('/').length;
    let prefix = '../'.repeat(relDepth);
    if (prefix === '') prefix = './';

    const localBarbaScript = `
    <script src="https://unpkg.com/@barba/core"></script>
    <script src="${prefix}../js/barba-init.js" defer></script>
`;

    if (content.includes('</head>')) {
        content = content.replace('</head>', localBarbaScript + '</head>');
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
});

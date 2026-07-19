const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.html')) {
            results.push(file);
        }
    });
    return results;
}

const htmlFiles = walkDir(path.join(__dirname, 'frontend', 'pages'));
htmlFiles.push(path.join(__dirname, 'frontend', 'login.html')); // if it exists
htmlFiles.push(path.join(__dirname, 'frontend', 'index.html'));

const badString = '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900<link rel="stylesheet" href="family=IBM+Plex+Sans:wght@300;400;500;600;700<link rel="stylesheet" href="family=JetBrains+Mono:wght@400;500;700<link rel="stylesheet" href="display=swap" rel="stylesheet">';
const goodString = '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">';

htmlFiles.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        if (content.includes(badString)) {
            content = content.split(badString).join(goodString);
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Fixed: ${file}`);
        }
    }
});
console.log("Done fixing HTML files.");

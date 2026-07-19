const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
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
const loginFile = path.join(__dirname, 'frontend', 'login.html');
if (fs.existsSync(loginFile)) htmlFiles.push(loginFile);
const indexFile = path.join(__dirname, 'frontend', 'index.html');
if (fs.existsSync(indexFile)) htmlFiles.push(indexFile);

htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Append ?v=2 to .js and .css files, but only if they don't already have it
    // Handle .js
    content = content.replace(/\.js(?![\?])/g, '.js?v=2');
    // Handle .css
    content = content.replace(/\.css(?![\?])/g, '.css?v=2');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Cache-busted: ${file}`);
});
console.log("Done adding cache busters.");

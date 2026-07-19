const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend', 'pages', 'ops-control');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove the exact line containing profile.html link
    const newContent = content.replace(/.*<a href="profile\.html".*<\/a>.*\n?/g, '');
    
    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Removed profile link from ${file}`);
    }
});

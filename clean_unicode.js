const fs = require('fs');
let content = fs.readFileSync('frontend/theme.css', 'utf8');
content = content.replace(/"\?/g, '-');
content = content.replace(/\?/g, '-');
content = content.replace(//g, '-');
fs.writeFileSync('frontend/theme.css', content, 'utf8');

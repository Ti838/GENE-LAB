const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend', 'pages', 'ops-control');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Change sidebar text
    content = content.replace(
        /<a href="doctors\.html" class="sidebar-link(\s+active)?"><span class="material-symbols-outlined">manage_accounts<\/span>\s*Doctors<\/a>/g,
        '<a href="doctors.html" class="sidebar-link$1"><span class="material-symbols-outlined">manage_accounts</span> Personnel</a>'
    );
    
    if (file === 'dashboard.html') {
        content = content.replace(/Total Doctors,\$\{stats\.totalDoctors \|\| 0\}/, 'Total Personnel,${stats.totalUsers || 0}');
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated Doctors -> Personnel in ${file}`);
});

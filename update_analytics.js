const fs = require('fs');

const path = 'frontend/pages/ops-control/analytics.html';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/Total Doctors/g, 'Total Personnel');
content = content.replace(/id="kpi-doctors"/g, 'id="kpi-users"');
content = content.replace(/s\('kpi-doctors',  stats\.totalDoctors\);/g, "s('kpi-users',  stats.totalUsers);");
content = content.replace(/\[\'Doctors\', stats\.totalDoctors\|\|0\]/g, "['Personnel', stats.totalUsers||0]");

fs.writeFileSync(path, content, 'utf8');
console.log("Updated analytics text");

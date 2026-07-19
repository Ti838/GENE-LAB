const fs = require('fs');

const path = 'frontend/pages/ops-control/doctors.html';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/Doctor Management/g, 'Personnel Management');
content = content.replace(/Manage access and validation for all medical providers\./g, 'Manage access and validation for all users (Doctors and Researchers).');
content = content.replace(/<th class="p-4">Doctor Credentials<\/th>/g, '<th class="p-4">User Credentials</th>');

fs.writeFileSync(path, content, 'utf8');
console.log("Updated doctors.html text");

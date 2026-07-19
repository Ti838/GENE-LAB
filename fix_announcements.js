const fs = require('fs');

const path = 'frontend/pages/ops-control/dashboard.html';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `if (!data.announcements?.length) return;
                list.innerHTML = '';`;

const replacementStr = `list.innerHTML = '';
                if (!data.announcements?.length) {
                    list.innerHTML = '<p class="col-span-3 text-center italic text-sm py-4" style="color:var(--text-faint)">No recent announcements.</p>';
                    return;
                }`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Updated loadAnnouncements in dashboard.html");
} else {
    console.log("Target string not found in dashboard.html");
}

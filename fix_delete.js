const fs = require('fs');
const path = 'frontend/pages/ops-control/dashboard.html';
let content = fs.readFileSync(path, 'utf8');

const target = `catch(e){}`;
const replacement = `catch(e){ console.error(e); if(window.showToast) window.showToast(e.message || 'Error deleting', 'error'); }`;

if (content.includes(`} catch(e){}`)) {
    content = content.replace(`} catch(e){}`, `} catch(e){ console.error(e); if(window.showToast) window.showToast(e.message || 'Error deleting', 'error'); }`);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Updated catch block in dashboard.html");
} else {
    console.log("Could not find catch(e){}");
}

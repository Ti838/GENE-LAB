const fs = require('fs');

const path = 'frontend/js/admin.js';
let content = fs.readFileSync(path, 'utf8');

const skeletonFunc = `
function _skeletonRows(colSpan, count = 3) {
    const fragment = document.createDocumentFragment();
    for(let i=0; i<count; i++) {
        const tr = document.createElement('tr');
        for(let j=0; j<colSpan; j++) {
            const td = document.createElement('td');
            td.className = 'p-4';
            td.innerHTML = \`<div class="h-4 bg-slate-400/20 rounded animate-pulse w-3/4"></div>\`;
            tr.appendChild(td);
        }
        fragment.appendChild(tr);
    }
    return fragment;
}
`;

if (!content.includes('_skeletonRows')) {
    content = content.replace('function _emptyRow', skeletonFunc + '\nfunction _emptyRow');
    
    // Replace text loading with skeleton
    content = content.replace(`tableBody.appendChild(_emptyRow(6, 'Loading personnel...'));`, `tableBody.appendChild(_skeletonRows(6, 4));`);
    content = content.replace(`dataBody.appendChild(_emptyRow(5, 'Loading registry...'));`, `dataBody.appendChild(_skeletonRows(5, 5));`);
    content = content.replace(`logsBody.appendChild(_emptyRow(5, 'Streaming system audit trail...'));`, `logsBody.appendChild(_skeletonRows(5, 8));`);
    
    fs.writeFileSync(path, content, 'utf8');
    console.log("Added skeleton loaders to admin.js");
} else {
    console.log("Skeleton loaders already added.");
}

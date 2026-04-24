/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// doctor-dashboard.js - Doctor Dashboard real data
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('doctor/dashboard.html')) return;

    try {
        const files = await api.get('/dna/my-files');
        const totalFiles = files.length;
        const analyzedFiles = files.filter(f => f.status === 'analyzed').length;
        const uploadedFiles = files.filter(f => f.status === 'uploaded').length;

        // Update stat cards
        const stats = document.querySelectorAll('[data-stat]');
        stats.forEach(el => {
            switch (el.dataset.stat) {
                case 'totalFiles': el.textContent = totalFiles.toLocaleString(); break;
                case 'analyzed': el.textContent = analyzedFiles.toLocaleString(); break;
                case 'uploaded': el.textContent = uploadedFiles.toLocaleString(); break;
            }
        });

        // Update system activity logs
        const logsContainer = document.getElementById('system-activity-logs');
        if (logsContainer) {
            logsContainer.innerHTML = '';
            const recentFiles = files.slice(0, 3);
            if (recentFiles.length === 0) {
                logsContainer.innerHTML = '<p class="text-slate-500 text-sm italic">No recent activity.</p>';
            } else {
                recentFiles.forEach(f => {
                    const icon = f.status === 'analyzed' ? 'check_circle' : 'history';
                    const color = f.status === 'analyzed' ? 'text-teal' : 'text-cyan';
                    const time = new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    const div = document.createElement('div');
                    div.className = 'flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan/30 transition-all cursor-pointer';
                    div.innerHTML = `
                        <span class="material-symbols-outlined ${color}">${icon}</span>
                        <div>
                            <p class="text-sm font-bold text-white">${f.status === 'analyzed' ? 'Analysis Complete' : 'Upload Complete'}</p>
                            <p class="text-[10px] text-slate-500 font-mono tracking-widest">${f.originalName} - ${time}</p>
                        </div>
                    `;
                    logsContainer.appendChild(div);
                });
            }
        }
    } catch (error) {
        console.error('Dashboard error:', error);
    }
});


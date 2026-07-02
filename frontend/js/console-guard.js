/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Console Guard - Prevents mobile/tablet access to administrative consoles.
 */
(() => {
    // 1. Check User Agent
    const mobileUARegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileUA = mobileUARegex.test(navigator.userAgent);

    // 2. Check viewport size (blocking mobile and portrait tablet widths)
    const isSmallScreen = window.innerWidth < 1024;

    // Avoid redirect loop if already on the blocked page
    const isBlockedPage = window.location.pathname.includes('mobile-blocked.html');

    if ((isMobileUA || isSmallScreen) && !isBlockedPage) {
        // Log block attempt in session storage for debug display
        sessionStorage.setItem('console-block-reason', JSON.stringify({
            userAgent: navigator.userAgent,
            resolution: `${window.innerWidth}x${window.innerHeight}`,
            timestamp: new Date().toISOString(),
            ipPlaceholder: "Logged Security Event"
        }));

        // Determine path to mobile-blocked.html
        let targetPath = 'mobile-blocked.html';
        
        // If nested or using absolute URLs, route properly
        if (window.location.pathname.includes('/pages/')) {
            targetPath = '../console/mobile-blocked.html';
        } else if (window.location.pathname.includes('/console/')) {
            targetPath = 'mobile-blocked.html';
        } else {
            targetPath = '/console/mobile-blocked.html';
        }

        window.location.replace(targetPath);
    }
})();

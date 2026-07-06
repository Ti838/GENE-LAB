/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// theme.js - Theme helpers for GeneLab
(() => {
	const THEME_KEY = 'genelab-theme';

	// 1. Immediately apply theme to root element to prevent white flash
	const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
	document.documentElement.dataset.theme = savedTheme;
	
	// Add preload class to body if it exists, or wait for it
	const applyPreload = () => {
		if (document.body) {
			document.body.classList.add('preload');
			document.body.dataset.theme = savedTheme;
		} else {
			requestAnimationFrame(applyPreload);
		}
	};
	applyPreload();

	function updateUI(theme) {
		document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
			button.setAttribute('aria-pressed', String(theme === 'dark' ? false : true));
			const label = button.querySelector('[data-theme-label]');
			const icon = button.querySelector('.material-symbols-outlined');
			
			if (label) label.textContent = theme === 'dark' ? 'Dark' : 'Light';
			if (icon) icon.textContent = theme === 'dark' ? 'dark_mode' : 'light_mode';
		});
	}

	function injectBrandLogos() {
		const sidebars = document.querySelectorAll('aside');
		sidebars.forEach((aside) => {
			const brandHeader = aside.querySelector('.border-b.flex');
			if (brandHeader) {
				const iconContainer = brandHeader.querySelector('div');
				if (iconContainer) {
					if (!iconContainer.querySelector('img')) {
						iconContainer.className = 'w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center';
						iconContainer.style.background = 'rgba(0, 212, 255, 0.1)';
						iconContainer.style.border = '1px solid rgba(0, 212, 255, 0.25)';
						
						const img = document.createElement('img');
						const isSubDir = window.location.pathname.includes('/doctor/') ||
										 window.location.pathname.includes('/researcher/') ||
										 window.location.pathname.includes('/ops-control/');
						img.src = isSubDir ? '../../assets/images/logo.png' : '../assets/images/logo.png';
						img.className = 'w-7 h-7 object-contain';
						img.alt = 'GeneLab Logo';
						
						iconContainer.innerHTML = '';
						iconContainer.appendChild(img);
					}
				}
			}
		});
	}

	function initTheme() {
		const currentTheme = localStorage.getItem(THEME_KEY) || 'dark';
		document.body.dataset.theme = currentTheme;
		updateUI(currentTheme);
		injectBrandLogos();

		// Remove preload class after a short delay to enable smooth transitions
		setTimeout(() => {
			document.body.classList.remove('preload');
		}, 100);

		document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
			button.addEventListener('click', () => {
				const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
				document.body.dataset.theme = nextTheme;
				document.documentElement.dataset.theme = nextTheme;
				localStorage.setItem(THEME_KEY, nextTheme);
				updateUI(nextTheme);
			});
		});
	}

	// Wait for body to be ready to init interactive parts
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initTheme);
	} else {
		initTheme();
	}
})();

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

	function initTheme() {
		const currentTheme = localStorage.getItem(THEME_KEY) || 'dark';
		document.body.dataset.theme = currentTheme;
		updateUI(currentTheme);

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

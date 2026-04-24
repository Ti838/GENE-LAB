/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
// theme.js - Theme helpers for GeneLab
(() => {
	const THEME_KEY = 'genelab-theme';

	function applyTheme(theme) {
		if (!document.body) {
			return;
		}

		document.body.dataset.theme = theme;
		localStorage.setItem(THEME_KEY, theme);

		document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
			button.setAttribute('aria-pressed', String(theme === 'dark' ? false : true));
			const label = button.querySelector('[data-theme-label]');
			if (label) {
				label.textContent = theme === 'dark' ? 'Dark' : 'Light';
			}
		});
	}

	function initTheme() {
		const savedTheme = localStorage.getItem(THEME_KEY);
		applyTheme(savedTheme || 'light');

		document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
			button.addEventListener('click', () => {
				const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
				applyTheme(nextTheme);
			});
		});
	}

	document.addEventListener('DOMContentLoaded', initTheme);
	window.genelabTheme = { applyTheme, initTheme };
})();

import { browser } from '$app/environment';
import { writable } from 'svelte/store';

type Theme = 'light' | 'dark';

const initial: Theme = browser
	? ((localStorage.getItem('theme') as Theme) ?? 'light')
	: 'light';

export const theme = writable<Theme>(initial);

if (browser) {
	theme.subscribe((t) => {
		document.documentElement.setAttribute('data-theme', t);
		localStorage.setItem('theme', t);
	});
}

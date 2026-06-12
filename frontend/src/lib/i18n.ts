import { browser } from '$app/environment';
import { init, register } from 'svelte-i18n';

register('de', () => import('./i18n/de.json'));
register('en', () => import('./i18n/en.json'));
register('pt-BR', () => import('./i18n/pt-BR.json'));

init({
	fallbackLocale: 'de',
	initialLocale: browser ? (localStorage.getItem('locale') ?? 'de') : 'de'
});

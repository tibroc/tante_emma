// i18n.ts — react-i18next setup. Locale JSON (de/en/pt-BR) reused verbatim from
// the Svelte app. Those files use single-brace placeholders ({n}, {q}, {date},
// {name}) as svelte-i18n did, so i18next interpolation is configured to match.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './i18n/de.json';
import en from './i18n/en.json';
import ptBR from './i18n/pt-BR.json';

export const LOCALES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'pt-BR', label: 'Português' },
];

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('locale') : null;

void i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
    'pt-BR': { translation: ptBR },
  },
  lng: stored ?? 'de',
  fallbackLng: 'de',
  interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
  // Resources are bundled + initialised synchronously, so no Suspense needed.
  react: { useSuspense: false },
});

export function setLocale(code: string) {
  if (typeof localStorage !== 'undefined') localStorage.setItem('locale', code);
  void i18n.changeLanguage(code);
}

export default i18n;

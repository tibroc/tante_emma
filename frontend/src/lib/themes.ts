// themes.ts — TanteEmma accent theme registry, ported from design-ref/themes.jsx.
// `accent` drives the whole UI (buttons, pills, nav, gradients); `accent600` is
// the darker gradient/pressed stop. Light/dark/system + this 5-theme accent
// picker are the only "Tweaks" we promote to real product features.

export interface Theme {
  id: string;
  name: string;
  accent: string;
  accent600: string;
}

export const THEMES: Theme[] = [
  { id: 'fuchsia', name: 'Fuchsia', accent: '#d946ef', accent600: '#a21caf' },
  { id: 'violett', name: 'Violett', accent: '#8b5cf6', accent600: '#6d28d9' },
  { id: 'koralle', name: 'Koralle', accent: '#fb6f4c', accent600: '#c2410c' },
  { id: 'ozean', name: 'Ozean', accent: '#3b82f6', accent600: '#1d4ed8' },
  { id: 'smaragd', name: 'Smaragd', accent: '#10b981', accent600: '#047857' },
];

export const THEME_BY_ACCENT: Record<string, Theme> = Object.fromEntries(
  THEMES.map((t) => [t.accent.toLowerCase(), t]),
);

/** Darker 600 stop for an accent; falls back to a computed oklab mix. */
export function accent600For(hex: string): string {
  return (
    THEME_BY_ACCENT[(hex || '').toLowerCase()]?.accent600 ||
    `color-mix(in oklab, ${hex} 80%, black)`
  );
}

export type ThemeMode = 'light' | 'dark' | 'system';

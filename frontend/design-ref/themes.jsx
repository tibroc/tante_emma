// themes.jsx — TanteEmma theme registry
// Five named accent themes, locked in for reuse. Each entry is the single
// source of truth for that theme's brand color. `accent` drives the whole
// app (buttons, pills, nav, gradients); `accent600` is the darker stop used
// in gradients/pressed states. Add `surfaceTintLight/Dark` later if a theme
// ever needs its own neutral wash — for now they share the warm neutrals.
//
// To use a theme elsewhere: THEMES.find(t => t.id === 'koralle').accent
// or import the whole list for a theme picker.

const THEMES = [
  { id: 'fuchsia',  name: 'Fuchsia',  accent: '#d946ef', accent600: '#a21caf' },
  { id: 'violett',  name: 'Violett',  accent: '#8b5cf6', accent600: '#6d28d9' },
  { id: 'koralle',  name: 'Koralle',  accent: '#fb6f4c', accent600: '#c2410c' },
  { id: 'ozean',    name: 'Ozean',    accent: '#3b82f6', accent600: '#1d4ed8' },
  { id: 'smaragd',  name: 'Smaragd',  accent: '#10b981', accent600: '#047857' },
];

const THEME_BY_ID = Object.fromEntries(THEMES.map(t => [t.id, t]));
const THEME_BY_ACCENT = Object.fromEntries(THEMES.map(t => [t.accent.toLowerCase(), t]));

// Look up the precise 600 stop for a given accent (falls back to a computed mix).
const accent600For = (hex) =>
  THEME_BY_ACCENT[(hex || '').toLowerCase()]?.accent600
  || `color-mix(in oklab, ${hex} 80%, black)`;

Object.assign(window, { THEMES, THEME_BY_ID, THEME_BY_ACCENT, accent600For });

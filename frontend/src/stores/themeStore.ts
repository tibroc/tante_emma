// themeStore.ts — accent + light/dark/system, persisted. Replaces the Svelte
// themeStore. The two design "Tweaks" promoted to real features. `mode` persists
// under the 'theme' key for continuity with the old app ('light'|'dark', now
// also 'system'); accent under 'te.accent'.
import { create } from 'zustand';
import { THEMES, type ThemeMode } from '../lib/themes';

const MODE_KEY = 'theme';
const ACCENT_KEY = 'te.accent';

function readMode(): ThemeMode {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(MODE_KEY) : null;
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}
function readAccent(): string {
  return (
    (typeof localStorage !== 'undefined' && localStorage.getItem(ACCENT_KEY)) || THEMES[0].accent
  );
}

interface ThemeState {
  accent: string;
  mode: ThemeMode;
  setAccent: (a: string) => void;
  setMode: (m: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  accent: readAccent(),
  mode: readMode(),
  setAccent: (accent) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(ACCENT_KEY, accent);
    set({ accent });
  },
  setMode: (mode) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(MODE_KEY, mode);
    set({ mode });
  },
}));

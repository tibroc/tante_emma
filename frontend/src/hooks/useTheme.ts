// useTheme.ts — derives effective dark mode (resolving 'system') and the inline
// CSS-var style applied on the .app element. Backed by the global themeStore so
// the overview, settings, and list header all share one source of truth.
import { useEffect, useState, type CSSProperties } from 'react';
import { accent600For } from '../lib/themes';
import { useThemeStore } from '../stores/themeStore';

function systemDark(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
}

export function useTheme() {
  const { accent, mode, setAccent, setMode } = useThemeStore();
  const [systemIsDark, setSystemIsDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemIsDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const dark = mode === 'system' ? systemIsDark : mode === 'dark';

  const appStyle = {
    '--accent': accent,
    '--accent-600': accent600For(accent),
    '--surface-inverse': dark ? '#2b2333' : '#221b27',
  } as CSSProperties;

  const toggleDark = () => setMode(dark ? 'light' : 'dark');

  return { accent, setAccent, mode, setMode, dark, toggleDark, appStyle };
}

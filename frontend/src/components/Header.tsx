// Header.tsx — shared chrome for the non-list screens, ported from
// design-ref/screen-shell.jsx: a Fraunces large-title header (optional subtitle
// + trailing slot) and the compact theme toggle.
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Theme"
      style={{
        width: 36,
        height: 36,
        borderRadius: 11,
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-base)',
        color: 'var(--text-secondary)',
      }}
    >
      <Icon name={dark ? 'sun' : 'moon'} size={18} />
    </button>
  );
}

export function LargeTitleHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <div
      style={{
        flexShrink: 0,
        paddingTop: 'calc(20px + env(safe-area-inset-top))',
        background: 'var(--surface-base)',
        position: 'relative',
        zIndex: 30,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '6px 18px 14px',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            className="ff-display"
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              lineHeight: 1.05,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <div
              style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {trailing}
      </div>
    </div>
  );
}

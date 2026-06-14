// primitives.tsx — small shared pieces, ported from design-ref/app-pieces.jsx.
// CatChip/Checkbox etc. take explicit color/icon props (the live data path has
// no German category name to look up, unlike the static design ref).
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function Checkbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={checked ? 'Abwählen' : 'Erledigt'}
      style={{
        width: 26,
        height: 26,
        flexShrink: 0,
        padding: 0,
        cursor: 'pointer',
        borderRadius: 8,
        border: `2px solid ${checked ? 'var(--emerald-500)' : 'var(--border-default)'}`,
        background: checked ? 'var(--emerald-500)' : 'transparent',
        display: 'grid',
        placeItems: 'center',
        transition: 'background .18s, border-color .18s',
        animation: checked ? 'checkPop .26s ease' : 'none',
      }}
    >
      {checked && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="m5 12.5 4.5 4.5L19 7"
            style={{ strokeDasharray: 30, animation: 'drawCheck .26s ease .02s both' }}
          />
        </svg>
      )}
    </button>
  );
}

export function CatChip({
  color,
  icon,
  size = 34,
}: {
  color: string;
  icon: IconName;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        color,
        background: `color-mix(in oklab, ${color} 15%, var(--surface-base))`,
      }}
    >
      <Icon name={icon} size={size * 0.62} strokeWidth={1.9} />
    </div>
  );
}

export function QtyBadge({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        background: 'var(--surface-overlay)',
        borderRadius: 7,
        padding: '3px 8px',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {children}
    </span>
  );
}

export function StoreBadge({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 7,
        padding: '2px 7px 2px 5px',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon name="store" size={12} strokeWidth={2} />
      {children}
    </span>
  );
}

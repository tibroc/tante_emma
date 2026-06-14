// ItemViews.tsx — row / card / tile item renderers + category header,
// ported from design-ref/app-pieces.jsx. Driven by ItemVM (adapted backend data).
import { useTranslation } from 'react-i18next';
import { Checkbox, CatChip, QtyBadge, StoreBadge } from './primitives';
import { Icon } from './Icon';
import type { ItemVM } from '../lib/viewmodel';

export type ItemView = 'row' | 'card' | 'tile';

function ItemMeta({ item }: { item: ItemVM }) {
  const { t } = useTranslation();
  // Localized "5 kg" / "2 Stk." — unit is a code translated via units.<code>.
  const unitLabel = item.unit ? t(`units.${item.unit}`, { defaultValue: item.unit }) : '';
  const qty = [item.qty ?? '', unitLabel].filter(Boolean).join(' ').trim() || undefined;
  const bits = [];
  if (item.store) bits.push(<StoreBadge key="s">{item.store}</StoreBadge>);
  if (qty) bits.push(<QtyBadge key="q">{qty}</QtyBadge>);
  return bits.length ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{bits}</div>
  ) : null;
}

export function ItemRow({
  item,
  nameWeight,
  view,
  onToggle,
  onOpen,
}: {
  item: ItemVM;
  nameWeight: number;
  view: 'row' | 'card';
  onToggle: () => void;
  onOpen: () => void;
}) {
  const checked = item.checked;
  const nameEl = (
    <div style={{ minWidth: 0, flex: 1 }}>
      <div
        style={{
          fontSize: 16,
          fontWeight: nameWeight,
          color: checked ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: checked ? 'line-through' : 'none',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {item.name}
      </div>
    </div>
  );

  if (view === 'card') {
    return (
      <div
        onClick={onOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          padding: '13px 14px',
          background: 'var(--surface-base)',
          borderRadius: 18,
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          opacity: checked ? 0.62 : 1,
          cursor: 'pointer',
        }}
      >
        <Checkbox checked={checked} onToggle={onToggle} />
        <CatChip color={item.categoryColor} icon={item.categoryIcon} />
        {nameEl}
        <ItemMeta item={item} />
      </div>
    );
  }

  return (
    <div
      onClick={onOpen}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '12px 18px',
        minHeight: 60,
        cursor: 'pointer',
        opacity: checked ? 0.6 : 1,
      }}
    >
      <Checkbox checked={checked} onToggle={onToggle} />
      <div
        style={{
          width: 3.5,
          height: 26,
          borderRadius: 2,
          background: item.categoryColor,
          flexShrink: 0,
          opacity: checked ? 0.4 : 1,
        }}
      />
      {nameEl}
      <ItemMeta item={item} />
    </div>
  );
}

export function ItemTile({
  item,
  nameWeight,
  onToggle,
  onOpen,
  onDelete,
}: {
  item: ItemVM;
  nameWeight: number;
  onToggle: () => void;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const checked = item.checked;
  return (
    <div
      onClick={onOpen}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '13px 13px 14px',
        borderRadius: 18,
        cursor: 'pointer',
        background: checked ? 'var(--surface-overlay)' : 'var(--surface-base)',
        borderLeft: `4px solid ${checked ? 'var(--border-default)' : item.categoryColor}`,
        border: '1px solid var(--border-subtle)',
        borderLeftWidth: 4,
        boxShadow: checked ? 'none' : 'var(--shadow-sm)',
        opacity: checked ? 0.6 : 1,
        minHeight: 96,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <CatChip color={item.categoryColor} icon={item.categoryIcon} size={30} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Entfernen"
              style={{
                width: 26,
                height: 26,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="x" size={16} strokeWidth={2.2} />
            </button>
          )}
          <Checkbox checked={checked} onToggle={onToggle} />
        </div>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: nameWeight + 100,
            lineHeight: 1.25,
            color: checked ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: checked ? 'line-through' : 'none',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.name}
        </div>
        {(item.qty || item.unit || item.store) && (
          <div style={{ marginTop: 7 }}>
            <ItemMeta item={item} />
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoryHeader({
  label,
  color,
  count,
  collapsed,
  onToggle,
}: {
  label: string;
  color: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '14px 18px 7px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 2, background: color }} />
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-muted)',
          flexShrink: 0,
          background: 'var(--surface-overlay)',
          borderRadius: 20,
          padding: '1px 8px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </span>
      <span style={{ flex: 1 }} />
      <Icon
        name="chevron-down"
        size={17}
        style={{
          color: 'var(--text-muted)',
          transform: collapsed ? 'rotate(-90deg)' : 'none',
          transition: 'transform .2s',
        }}
      />
    </button>
  );
}

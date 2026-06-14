// sheets.tsx — EmptyState, Snackbar, DetailSheet. Ported from design-ref/app.jsx.
// DetailSheet is wired to item.updated (debounced) + item.deleted.
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { CatChip } from './primitives';
import { resolveCategoryIcon } from '../lib/categories';
import type { ListItem, Store } from '../lib/types';
import type { CategoryLookup } from '../lib/viewmodel';

// Backend stores unit codes; labels come from units.<code> per locale.
const UNIT_CODES = ['pcs', 'g', 'kg', 'ml', 'l', 'pkg'];

export function EmptyState() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '64px 40px',
        gap: 6,
      }}
    >
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: 24,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--accent-tint)',
          color: 'var(--accent)',
          marginBottom: 8,
        }}
      >
        <Icon name="cart" size={38} strokeWidth={1.6} />
      </div>
      <div
        className="ff-display"
        style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}
      >
        {t('list.empty_heading')}
      </div>
      <div
        style={{ fontSize: 14.5, color: 'var(--text-secondary)', maxWidth: 230, lineHeight: 1.5 }}
      >
        {t('list.empty_body')}
      </div>
    </div>
  );
}

export function Snackbar({ name, onUndo }: { name: string; onUndo: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '11px 12px 11px 18px',
        background: 'var(--surface-inverse, #221b27)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-lg)',
        animation: 'snackUp .24s ease',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>„{name}" entfernt</span>
      <button
        onClick={onUndo}
        style={{
          border: 'none',
          background: 'rgba(255,255,255,0.14)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 13.5,
          fontWeight: 700,
          padding: '6px 14px',
          borderRadius: 9,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Rückgängig
      </button>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 44,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface-raised)',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 15,
  color: 'var(--text-primary)',
  outline: 'none',
};

export function DetailSheet({
  item,
  categories,
  stores,
  onUpdate,
  onDelete,
  onClose,
}: {
  item: ListItem;
  categories: CategoryLookup;
  stores: Store[];
  onUpdate: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const cat = item.category_id ? categories[item.category_id] : undefined;
  const color = cat?.color || item.category_color || '#9ca3af';
  const icon = cat?.icon ?? resolveCategoryIcon(item.category_icon);
  const [qty, setQty] = useState(item.quantity != null ? String(item.quantity) : '');
  const [note, setNote] = useState(item.note ?? '');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save (design spec: no explicit save button).
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const patch: Record<string, unknown> = {};
      const parsed = qty.trim() === '' ? undefined : Number(qty.replace(',', '.'));
      if (parsed !== undefined && !Number.isNaN(parsed) && parsed !== item.quantity)
        patch.quantity = parsed;
      if (note !== (item.note ?? '')) patch.note = note;
      if (Object.keys(patch).length) onUpdate(patch);
    }, 500);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty, note]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        background: 'rgba(20,10,24,0.42)',
        backdropFilter: 'blur(2px)',
        animation: 'fadeIn .2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="scroll"
        style={{
          width: '100%',
          background: 'var(--surface-base)',
          borderRadius: '26px 26px 0 0',
          padding: '12px 20px calc(20px + env(safe-area-inset-bottom))',
          boxShadow: 'var(--shadow-lg)',
          animation: 'sheetUp .3s cubic-bezier(.2,.9,.3,1)',
          maxHeight: '78%',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: 38,
            height: 4,
            borderRadius: 4,
            background: 'var(--border-default)',
            margin: '0 auto 18px',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 6 }}>
          <CatChip color={color} icon={icon} size={46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="ff-display"
              style={{
                fontSize: 23,
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.15,
              }}
            >
              {item.display_name}
            </div>
            {cat && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: color }} />
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {cat.name}
                </span>
              </div>
            )}
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />

        <FieldLabel>{t('item_sheet.quantity')}</FieldLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="500"
            style={inputStyle}
          />
          <select
            defaultValue={item.unit ?? ''}
            onChange={(e) => onUpdate({ unit: e.target.value })}
            style={{ ...inputStyle, flex: '0 0 110px', width: 110 }}
          >
            <option value="">{t('item_sheet.no_unit')}</option>
            {UNIT_CODES.map((u) => (
              <option key={u} value={u}>
                {t(`units.${u}`)}
              </option>
            ))}
          </select>
        </div>

        {stores.length > 0 && (
          <>
            <FieldLabel>{t('item_sheet.store')}</FieldLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              {stores.map((s) => {
                const on = item.store_id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onUpdate({ store_id: on ? '' : s.id })}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontSize: 13.5,
                      fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                      border: `1px solid ${on ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      background: on ? 'var(--accent-light)' : 'var(--surface-raised)',
                      color: on ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <FieldLabel>{t('item_sheet.note')}</FieldLabel>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('item_sheet.note_ph')}
          style={{ ...inputStyle, width: '100%', marginBottom: 18 }}
        />

        <button
          onClick={onDelete}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 14,
            cursor: 'pointer',
            marginTop: 4,
            border: '1px solid color-mix(in oklab, #ef4444 30%, transparent)',
            background: 'transparent',
            color: '#ef4444',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
          }}
        >
          <Icon name="trash" size={18} strokeWidth={2} />
          {t('item.delete')}
        </button>
      </div>
    </div>
  );
}

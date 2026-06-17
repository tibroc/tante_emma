// AddBar.tsx — search + add, ported from design-ref/app-chrome.jsx but wired to
// the live backend: GET /api/products/search for suggestions, and an item.added
// event (with optimistic insert) on commit. Free-text adds send name_override.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ulid } from '../lib/ulid';
import { Icon } from './Icon';
import { CatChip } from './primitives';
import { BarcodeScanner } from './BarcodeScanner';
import { api } from '../lib/api';
import { resolveCategoryIcon } from '../lib/categories';
import type { ListItem, Suggestion } from '../lib/types';

interface AddBarProps {
  listId: string;
  // submit an item.added event with an optimistic ListItem to insert immediately
  onAdd: (payload: Record<string, unknown>, optimistic: ListItem) => void;
}

function optimisticItem(
  listId: string,
  id: string,
  opts: Partial<ListItem> & { display_name: string },
): ListItem {
  return {
    id,
    list_id: listId,
    product_id: opts.product_id ?? null,
    name_override: opts.name_override ?? null,
    quantity: null,
    unit: null,
    note: null,
    checked: false,
    checked_by: null,
    checked_at: null,
    added_by: '',
    added_at: Date.now(),
    sort_order: 0,
    store_id: null,
    category_id: opts.category_id ?? null,
    category_color: opts.category_color ?? null,
    category_icon: opts.category_icon ?? null,
    display_name: opts.display_name,
    preferred_store_ids: null,
  };
}

export function AddBar({ listId, onAdd }: AddBarProps) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [matches, setMatches] = useState<Suggestion[]>([]);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const query = q.trim();
  const open = focus && query.length > 0;

  // Debounced live search against the backend. The empty-query case is derived
  // (see `results`) rather than cleared via setState, so the effect never sets
  // state synchronously during its run.
  useEffect(() => {
    if (!query) return;
    const handle = setTimeout(() => {
      api
        .get<Suggestion[]>(
          `/api/products/search?q=${encodeURIComponent(query)}&locale=de&list_id=${listId}`,
        )
        .then(setMatches)
        .catch(() => setMatches([]));
    }, 150);
    return () => clearTimeout(handle);
  }, [query, listId]);

  const results = query ? matches : [];
  const exact = results.some((m) => m.display_name.toLowerCase() === query.toLowerCase());

  const commitSuggestion = (s: Suggestion) => {
    const id = ulid();
    onAdd(
      { item_id: id, product_id: s.product_id },
      optimisticItem(listId, id, {
        product_id: s.product_id,
        display_name: s.display_name,
        category_id: s.category?.id ?? null,
        category_color: s.category?.color ?? null,
        category_icon: s.category?.icon ?? null,
      }),
    );
    setQ('');
    setMatches([]);
    inputRef.current?.focus();
  };

  const commitFreeText = () => {
    if (!query) return;
    const id = ulid();
    onAdd(
      { item_id: id, name_override: query },
      optimisticItem(listId, id, { name_override: query, display_name: query }),
    );
    setQ('');
    setMatches([]);
    inputRef.current?.focus();
  };

  const commitTop = () => {
    if (results[0]) commitSuggestion(results[0]);
    else commitFreeText();
  };

  return (
    <div style={{ position: 'relative', padding: '0 16px 12px', zIndex: 40 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 50,
          background: 'var(--surface-overlay)',
          borderRadius: 15,
          padding: '0 8px 0 14px',
          outline: focus ? '2px solid var(--accent)' : '2px solid transparent',
          transition: 'outline-color .15s',
          boxShadow: focus ? 'var(--shadow-md)' : 'none',
        }}
      >
        <Icon
          name="search"
          size={19}
          style={{
            color: focus ? 'var(--accent)' : 'var(--text-muted)',
            flexShrink: 0,
            transition: 'color .15s',
          }}
        />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setFocus(true);
          }}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 140)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitTop();
            if (e.key === 'Escape') {
              setQ('');
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder={t('add_item.placeholder')}
          aria-label={t('add_item.aria_input')}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        />
        <button
          aria-label={t('add_item.aria_scan')}
          onClick={() => setScanning(true)}
          style={{
            width: 34,
            height: 34,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="camera" size={21} />
        </button>
        <button
          aria-label={t('add_item.aria_add')}
          onClick={commitTop}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            background: 'linear-gradient(145deg, var(--accent), var(--accent-600))',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            boxShadow: 'var(--shadow-pop)',
            transition: 'transform .08s',
          }}
          onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
          onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Icon name="plus" size={20} strokeWidth={2.4} />
        </button>
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            top: 54,
            zIndex: 60,
            background: 'var(--surface-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            animation: 'suggIn .16s ease',
          }}
        >
          {results.map((s) => (
            <button
              key={s.product_id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commitSuggestion(s)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <CatChip
                color={s.category?.color || '#9ca3af'}
                icon={resolveCategoryIcon(s.category?.icon)}
                size={30}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {s.display_name}
                  {s.brand && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                      {' '}
                      · {s.brand}
                    </span>
                  )}
                </div>
                {s.category && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {s.category.name_de}
                  </div>
                )}
              </div>
            </button>
          ))}
          {!exact && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={commitFreeText}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                background: 'var(--accent-tint)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--accent)',
                  color: '#fff',
                }}
              >
                <Icon name="plus" size={18} strokeWidth={2.4} />
              </div>
              <span
                style={{
                  fontSize: 14.5,
                  color: 'var(--accent)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('add_item.create', { q: query })}
              </span>
            </button>
          )}
        </div>
      )}

      {scanning && (
        <BarcodeScanner listId={listId} onAdd={onAdd} onClose={() => setScanning(false)} />
      )}
    </div>
  );
}

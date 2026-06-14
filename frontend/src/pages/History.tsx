// History.tsx — route /history. Design-ref day-grouped timeline with category
// icon chips, search, and a + button that re-adds an entry to the list it was
// bought from (the entry's list_id; the API exposes no product_id here, so it
// re-adds as a free-text item using the name snapshot).
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { ulid } from '../lib/ulid';
import { connHeaders } from '../lib/ws';
import { Icon } from '../components/Icon';
import { LargeTitleHeader, ThemeToggle } from '../components/Header';
import { useTheme } from '../hooks/useTheme';
import { resolveCategoryIcon } from '../lib/categories';

interface HistoryEntry {
  id: string;
  list_id: string;
  name_snapshot: string;
  store_name?: string;
  store_icon?: string;
  category_color?: string;
  category_icon?: string;
  checked_at: number;
}

export default function History() {
  const { t, i18n } = useTranslation();
  const { dark, toggleDark } = useTheme();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [added, setAdded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api
      .get<{ history: HistoryEntry[] }>('/api/history')
      .then((d) => setEntries(d.history))
      .catch(() => setError(true));
  }, []);

  const reAdd = async (e: HistoryEntry) => {
    if (added[e.id]) return;
    setAdded((a) => ({ ...a, [e.id]: true }));
    if (navigator.vibrate) navigator.vibrate(6);
    const event = {
      id: ulid(),
      type: 'item.added',
      payload: { item_id: ulid(), name_override: e.name_snapshot },
      client_ts: Date.now(),
    };
    try {
      await api.post(`/api/lists/${e.list_id}/events`, event, connHeaders());
    } catch {
      setAdded((a) => ({ ...a, [e.id]: false })); // allow retry
    }
  };

  const grouped = useMemo(() => {
    if (!entries) return [];
    const q = search.trim().toLowerCase();
    const filtered = q ? entries.filter((e) => e.name_snapshot.toLowerCase().includes(q)) : entries;
    const fmt = new Intl.DateTimeFormat(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const map = new Map<string, HistoryEntry[]>();
    for (const e of filtered) {
      const day = fmt.format(new Date(e.checked_at));
      const arr = map.get(day) ?? [];
      if (!map.has(day)) map.set(day, arr);
      arr.push(e);
    }
    return [...map.entries()];
  }, [entries, search, i18n.language]);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
      }}
    >
      <LargeTitleHeader
        title={t('history.title')}
        subtitle={t('history.subtitle')}
        trailing={<ThemeToggle dark={dark} onToggle={toggleDark} />}
      />

      <div
        style={{
          flexShrink: 0,
          background: 'transparent',
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            height: 46,
            margin: '0 16px 12px',
            background: 'var(--surface-overlay)',
            borderRadius: 14,
            padding: '0 14px',
          }}
        >
          <Icon name="search" size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('history.search_ph')}
            aria-label={t('history.search_label')}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 15.5,
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="×"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon name="x" size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {error && <div style={{ color: '#ef4444', padding: 18 }}>{t('history.load_error')}</div>}
        {!entries && !error && (
          <div style={{ color: 'var(--text-muted)', padding: 18 }}>{t('list.loading')}</div>
        )}
        {entries && grouped.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
            <div
              className="ff-display"
              style={{ fontSize: 19, fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              {search.trim() ? t('history.no_results', { q: search.trim() }) : t('history.empty')}
            </div>
          </div>
        )}
        {grouped.map(([day, dayEntries]) => (
          <div key={day} style={{ padding: '0 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0 4px' }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                }}
              >
                {day}
              </span>
              <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>
            {dayEntries.map((e) => {
              const color = e.category_color || 'var(--text-muted)';
              const isAdded = !!added[e.id];
              return (
                <div
                  key={e.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    padding: '11px 4px',
                    minHeight: 56,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      color,
                      background: `color-mix(in oklab, ${color} 14%, var(--surface-base))`,
                    }}
                  >
                    <Icon name={resolveCategoryIcon(e.category_icon)} size={18} strokeWidth={1.9} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15.5,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {e.name_snapshot}
                    </div>
                    {e.store_name && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {e.store_icon} {e.store_name}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => reAdd(e)}
                    disabled={isAdded}
                    aria-label={t('item.check')}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      flexShrink: 0,
                      cursor: isAdded ? 'default' : 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      transition: 'all .2s',
                      border: isAdded ? 'none' : '1.5px solid var(--border-default)',
                      background: isAdded ? 'var(--emerald-500)' : 'transparent',
                      color: isAdded ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon
                      name={isAdded ? 'check' : 'plus'}
                      size={isAdded ? 16 : 19}
                      strokeWidth={isAdded ? 3 : 2.2}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

// ListsOverview.tsx — route /lists. Design-ref gradient cards with progress,
// category dots and open/done counts. GET /api/lists has no per-list counts, so
// each list's detail is fetched once to enrich the card (member stacks aren't
// exposed by the API and are omitted). Create form is child-gated.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { Icon } from '../components/Icon';
import { LargeTitleHeader, ThemeToggle } from '../components/Header';
import { useTheme } from '../hooks/useTheme';
import { useUserStore } from '../stores/userStore';
import type { List, ListDetail, Category } from '../lib/types';

interface Enriched {
  open: number;
  done: number;
  catColors: string[];
}

function relativeTime(ms: number, lang: string): string {
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const min = 60_000,
    hr = 3_600_000,
    day = 86_400_000,
    week = 604_800_000;
  if (abs < hr) return rtf.format(Math.round(diff / min), 'minute');
  if (abs < day) return rtf.format(Math.round(diff / hr), 'hour');
  if (abs < week) return rtf.format(Math.round(diff / day), 'day');
  return rtf.format(Math.round(diff / week), 'week');
}

function ListCard({
  list,
  data,
  edited,
  onOpen,
}: {
  list: List;
  data?: Enriched;
  edited: string;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const color = list.color || 'var(--accent)';
  const dark = `color-mix(in oklab, ${color} 72%, black)`;
  const total = (data?.open ?? 0) + (data?.done ?? 0);
  const pct = total ? Math.round(((data?.done ?? 0) / total) * 100) : 0;
  const countLine = data
    ? `${t('lists.open', { n: data.open })}${data.done ? ` · ${t('lists.done', { n: data.done })}` : ''}`
    : '';

  return (
    <button
      onClick={onOpen}
      style={{
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        padding: 0,
        border: 'none',
        borderRadius: 22,
        overflow: 'hidden',
        background: 'var(--surface-base)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* accent header band */}
      <div
        style={{
          position: 'relative',
          padding: 16,
          background: `linear-gradient(135deg, ${color}, ${dark})`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -24,
            right: -16,
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              fontSize: 22,
              color: '#fff',
              background: 'rgba(255,255,255,0.2)',
              border: '1.5px solid rgba(255,255,255,0.32)',
            }}
          >
            {list.icon || '🛒'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="ff-display"
              style={{
                fontSize: 19,
                fontWeight: 600,
                color: '#fff',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {list.name}
            </div>
            {countLine && (
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.85)',
                  marginTop: 1,
                }}
              >
                {countLine}
              </div>
            )}
          </div>
          <Icon name="chevron-right" size={20} style={{ color: 'rgba(255,255,255,0.9)' }} />
        </div>
      </div>

      {/* body: progress + categories + edited */}
      <div style={{ padding: '13px 16px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              flex: 1,
              height: 7,
              borderRadius: 4,
              background: 'var(--surface-overlay)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 4,
                background: `linear-gradient(90deg, ${color}, ${dark})`,
                transition: 'width .3s',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pct}%
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {(data?.catColors ?? []).map((c, i) => (
              <span key={i} style={{ width: 8, height: 8, borderRadius: 3, background: c }} />
            ))}
            <span
              style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500, marginLeft: 3 }}
            >
              {t('lists.categories', { n: data?.catColors.length ?? 0 })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="clock" size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>
              {edited}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function ListsOverview() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { dark, toggleDark } = useTheme();
  const user = useUserStore((s) => s.user);
  const [lists, setLists] = useState<List[] | null>(null);
  const [enriched, setEnriched] = useState<Record<string, Enriched>>({});
  const [error, setError] = useState<string>();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [all, cats] = await Promise.all([
          api.get<List[]>('/api/lists'),
          api.get<Category[]>('/api/categories').catch(() => [] as Category[]),
        ]);
        if (cancelled) return;
        setLists(all);
        const catColor: Record<string, string> = {};
        for (const c of cats) catColor[c.id] = c.color || '#9ca3af';
        // Enrich each card with counts + category dots (best-effort, parallel).
        const details = await Promise.all(
          all.map((l) => api.get<ListDetail>(`/api/lists/${l.id}`).catch(() => null)),
        );
        if (cancelled) return;
        const map: Record<string, Enriched> = {};
        details.forEach((d, i) => {
          if (!d) return;
          const open = d.items.filter((it) => !it.checked).length;
          const done = d.items.filter((it) => it.checked).length;
          const colors = [
            ...new Set(
              d.items
                .filter((it) => !it.checked)
                .map((it) => (it.category_id ? catColor[it.category_id] : undefined))
                .filter(Boolean) as string[],
            ),
          ].slice(0, 5);
          map[all[i].id] = { open, done, catColors: colors };
        });
        setEnriched(map);
      } catch (e) {
        if (!cancelled) setError(String((e as Error)?.message ?? e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const createList = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const created = await api.post<List>('/api/lists', { name, type: 'group' });
      setNewName('');
      navigate(`/lists/${created.id}`);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setCreating(false);
    }
  };

  const totalOpen = lists ? lists.reduce((n, l) => n + (enriched[l.id]?.open ?? 0), 0) : 0;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-base)',
      }}
    >
      <LargeTitleHeader
        title={t('lists.title')}
        subtitle={lists ? t('lists.summary', { lists: lists.length, open: totalOpen }) : undefined}
        trailing={<ThemeToggle dark={dark} onToggle={toggleDark} />}
      />

      <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 16px 8px' }}>
          {user?.role !== 'child' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createList()}
                placeholder={t('lists.new_name_ph')}
                aria-label={t('lists.new_name_label')}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 14,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-overlay)',
                  padding: '0 14px',
                  fontSize: 15,
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <button
                onClick={createList}
                disabled={creating || !newName.trim()}
                aria-label={t('lists.create_label')}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  border: 'none',
                  cursor: creating || !newName.trim() ? 'default' : 'pointer',
                  background: 'linear-gradient(145deg, var(--accent), var(--accent-600))',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  opacity: creating || !newName.trim() ? 0.5 : 1,
                  boxShadow: 'var(--shadow-pop)',
                }}
              >
                <Icon name="plus" size={20} strokeWidth={2.4} />
              </button>
            </div>
          )}

          {error && <div style={{ color: '#ef4444', fontSize: 14 }}>{error}</div>}
          {!lists && !error && (
            <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: 12 }}>
              {t('list.loading')}
            </div>
          )}
          {lists?.length === 0 && (
            <div
              style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-secondary)' }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
              <div className="ff-display" style={{ fontSize: 20, fontWeight: 600 }}>
                {t('lists.empty')}
              </div>
            </div>
          )}
          {lists?.map((l) => (
            <ListCard
              key={l.id}
              list={l}
              data={enriched[l.id]}
              edited={relativeTime(l.updated_at, i18n.language)}
              onOpen={() => navigate(`/lists/${l.id}`)}
            />
          ))}
        </div>
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

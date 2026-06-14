// ListsOverview.tsx — route /lists. Design-ref gradient list cards + large-title
// header. Create form is child-gated. (Per-list progress/members/counts aren't
// in GET /api/lists, so the card shows what the API provides: name, icon, color,
// type, and a relative "edited" time from updated_at.)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { Icon } from '../components/Icon';
import { LargeTitleHeader, ThemeToggle } from '../components/Header';
import { useTheme } from '../hooks/useTheme';
import { useUserStore } from '../stores/userStore';
import type { List } from '../lib/types';

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
  edited,
  sharedLabel,
  onOpen,
}: {
  list: List;
  edited: string;
  sharedLabel?: string;
  onOpen: () => void;
}) {
  const color = list.color || 'var(--accent)';
  const dark = `color-mix(in oklab, ${color} 72%, black)`;
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
      <div
        style={{
          position: 'relative',
          padding: '16px',
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
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.85)',
                marginTop: 1,
              }}
            >
              {edited}
            </div>
          </div>
          {sharedLabel && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                color: '#fff',
                background: 'rgba(255,255,255,0.22)',
                borderRadius: 6,
                padding: '3px 8px',
              }}
            >
              {sharedLabel}
            </span>
          )}
          <Icon name="chevron-right" size={20} style={{ color: 'rgba(255,255,255,0.9)' }} />
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
  const [error, setError] = useState<string>();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .get<List[]>('/api/lists')
      .then(setLists)
      .catch((e) => setError(String(e?.message ?? e)));
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
        subtitle={lists ? `${lists.length}` : undefined}
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
              edited={relativeTime(l.updated_at, i18n.language)}
              sharedLabel={l.owner_id !== user?.id ? t('lists.shared_badge') : undefined}
              onOpen={() => navigate(`/lists/${l.id}`)}
            />
          ))}
        </div>
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

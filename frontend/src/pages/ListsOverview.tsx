// ListsOverview.tsx — route /lists. Design-ref gradient cards with progress,
// category dots, open/done counts, and a member-avatar stack. GET /api/lists has
// no per-list counts/members, so each list's detail is fetched for counts and,
// where permitted (owner or admin), GET /api/lists/:id/share for members; lists
// merely shared to the user fall back to owner + self. Create form is child-gated.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { ulid } from '../lib/ulid';
import { LIST_COLORS } from '../lib/constants';
import { Icon, type IconName } from '../components/Icon';
import { LargeTitleHeader, ThemeToggle } from '../components/Header';
import { PresenceAvatars } from '../components/PresenceAvatars';
import { ListEditSheet, NewListSheet } from '../components/sheets';
import { useTheme } from '../hooks/useTheme';
import { useUserStore } from '../stores/userStore';
import type { List, ListDetail, Category } from '../lib/types';

interface Member {
  id: string;
  name: string;
  avatar_url?: string;
}

// GET /api/lists/:id/members row (readable by anyone with list access)
interface ListMemberRow {
  user_id: string;
  name: string;
  avatar_url?: string;
  is_owner: boolean;
}

interface Enriched {
  open: number;
  done: number;
  catColors: string[];
  members: Member[];
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
  canEdit,
  entering,
  onOpen,
  onEdit,
  onToggleFavorite,
}: {
  list: List;
  data?: Enriched;
  edited: string;
  canEdit: boolean;
  entering: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
}) {
  const { t } = useTranslation();
  const color = list.color || LIST_COLORS[0];
  const dark = `color-mix(in oklab, ${color} 72%, black)`;
  const total = (data?.open ?? 0) + (data?.done ?? 0);
  const pct = total ? Math.round(((data?.done ?? 0) / total) * 100) : 0;
  const countLine = data
    ? `${t('lists.open', { n: data.open })}${data.done ? ` · ${t('lists.done', { n: data.done })}` : ''}`
    : '';

  return (
    <div
      onClick={onOpen}
      style={{
        borderRadius: 22,
        overflow: 'hidden',
        background: 'var(--surface-base)',
        boxShadow: 'var(--shadow-md)',
        cursor: 'pointer',
        animation: entering ? 'favEnter 0.25s ease' : 'none',
      }}
    >
      {/* accent header band */}
      <div
        style={{
          padding: '15px 16px 14px',
          background: `linear-gradient(135deg, ${color}, ${dark})`,
        }}
      >
        {/* content row — all action buttons live inline here */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              background: 'rgba(255,255,255,0.2)',
              border: '1.5px solid rgba(255,255,255,0.32)',
            }}
          >
            <Icon name={(list.icon || 'cart') as IconName} size={24} strokeWidth={1.9} />
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

          {data?.members && data.members.length > 0 && <PresenceAvatars users={data.members} />}

          {/* star — always shown, stops card click from propagating */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            aria-label={list.is_favorite ? 'Unfavorite' : 'Favorite'}
            aria-pressed={list.is_favorite}
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: 10,
              border: 'none',
              background: 'rgba(255,255,255,0.18)',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
            }}
          >
            <Icon
              name={list.is_favorite ? 'star-filled' : 'star-outline'}
              size={17}
              strokeWidth={2}
            />
          </button>

          {/* "..." — owner/admin only */}
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              aria-label={t('list_edit.edit_aria')}
              style={{
                width: 32,
                height: 32,
                flexShrink: 0,
                borderRadius: 10,
                border: 'none',
                background: 'rgba(255,255,255,0.18)',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
              }}
            >
              <Icon name="dots" size={19} />
            </button>
          )}
        </div>
      </div>

      {/* body: progress bar + category dots + clock */}
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
    </div>
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
  const [newListOpen, setNewListOpen] = useState(false);
  const [editingList, setEditingList] = useState<List | null>(null);
  const [enteringFavId, setEnteringFavId] = useState<string | null>(null);

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

        // Counts (per-list detail) + roster (GET /api/lists/:id/members — readable
        // by anyone with list access). Best-effort, in parallel.
        const [details, memberLists] = await Promise.all([
          Promise.all(all.map((l) => api.get<ListDetail>(`/api/lists/${l.id}`).catch(() => null))),
          Promise.all(
            all.map((l) => api.get<ListMemberRow[]>(`/api/lists/${l.id}/members`).catch(() => [])),
          ),
        ]);
        if (cancelled) return;

        const map: Record<string, Enriched> = {};
        all.forEach((l, i) => {
          const d = details[i];
          const active = d ? d.items.filter((it) => !it.checked) : [];
          const open = active.length;
          const done = d ? d.items.length - active.length : 0;
          const colors = [
            ...new Set(
              active
                .map((it) => (it.category_id ? catColor[it.category_id] : undefined))
                .filter(Boolean) as string[],
            ),
          ].slice(0, 5);

          const members: Member[] = memberLists[i].map((m) => ({
            id: m.user_id,
            name: m.name,
            avatar_url: m.avatar_url,
          }));

          map[l.id] = { open, done, catColors: colors, members };
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

  const createList = async (name: string) => {
    const color = LIST_COLORS[(lists?.length ?? 0) % LIST_COLORS.length];
    try {
      const created = await api.post<List>('/api/lists', { name, type: 'group', color });
      navigate(`/lists/${created.id}`);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    }
  };

  // Submit a list-management event, then patch local state so the UI reflects
  // the change without a full reload.
  const submitListEvent = async (
    listId: string,
    type: string,
    payload: Record<string, unknown>,
  ) => {
    await api.post(`/api/lists/${listId}/events`, {
      id: ulid(),
      type,
      payload,
      client_ts: Date.now(),
    });
  };

  const handleRename = async (listId: string, name: string) => {
    await submitListEvent(listId, 'list.renamed', { name });
    setLists((prev) => prev?.map((l) => (l.id === listId ? { ...l, name } : l)) ?? null);
    setEditingList((prev) => (prev?.id === listId ? { ...prev, name } : prev));
  };

  const handleRecolor = async (listId: string, color: string) => {
    await submitListEvent(listId, 'list.updated', { color });
    setLists((prev) => prev?.map((l) => (l.id === listId ? { ...l, color } : l)) ?? null);
    setEditingList((prev) => (prev?.id === listId ? { ...prev, color } : prev));
  };

  const handleDelete = async (listId: string) => {
    await submitListEvent(listId, 'list.deleted', {});
    setLists((prev) => prev?.filter((l) => l.id !== listId) ?? null);
    setEditingList(null);
  };

  const sortLists = (arr: List[]) =>
    [...arr].sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      return b.created_at - a.created_at;
    });

  const toggleFavorite = async (list: List) => {
    const newFav = !list.is_favorite;
    // Optimistic: flip the flag immediately.
    setLists(
      (prev) => prev?.map((l) => (l.id === list.id ? { ...l, is_favorite: newFav } : l)) ?? null,
    );
    // If favoriting, trigger the slide-in animation and re-sort after it starts.
    if (newFav) {
      setEnteringFavId(list.id);
      setTimeout(() => {
        setLists((prev) => (prev ? sortLists(prev) : null));
        setTimeout(() => setEnteringFavId(null), 300);
      }, 50);
    } else {
      setLists((prev) => (prev ? sortLists(prev) : null));
    }
    try {
      await api.post(`/api/lists/${list.id}/events`, {
        id: ulid(),
        type: newFav ? 'list.favorited' : 'list.unfavorited',
        payload: {},
        client_ts: Date.now(),
      });
    } catch {
      // Revert on failure.
      setLists((prev) =>
        prev
          ? sortLists(prev.map((l) => (l.id === list.id ? { ...l, is_favorite: !newFav } : l)))
          : null,
      );
    }
  };

  const totalOpen = lists ? lists.reduce((n, l) => n + (enriched[l.id]?.open ?? 0), 0) : 0;
  const isAdminOrOwner = (list: List) => user?.role === 'admin' || user?.id === list.owner_id;

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
        title={t('lists.title')}
        subtitle={lists ? t('lists.summary', { lists: lists.length, open: totalOpen }) : undefined}
        trailing={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeToggle dark={dark} onToggle={toggleDark} />
            {user?.role !== 'child' && (
              <button
                onClick={() => setNewListOpen(true)}
                aria-label={t('lists.create_label')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  background: 'linear-gradient(145deg, var(--accent), var(--accent-600))',
                  boxShadow: 'var(--shadow-pop)',
                }}
              >
                <Icon name="plus" size={20} strokeWidth={2.4} />
              </button>
            )}
          </div>
        }
      />

      <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 16px 8px' }}>
          {/* (no inline create form — use the "+" header button or the dashed card) */}

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
          {lists && lists.some((l) => l.is_favorite) && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                padding: '4px 4px 0',
              }}
            >
              {t('favorites.section')}
            </div>
          )}
          {lists?.map((l) => (
            <ListCard
              key={l.id}
              list={l}
              data={enriched[l.id]}
              edited={relativeTime(l.updated_at, i18n.language)}
              canEdit={isAdminOrOwner(l)}
              entering={enteringFavId === l.id}
              onOpen={() => navigate(`/lists/${l.id}`)}
              onEdit={() => setEditingList(l)}
              onToggleFavorite={() => void toggleFavorite(l)}
            />
          ))}

          {/* dashed "add list" card — hidden for children */}
          {user?.role !== 'child' && (
            <button
              onClick={() => setNewListOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                width: '100%',
                padding: '16px',
                borderRadius: 22,
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: '1.5px dashed var(--border-default)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14.5,
                fontWeight: 600,
              }}
            >
              <Icon name="plus" size={18} strokeWidth={2.2} />
              {t('lists.create_label')}
            </button>
          )}
        </div>
        <div style={{ height: 16 }} />
      </div>

      {newListOpen && (
        <NewListSheet
          onCreate={async (name) => {
            await createList(name);
            setNewListOpen(false);
          }}
          onClose={() => setNewListOpen(false)}
        />
      )}
      {editingList && (
        <ListEditSheet
          list={editingList}
          onRename={(name) => handleRename(editingList.id, name)}
          onRecolor={(color) => handleRecolor(editingList.id, color)}
          onDelete={() => handleDelete(editingList.id)}
          onClose={() => setEditingList(null)}
        />
      )}
    </div>
  );
}

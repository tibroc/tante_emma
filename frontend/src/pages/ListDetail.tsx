// ListDetail.tsx — the shopping list screen (route /lists/:id). Full parity with
// the Svelte page: load, optimistic mutations via events, real-time WS, offline
// queue, sort (category/date/alpha), store filter + shelf order, active-store
// session, sharing, presence, view toggle, child-role gating, delete + undo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ulid } from '../lib/ulid';
import { api } from '../lib/api';
import { Icon } from '../components/Icon';
import { AddBar } from '../components/AddBar';
import { PresenceAvatars } from '../components/PresenceAvatars';
import { ItemRow, ItemTile, CategoryHeader, type ItemView } from '../components/ItemViews';
import { SwipeRow } from '../components/SwipeRow';
import { DetailSheet, EmptyState, Snackbar, ListEditSheet } from '../components/sheets';
import { toItemVM, type ItemVM } from '../lib/viewmodel';
import { useList, UNSORTED_SHELF_POSITION } from '../hooks/useList';
import { useUserStore } from '../stores/userStore';
import { useTheme } from '../hooks/useTheme';
import { useSetHeader } from '../hooks/useSetHeader';
import type { ListItem } from '../lib/types';

type SortMode = 'category' | 'date' | 'alpha';
const NAME_WEIGHT = 500;

interface Group {
  key: string;
  label: string | null;
  color: string | null;
  order: number;
  items: ItemVM[];
}

export default function ListDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { dark, toggleDark } = useTheme();
  const role = useUserStore((s) => s.user?.role);
  const isChild = role === 'child';
  const list = useList(id);
  const { items, categories, storesLookup, storeList, members, presence } = list;

  const [sortMode, setSortMode] = useState<SortMode>('category');
  // The active store pill is both the filter/ordering control and the "shopping
  // session" store that drives clear-checked shelf-order learning. (There used to
  // be a separate dropdown for the latter — merged into the pills.)
  const [filterStoreId, setFilterStoreId] = useState<string | null>(null);
  const [shelfOrder, setShelfOrder] = useState<Map<string, number>>(new Map());
  const sessionStart = useRef<number>(Date.now());
  const [view, setView] = useState<ItemView>(
    () => (localStorage.getItem(`view-mode-${id}`) as ItemView) || 'row',
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showChecked, setShowChecked] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shares, setShares] = useState<Set<string>>(new Set());
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [snack, setSnack] = useState<{ item: ListItem } | null>(null);
  const snackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem(`view-mode-${id}`, view);
  }, [view, id]);

  const itemMatchesStore = (it: ListItem, storeId: string) =>
    it.store_id === storeId || (it.preferred_store_ids?.includes(storeId) ?? false);

  const { activeVMs, checkedVMs } = useMemo(() => {
    const a: ItemVM[] = [];
    const c: ItemVM[] = [];
    for (const it of items) {
      if (filterStoreId && !itemMatchesStore(it, filterStoreId)) continue;
      const vm = toItemVM(it, categories, storesLookup);
      (it.checked ? c : a).push(vm);
    }
    return { activeVMs: a, checkedVMs: c };
  }, [items, categories, storesLookup, filterStoreId]);

  const groups = useMemo<Group[]>(() => {
    // Store filter active → sort by shelf order, single group.
    if (filterStoreId) {
      const arr = [...activeVMs].sort(
        (x, y) =>
          (shelfOrder.get(x.categoryKey) ?? UNSORTED_SHELF_POSITION) -
          (shelfOrder.get(y.categoryKey) ?? UNSORTED_SHELF_POSITION),
      );
      return [{ key: 'all', label: null, color: null, order: 0, items: arr }];
    }
    if (sortMode !== 'category') {
      const arr = [...activeVMs];
      if (sortMode === 'alpha') arr.sort((x, y) => x.name.localeCompare(y.name, 'de'));
      if (sortMode === 'date') arr.sort((x, y) => y.addedAt - x.addedAt);
      return [{ key: 'all', label: null, color: null, order: 0, items: arr }];
    }
    const map = new Map<string, Group>();
    for (const v of activeVMs) {
      if (!map.has(v.categoryKey))
        map.set(v.categoryKey, {
          key: v.categoryKey,
          label: v.categoryLabel,
          color: v.categoryColor,
          order: v.order,
          items: [],
        });
      map.get(v.categoryKey)!.items.push(v);
    }
    return [...map.values()].sort((x, y) => x.order - y.order);
  }, [activeVMs, sortMode, filterStoreId, shelfOrder]);

  const detailItem = detailId ? (items.find((i) => i.id === detailId) ?? null) : null;
  const storesWithItems = useMemo(
    () => storeList.filter((s) => items.some((it) => itemMatchesStore(it, s.id))),
    [storeList, items],
  );

  const onStoreFilter = async (storeId: string | null) => {
    setFilterStoreId(storeId);
    // Selecting a store starts a fresh shopping session at it; deselecting
    // reverts to default category ordering (categories.sort_order).
    sessionStart.current = Date.now();
    if (storeId) setShelfOrder(await list.loadShelfOrder(storeId));
    else setShelfOrder(new Map());
  };

  const removeWithUndo = (itemId: string) => {
    const it = items.find((x) => x.id === itemId);
    if (!it) return;
    list.remove(itemId);
    setDetailId(null);
    if (snackTimer.current) clearTimeout(snackTimer.current);
    setSnack({ item: it });
    snackTimer.current = setTimeout(() => setSnack(null), 4200);
  };
  const undo = () => {
    if (!snack) return;
    const it = snack.item;
    const newId = ulid();
    const payload: Record<string, unknown> = it.product_id
      ? { item_id: newId, product_id: it.product_id }
      : { item_id: newId, name_override: it.display_name };
    list.submit('item.added', payload, { ...it, id: newId, checked: false, added_at: Date.now() });
    setSnack(null);
  };

  const openShare = async () => {
    setShareOpen(true);
    try {
      const current = await api.get<{ user_id: string }[]>(`/api/lists/${id}/share`);
      setShares(new Set(current.map((s) => s.user_id)));
    } catch {
      setShares(new Set());
    }
  };
  const toggleShare = async (userId: string) => {
    const shared = shares.has(userId);
    const next = new Set(shares);
    if (shared) {
      next.delete(userId);
      await api.delete(`/api/lists/${id}/share/${userId}`).catch(() => {});
    } else {
      next.add(userId);
      await api
        .post(`/api/lists/${id}/share`, { user_id: userId, permission: 'write' })
        .catch(() => {});
    }
    setShares(next);
  };

  const presenceUsers = presence.map((uid) => members[uid] ?? { id: uid, name: uid });

  const userId = useUserStore((s) => s.user?.id);
  const canEditList = !isChild && (role === 'admin' || userId === list.list?.owner_id);

  const submitListEvent = async (type: string, payload: Record<string, unknown>) => {
    await api.post(`/api/lists/${id}/events`, {
      id: ulid(),
      type,
      payload,
      client_ts: Date.now(),
    });
  };

  const handleListRename = async (name: string) => {
    await submitListEvent('list.renamed', { name });
    // The WS broadcast will update the header via the next reload; patch optimistically.
    list.reload();
  };

  const handleListRecolor = async (color: string) => {
    await submitListEvent('list.updated', { color });
    list.reload();
  };

  const handleListDelete = async () => {
    await submitListEvent('list.deleted', {});
    navigate('/lists', { replace: true });
  };

  const renderItem = (vm: ItemVM) => {
    if (view === 'tile')
      return (
        <ItemTile
          key={vm.id}
          item={vm}
          nameWeight={NAME_WEIGHT}
          onToggle={() => list.check(vm.id)}
          onOpen={() => setDetailId(vm.id)}
        />
      );
    if (view === 'card')
      return (
        <ItemRow
          key={vm.id}
          item={vm}
          nameWeight={NAME_WEIGHT}
          view="card"
          onToggle={() => list.check(vm.id)}
          onOpen={() => setDetailId(vm.id)}
        />
      );
    return (
      <SwipeRow key={vm.id} onDelete={() => removeWithUndo(vm.id)}>
        <ItemRow
          item={vm}
          nameWeight={NAME_WEIGHT}
          view="row"
          onToggle={() => list.check(vm.id)}
          onOpen={() => setDetailId(vm.id)}
        />
      </SwipeRow>
    );
  };

  const pillStyle = (on: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    height: 32,
    padding: '0 13px',
    borderRadius: 20,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    flexShrink: 0,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13.5,
    fontWeight: 600,
    border: `1px solid ${on ? 'var(--accent)' : 'var(--border-subtle)'}`,
    background: on ? 'var(--accent-light)' : 'var(--surface-base)',
    color: on ? 'var(--accent)' : 'var(--text-secondary)',
  });

  // Populate the shared fixed header shell (defined once in Layout).
  useSetHeader({
    left: (
      <button
        onClick={() => navigate('/lists')}
        aria-label={t('nav.lists')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: '0 4px',
          color: 'var(--accent)',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          fontWeight: 600,
          minHeight: 44,
        }}
      >
        <Icon
          name="chevron-right"
          size={20}
          strokeWidth={2.2}
          style={{ transform: 'rotate(180deg)' }}
        />
        {t('nav.lists')}
      </button>
    ),
    title: (
      <span
        className="ff-display"
        style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        {list.list?.name ?? '…'}
      </span>
    ),
    right: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <PresenceAvatars users={presenceUsers} />
        {canEditList && (
          <button
            onClick={() => setEditSheetOpen(true)}
            aria-label={t('list_edit.edit_aria')}
            style={iconBtn}
          >
            <Icon name="dots-horizontal" size={18} />
          </button>
        )}
        {!isChild && (
          <button onClick={openShare} aria-label={t('list.share')} style={iconBtn}>
            <Icon name="users" size={18} />
          </button>
        )}
        <button
          onClick={() => setView((v) => (v === 'row' ? 'card' : v === 'card' ? 'tile' : 'row'))}
          aria-label={view === 'tile' ? t('list.list_view') : t('list.tile_view')}
          style={iconBtn}
        >
          <Icon
            name={view === 'tile' ? 'grid' : view === 'card' ? 'card-rows' : 'rows'}
            size={18}
          />
        </button>
        <button onClick={toggleDark} aria-label="Theme" style={iconBtn}>
          <Icon name={dark ? 'sun' : 'moon'} size={18} />
        </button>
      </div>
    ),
  });

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-base)',
        overflow: 'hidden',
      }}
    >
      {/* body — AddBar + sort pills are sticky so they remain visible while items scroll */}
      <div
        className="scroll"
        aria-live="polite"
        style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-base)' }}
      >
        {/* Sticky search/add bar — sticks to top of scroll container as list scrolls */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: 'linear-gradient(180deg, var(--accent-tint) 0%, var(--surface-base) 100%)',
          }}
        >
          <AddBar
            listId={id}
            onAdd={(payload, optimistic) => list.submit('item.added', payload, optimistic)}
          />
          {/* Sort + store filter pills */}
          <div
            className="scroll"
            style={{ display: 'flex', gap: 8, padding: '0 16px 10px', overflowX: 'auto' }}
            aria-label={t('sort.aria_label')}
          >
            {(['category', 'date', 'alpha'] as SortMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  void onStoreFilter(null);
                  setSortMode(m);
                }}
                style={pillStyle(!filterStoreId && sortMode === m)}
              >
                {t(`sort.${m}`)}
              </button>
            ))}
            {storesWithItems.map((s) => (
              <button
                key={s.id}
                onClick={() => onStoreFilter(filterStoreId === s.id ? null : s.id)}
                style={pillStyle(filterStoreId === s.id)}
              >
                <Icon name="store" size={14} strokeWidth={2} />
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {list.status === 'loading' && (
          <div style={{ padding: 24, color: 'var(--text-muted)' }}>{t('list.loading')}</div>
        )}
        {list.status === 'error' && (
          <div style={{ padding: 24, color: '#ef4444' }}>{list.error}</div>
        )}
        {list.status === 'ready' && activeVMs.length === 0 && checkedVMs.length === 0 && (
          <EmptyState />
        )}

        {groups.map((g) => (
          <div key={g.key}>
            {g.label && (
              <CategoryHeader
                label={g.label}
                color={g.color || '#9ca3af'}
                count={g.items.length}
                collapsed={!!collapsed[g.key]}
                onToggle={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
              />
            )}
            {!collapsed[g.key] &&
              (view === 'tile' ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 9,
                    padding: '4px 16px 10px',
                  }}
                >
                  {g.items.map(renderItem)}
                </div>
              ) : view === 'card' ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: '4px 16px 10px',
                  }}
                >
                  {g.items.map(renderItem)}
                </div>
              ) : (
                <div>{g.items.map(renderItem)}</div>
              ))}
          </div>
        ))}

        {/* checked footer */}
        {checkedVMs.length > 0 && (
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--surface-raised)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px' }}>
              <button
                onClick={() => setShowChecked((o) => !o)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--text-secondary)',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'var(--emerald-500)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                  }}
                >
                  <Icon name="check" size={13} strokeWidth={3} />
                </span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {t('list.checked_count', { n: checkedVMs.length })}
                </span>
                <Icon
                  name="chevron-down"
                  size={16}
                  style={{
                    color: 'var(--text-muted)',
                    transform: showChecked ? 'none' : 'rotate(-90deg)',
                    transition: 'transform .2s',
                  }}
                />
              </button>
              {!isChild && (
                <button
                  onClick={() => list.clearChecked(filterStoreId, sessionStart.current)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#ef4444',
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('list.clear_checked')}
                </button>
              )}
            </div>
            {showChecked && (
              <div style={{ paddingBottom: 6 }}>
                {checkedVMs.map((vm) => (
                  <ItemRow
                    key={vm.id}
                    item={vm}
                    nameWeight={NAME_WEIGHT}
                    view="row"
                    onToggle={() => list.uncheck(vm.id)}
                    onOpen={() => setDetailId(vm.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>

      {snack && <Snackbar name={snack.item.display_name} onUndo={undo} />}
      {editSheetOpen && list.list && (
        <ListEditSheet
          list={list.list}
          onRename={handleListRename}
          onRecolor={handleListRecolor}
          onDelete={handleListDelete}
          onClose={() => setEditSheetOpen(false)}
        />
      )}
      {detailItem && (
        <DetailSheet
          item={detailItem}
          categories={categories}
          stores={storeList}
          onUpdate={(patch) => list.update(detailItem.id, patch)}
          onDelete={() => removeWithUndo(detailItem.id)}
          onClose={() => setDetailId(null)}
        />
      )}

      {shareOpen && (
        <div
          onClick={() => setShareOpen(false)}
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
            style={{
              width: '100%',
              background: 'var(--surface-base)',
              borderRadius: '26px 26px 0 0',
              padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
              boxShadow: 'var(--shadow-lg)',
              animation: 'sheetUp .3s cubic-bezier(.2,.9,.3,1)',
              maxHeight: '70%',
              overflowY: 'auto',
            }}
            aria-label={t('share_sheet.aria_label')}
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
            <h2
              className="ff-display"
              style={{ fontSize: 20, fontWeight: 600, margin: '0 0 14px' }}
            >
              {t('share_sheet.title')}
            </h2>
            {Object.values(members).map((m) => {
              const shared = shares.has(m.id);
              return (
                <div
                  key={m.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {m.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: 15, color: 'var(--text-primary)' }}>
                    {m.name}
                  </span>
                  <button onClick={() => toggleShare(m.id)} style={pillStyle(shared)}>
                    {shared ? t('share_sheet.shared') : t('share_sheet.share')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 11,
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface-base)',
  color: 'var(--text-secondary)',
};

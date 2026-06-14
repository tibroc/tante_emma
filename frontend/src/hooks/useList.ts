// useList.ts — controller for the shopping-list screen. Loads the list + lookup
// tables, submits mutations as events (optimistic + offline-queue aware), and
// applies real-time events/presence from the WebSocket. Item state lives in the
// global listStore so the offline catch-up (sync.ts) converges on the same data.
import { useCallback, useEffect, useState } from 'react';
import { ulid } from '../lib/ulid';
import { api } from '../lib/api';
import { subscribe, unsubscribe, onMessage, onReconnect, startWs, connHeaders } from '../lib/ws';
import { resolveCategoryIcon } from '../lib/categories';
import { useListStore } from '../stores/listStore';
import { useSyncStore, setSyncStatus } from '../stores/syncStore';
import { useUserStore } from '../stores/userStore';
import { enqueue, drainQueue, pendingCount, type LocalEvent } from '../lib/offline/eventQueue';
import type { CategoryLookup, StoreLookup } from '../lib/viewmodel';
import type {
  List,
  ListDetail,
  ListItem,
  Category,
  Store,
  Product,
  EventsResponse,
} from '../lib/types';

export const UNSORTED_SHELF_POSITION = 9999;

export interface Member {
  id: string;
  name: string;
  avatar_url?: string;
}

interface Meta {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  list?: List;
  categories: CategoryLookup;
  storesLookup: StoreLookup;
  storeList: Store[];
  members: Record<string, Member>;
  presence: string[];
}

export function useList(listId: string) {
  const items = useListStore((s) => s.items);
  const setItems = useListStore((s) => s.setItems);
  const apply = useListStore((s) => s.apply);
  const patchItem = useListStore((s) => s.patchItem);
  const user = useUserStore((s) => s.user);

  const [meta, setMeta] = useState<Meta>({
    status: 'loading',
    categories: {},
    storesLookup: {},
    storeList: [],
    members: {},
    presence: [],
  });

  const reload = useCallback(async () => {
    try {
      // Push any queued offline events first; only overwrite local item state
      // when nothing remains queued (else we'd discard optimistic edits).
      let remaining = 0;
      try {
        const drained = await drainQueue(listId);
        if (drained > 0) setSyncStatus('online');
        remaining = await pendingCount(listId);
      } catch {
        remaining = await pendingCount(listId).catch(() => 0);
      }

      const [detail, cats, stores, members] = await Promise.all([
        api.get<ListDetail>(`/api/lists/${listId}`),
        api.get<Category[]>(`/api/categories`).catch(() => [] as Category[]),
        api.get<Store[]>(`/api/stores`).catch(() => [] as Store[]),
        api.get<Member[]>(`/api/users/members`).catch(() => [] as Member[]),
      ]);

      const categories: CategoryLookup = {};
      cats.forEach((c, i) => {
        categories[c.id] = {
          name: c.name_de || c.name_en || '—',
          color: c.color || '#9ca3af',
          icon: resolveCategoryIcon(c.icon),
          order: c.sort_order ?? i,
        };
      });
      const storesLookup: StoreLookup = {};
      for (const s of stores) storesLookup[s.id] = s.name;
      const memberMap: Record<string, Member> = {};
      for (const m of members) memberMap[m.id] = m;

      if (remaining === 0) setItems(detail.items);
      setMeta((prev) => ({
        ...prev,
        status: 'ready',
        list: detail.list,
        categories,
        storesLookup,
        storeList: stores,
        members: memberMap,
      }));
    } catch (err) {
      setMeta((prev) => ({
        ...prev,
        status: 'error',
        error: String((err as Error)?.message ?? err),
      }));
    }
  }, [listId, setItems]);

  useEffect(() => {
    reload();
  }, [reload]);

  // WebSocket: subscribe, reconnect-reload, apply remote events + presence.
  useEffect(() => {
    startWs();
    subscribe(listId);
    const offReconnect = onReconnect(() => {
      void reload();
    });
    const enrichFromProduct = async (itemId: string, productId: string) => {
      try {
        const p = await api.get<Product>(`/api/products/${productId}`);
        const name = p.name_de || p.name_en || p.name_pt || '';
        patchItem(itemId, { display_name: name, category_id: p.category_id ?? null });
      } catch {
        /* leave as-is; a reload will fix it */
      }
    };
    const off = onMessage((msg) => {
      if (msg.type === 'event') {
        const ev = msg.event;
        if (ev.list_id !== listId) return;
        apply(ev);
        if (ev.type === 'item.added') {
          const p = ev.payload as { item_id?: string; product_id?: string; name_override?: string };
          if (p.product_id && !p.name_override && p.item_id)
            void enrichFromProduct(p.item_id, p.product_id);
        }
      } else if (msg.type === 'presence') {
        if (msg.list_id !== listId || msg.user_id === user?.id) return;
        setMeta((prev) => {
          const set = new Set(prev.presence);
          if (msg.active) set.add(msg.user_id);
          else set.delete(msg.user_id);
          return { ...prev, presence: [...set] };
        });
      }
    });
    return () => {
      off();
      offReconnect();
      unsubscribe(listId);
    };
  }, [listId, user?.id, reload, apply, patchItem]);

  // Submit an event: optimistic local apply, then POST (or enqueue if offline).
  const submit = useCallback(
    async (type: string, payload: Record<string, unknown>, optimistic?: ListItem) => {
      const eventId =
        type === 'item.added' && typeof payload.item_id === 'string'
          ? (payload.item_id as string)
          : ulid();
      if (type === 'item.added' && optimistic) {
        if (!useListStore.getState().items.some((i) => i.id === optimistic.id)) {
          setItems([optimistic, ...useListStore.getState().items]);
        }
      } else {
        apply({ type, list_id: listId, payload });
      }

      const event: LocalEvent = {
        id: eventId,
        type,
        list_id: listId,
        user_id: user?.id ?? '',
        payload,
        client_ts: Date.now(),
      };

      const offline = useSyncStore.getState().status === 'offline' || !navigator.onLine;
      if (offline) {
        await enqueue(event);
        return;
      }
      try {
        const res = await api.post<EventsResponse>(
          `/api/lists/${listId}/events`,
          event,
          connHeaders(),
        );
        if (type === 'item.added') {
          const added = res.events?.find((e) => e.type === 'item.added');
          const cat = added?.payload?.category_id as string | undefined;
          if (cat && typeof payload.item_id === 'string')
            patchItem(payload.item_id, { category_id: cat });
        }
      } catch {
        await enqueue(event).catch(() => {});
        setSyncStatus('offline');
      }
    },
    [listId, user?.id, apply, setItems, patchItem],
  );

  const check = useCallback((id: string) => submit('item.checked', { item_id: id }), [submit]);
  const uncheck = useCallback((id: string) => submit('item.unchecked', { item_id: id }), [submit]);
  const remove = useCallback((id: string) => submit('item.deleted', { item_id: id }), [submit]);
  const update = useCallback(
    (id: string, patch: Record<string, unknown>) =>
      submit('item.updated', { item_id: id, ...patch }),
    [submit],
  );
  const clearChecked = useCallback(
    (storeId?: string | null, sessionStart?: number) =>
      submit(
        'list.cleared',
        storeId ? { store_id: storeId, session_start: sessionStart ?? 0 } : {},
      ),
    [submit],
  );

  const loadShelfOrder = useCallback(async (storeId: string): Promise<Map<string, number>> => {
    try {
      const rows = await api.get<{ category_id: string; position: number }[]>(
        `/api/stores/${storeId}/shelf-order`,
      );
      const m = new Map<string, number>();
      for (const r of rows) m.set(r.category_id, r.position);
      return m;
    } catch {
      return new Map();
    }
  }, []);

  return {
    ...meta,
    items,
    submit,
    check,
    uncheck,
    remove,
    update,
    clearChecked,
    reload,
    loadShelfOrder,
  };
}

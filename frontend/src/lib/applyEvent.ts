// applyEvent.ts — pure event reducer over a list-items array, ported from the
// Svelte frontend's lib/offline/applyEvent.ts. Single source of truth so the
// optimistic, WebSocket, and (future) offline-catchup paths can't drift.

import type { ListItem } from './types';

export interface ReducerEvent {
  type: string;
  list_id?: string;
  payload: Record<string, unknown>;
}

function emptyItem(id: string, listId: string): ListItem {
  return {
    id,
    list_id: listId,
    product_id: null,
    name_override: null,
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
    category_id: null,
    category_color: null,
    category_icon: null,
    display_name: '',
    preferred_store_ids: null,
  };
}

export function applyEvent(current: ListItem[], event: ReducerEvent): ListItem[] {
  const p = event.payload as Record<string, unknown>;
  switch (event.type) {
    case 'item.added': {
      const itemId = p.item_id as string;
      if (current.some((i) => i.id === itemId)) return current;
      const item = emptyItem(itemId, event.list_id ?? '');
      item.product_id = (p.product_id as string) ?? null;
      item.name_override = (p.name_override as string) ?? null;
      item.category_id = (p.category_id as string) ?? null;
      item.quantity = (p.quantity as number) ?? null;
      item.unit = (p.unit as string) ?? null;
      item.note = (p.note as string) ?? null;
      item.store_id = (p.store_id as string) ?? null;
      item.display_name = (p.name_override as string) ?? '';
      return [item, ...current];
    }
    case 'item.checked': {
      const id = p.item_id as string;
      return current.map((i) =>
        i.id === id ? { ...i, checked: true, checked_at: Date.now() } : i,
      );
    }
    case 'item.unchecked': {
      const id = p.item_id as string;
      return current.map((i) => (i.id === id ? { ...i, checked: false, checked_at: null } : i));
    }
    case 'item.deleted': {
      const id = p.item_id as string;
      return current.filter((i) => i.id !== id);
    }
    case 'item.updated': {
      const id = p.item_id as string;
      return current.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i };
        if (p.name_override !== undefined) {
          next.name_override = p.name_override as string;
          next.display_name = p.name_override as string;
        }
        if (p.quantity !== undefined) next.quantity = p.quantity as number;
        if (p.unit !== undefined) next.unit = p.unit as string;
        if (p.note !== undefined) next.note = p.note as string;
        if (p.store_id !== undefined) next.store_id = p.store_id as string;
        return next;
      });
    }
    case 'list.cleared':
      return current.filter((i) => !i.checked);
    default:
      return current;
  }
}

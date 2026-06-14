// listStore.ts — Zustand store for the active list's items. Replaces the Svelte
// `items` writable. Single global home for item state so the WebSocket handler,
// optimistic mutations, and the offline catch-up (sync.ts) all converge here
// through the shared `applyEvent` reducer.
import { create } from 'zustand';
import { applyEvent, type ReducerEvent } from '../lib/applyEvent';
import type { ListItem } from '../lib/types';

interface ListState {
  items: ListItem[];
  setItems: (items: ListItem[]) => void;
  apply: (event: ReducerEvent) => void;
  patchItem: (id: string, patch: Partial<ListItem>) => void;
  reset: () => void;
}

export const useListStore = create<ListState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  apply: (event) => set((s) => ({ items: applyEvent(s.items, event) })),
  patchItem: (id, patch) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
  reset: () => set({ items: [] }),
}));

// Non-hook accessors for plain-TS modules (offline sync.ts).
export const listStore = {
  getItems: () => useListStore.getState().items,
  setItems: (items: ListItem[]) => useListStore.getState().setItems(items),
  apply: (event: ReducerEvent) => useListStore.getState().apply(event),
};

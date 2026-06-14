// syncStore.ts — online/offline/syncing status. Mirrors the Svelte syncStore,
// including the window online/offline listeners.
import { create } from 'zustand';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

interface SyncState {
  status: SyncStatus;
  setStatus: (s: SyncStatus) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
  setStatus: (status) => set({ status }),
}));

export const setSyncStatus = (s: SyncStatus) => useSyncStore.getState().setStatus(s);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => setSyncStatus('syncing'));
  window.addEventListener('offline', () => setSyncStatus('offline'));
}

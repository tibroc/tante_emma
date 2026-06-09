import { writable } from 'svelte/store';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

export const syncStatus = writable<SyncStatus>('online');

if (typeof window !== 'undefined') {
	window.addEventListener('online',  () => syncStatus.set('online'));
	window.addEventListener('offline', () => syncStatus.set('offline'));
}

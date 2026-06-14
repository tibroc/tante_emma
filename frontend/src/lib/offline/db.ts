// db.ts — IndexedDB wrapper, ported from the Svelte frontend. Framework-agnostic.
import { openDB, type IDBPDatabase } from 'idb';

interface TanteEmmaDB {
  events_queue: { key: string; value: unknown; indexes: { list_id: string } };
  lists: { key: string; value: unknown };
  list_items: { key: string; value: unknown; indexes: { list_id: string } };
  products: { key: string; value: unknown };
  sync_cursors: { key: string; value: string };
}

let _db: IDBPDatabase<TanteEmmaDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<TanteEmmaDB>> {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is not available');
  if (_db) return _db;

  _db = await openDB<TanteEmmaDB>('tanteemma', 1, {
    upgrade(db) {
      db.createObjectStore('events_queue', { keyPath: 'id' }).createIndex('list_id', 'list_id');
      db.createObjectStore('lists', { keyPath: 'id' });
      db.createObjectStore('list_items', { keyPath: 'id' }).createIndex('list_id', 'list_id');
      db.createObjectStore('products', { keyPath: 'id' });
      db.createObjectStore('sync_cursors');
    },
  });
  return _db;
}

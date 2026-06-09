import { getDB } from './db';
import { drainQueue } from './eventQueue';
import { api } from '$lib/api';
import { items } from '$lib/stores/listStore';

export async function syncList(listId: string): Promise<void> {
	await drainQueue(listId);

	const db = await getDB();
	const cursor = await db.get('sync_cursors', listId);

	const { events } = await api.get<{ events: unknown[] }>(
		`/api/lists/${listId}/events?since=${cursor ?? ''}`
	);

	// TODO: apply events to local store state
	void events;

	if (events.length > 0) {
		const lastId = (events.at(-1) as { id: string }).id;
		await db.put('sync_cursors', lastId, listId);
	}
}

export function applyEventLocally(_event: unknown): void {
	// TODO: update `items` store optimistically based on event type
	items.update((current) => current);
}

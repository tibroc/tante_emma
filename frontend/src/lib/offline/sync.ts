import { getDB } from './db';
import { drainQueue } from './eventQueue';
import { applyEvent } from './applyEvent';
import { api } from '$lib/api';
import { items } from '$lib/stores/listStore';

interface RawEvent {
	id: string;
	type: string;
	list_id: string;
	payload: Record<string, unknown>;
}

export async function syncList(listId: string): Promise<void> {
	await drainQueue(listId);

	const db = await getDB();
	const cursor = await db.get('sync_cursors', listId);

	const { events } = await api.get<{ events: RawEvent[] }>(
		`/api/lists/${listId}/events?since=${cursor ?? ''}`
	);

	for (const ev of events) {
		applyEventLocally(ev);
	}

	if (events.length > 0) {
		const lastId = events[events.length - 1].id;
		await db.put('sync_cursors', lastId, listId);
	}
}

export function applyEventLocally(event: RawEvent): void {
	items.update((current) => applyEvent(current, event));
}

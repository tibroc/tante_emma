import { getDB } from './db';
import { api } from '$lib/api';

export interface LocalEvent {
	id: string;           // ULID
	type: string;
	list_id: string;
	user_id: string;
	payload: unknown;
	client_ts: number;
}

export async function enqueue(event: LocalEvent): Promise<void> {
	const db = await getDB();
	await db.add('events_queue', event);
}

export async function drainQueue(listId: string): Promise<void> {
	const db = await getDB();
	const pending = await db.getAllFromIndex('events_queue', 'list_id', listId);
	if (pending.length === 0) return;

	await api.post(`/api/lists/${listId}/events`, { events: pending });

	const tx = db.transaction('events_queue', 'readwrite');
	await Promise.all(pending.map((e) => tx.store.delete((e as LocalEvent).id)));
	await tx.done;
}

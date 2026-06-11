import { dev } from '$app/environment';
import { getDB } from './db';
import { api } from '$lib/api';
import { connHeaders } from '$lib/ws';

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
	if (dev) console.log('[offline] enqueued', event.type, event.id);
}

export async function pendingCount(listId: string): Promise<number> {
	const db = await getDB();
	return db.countFromIndex('events_queue', 'list_id', listId);
}

// Serialize drains per list so a double reconnect can't post the same events
// twice (which would race the dequeue and re-submit duplicates).
const draining = new Map<string, Promise<number>>();

// Returns the number of events successfully drained. Throws if the POST fails
// (e.g. still offline) so the caller can keep optimistic state.
export function drainQueue(listId: string): Promise<number> {
	const existing = draining.get(listId);
	if (existing) return existing;

	const run = doDrain(listId).finally(() => draining.delete(listId));
	draining.set(listId, run);
	return run;
}

async function doDrain(listId: string): Promise<number> {
	const db = await getDB();
	const pending = await db.getAllFromIndex('events_queue', 'list_id', listId);
	if (pending.length === 0) return 0;

	if (dev) console.log('[offline] draining', pending.length, 'events for', listId);
	await api.post(`/api/lists/${listId}/events`, { events: pending }, connHeaders());

	// Delete each in its own short-lived transaction to avoid the transaction
	// going inactive across awaits ("object is no longer usable").
	for (const e of pending) {
		await db.delete('events_queue', (e as LocalEvent).id);
	}
	if (dev) console.log('[offline] drained', pending.length, 'events');
	return pending.length;
}

import { getDB } from './db';
import { drainQueue } from './eventQueue';
import { api } from '$lib/api';
import { items } from '$lib/stores/listStore';
import type { ListItem } from '$lib/stores/listStore';

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
	items.update((current) => {
		switch (event.type) {
			case 'item.added': {
				const p = event.payload as {
					item_id: string;
					name_override?: string;
					product_id?: string;
					quantity?: number;
					unit?: string;
				};
				if (current.find((i) => i.id === p.item_id)) return current;
				const newItem: ListItem = {
					id: p.item_id,
					list_id: event.list_id,
					product_id: p.product_id,
					name_override: p.name_override,
					quantity: p.quantity,
					unit: p.unit,
					checked: false,
					added_by: '',
					added_at: Date.now(),
					sort_order: 0,
					display_name: p.name_override
				};
				return [newItem, ...current];
			}
			case 'item.checked': {
				const p = event.payload as { item_id: string };
				return current.map((i) => (i.id === p.item_id ? { ...i, checked: true } : i));
			}
			case 'item.unchecked': {
				const p = event.payload as { item_id: string };
				return current.map((i) => (i.id === p.item_id ? { ...i, checked: false } : i));
			}
			case 'item.deleted': {
				const p = event.payload as { item_id: string };
				return current.filter((i) => i.id !== p.item_id);
			}
			case 'list.cleared':
				return current.filter((i) => !i.checked);
			default:
				return current;
		}
	});
}

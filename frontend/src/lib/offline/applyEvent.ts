import type { ListItem } from '$lib/stores/listStore';

// ReducerEvent is the minimal shape both event sources share: the real-time
// WebSocket broadcast (lists/[id]/+page.svelte) and the offline catch-up fetch
// (offline/sync.ts). The server's models.Event serializes list_id + payload.
export interface ReducerEvent {
	type: string;
	list_id?: string;
	payload: Record<string, unknown>;
}

/**
 * applyEvent is the single source of truth for materializing an event onto a
 * list-items array. It is a pure function — `(current, event) => next` — so the
 * online and offline paths can never drift (previously two divergent copies
 * existed; the offline one silently dropped category/store/note metadata, so
 * items synced while offline couldn't sort by store until a full reload).
 */
export function applyEvent(current: ListItem[], event: ReducerEvent): ListItem[] {
	switch (event.type) {
		case 'item.added': {
			const p = event.payload as {
				item_id: string;
				product_id?: string;
				name_override?: string;
				category_id?: string;
				quantity?: number;
				unit?: string;
				note?: string;
				store_id?: string;
			};
			if (current.some((i) => i.id === p.item_id)) return current;
			const newItem: ListItem = {
				id: p.item_id,
				list_id: event.list_id ?? '',
				product_id: p.product_id,
				name_override: p.name_override,
				quantity: p.quantity,
				unit: p.unit,
				note: p.note,
				checked: false,
				added_by: '',
				added_at: Date.now(),
				sort_order: 0,
				store_id: p.store_id,
				category_id: p.category_id,
				display_name: p.name_override ?? ''
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
		case 'item.updated': {
			const p = event.payload as {
				item_id: string;
				name_override?: string;
				quantity?: number;
				unit?: string;
				note?: string;
				store_id?: string;
			};
			return current.map((i) => {
				if (i.id !== p.item_id) return i;
				const next = { ...i };
				if (p.name_override !== undefined) {
					next.name_override = p.name_override;
					next.display_name = p.name_override;
				}
				if (p.quantity !== undefined) next.quantity = p.quantity;
				if (p.unit !== undefined) next.unit = p.unit;
				if (p.note !== undefined) next.note = p.note;
				if (p.store_id !== undefined) next.store_id = p.store_id;
				return next;
			});
		}
		case 'list.cleared':
			return current.filter((i) => !i.checked);
		default:
			return current;
	}
}

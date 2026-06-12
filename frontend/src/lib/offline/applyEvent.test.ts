import { describe, it, expect } from 'vitest';
import { applyEvent, type ReducerEvent } from './applyEvent';
import type { ListItem } from '../stores/listStore';

// ── fixtures ───────────────────────────────────────────────────────────────

function item(overrides: Partial<ListItem> = {}): ListItem {
	return {
		id: 'i1',
		list_id: 'l1',
		checked: false,
		added_by: 'u1',
		added_at: 0,
		sort_order: 0,
		display_name: 'Apples',
		...overrides
	};
}

function event(type: string, payload: Record<string, unknown>, listId = 'l1'): ReducerEvent {
	return { type, list_id: listId, payload };
}

// ── item.added ─────────────────────────────────────────────────────────────

describe('applyEvent — item.added', () => {
	it('prepends the new item to the list', () => {
		const existing = item({ id: 'i0', display_name: 'Butter' });
		const result = applyEvent(
			[existing],
			event('item.added', { item_id: 'i1', name_override: 'Apples' })
		);
		expect(result).toHaveLength(2);
		expect(result[0].id).toBe('i1');
		expect(result[0].display_name).toBe('Apples');
		expect(result[0].checked).toBe(false);
	});

	it('carries optional fields from the payload', () => {
		const result = applyEvent(
			[],
			event('item.added', {
				item_id: 'i1',
				name_override: 'Milk',
				product_id: 'p1',
				quantity: 2,
				unit: 'l',
				note: 'organic',
				store_id: 's1',
				category_id: 'c1'
			})
		);
		expect(result[0].product_id).toBe('p1');
		expect(result[0].quantity).toBe(2);
		expect(result[0].unit).toBe('l');
		expect(result[0].note).toBe('organic');
		expect(result[0].store_id).toBe('s1');
		expect(result[0].category_id).toBe('c1');
	});

	it('is idempotent: ignores a second add with the same item_id', () => {
		const initial = [item({ id: 'i1', display_name: 'Apples' })];
		const result = applyEvent(
			initial,
			event('item.added', { item_id: 'i1', name_override: 'Apples again' })
		);
		expect(result).toHaveLength(1);
		expect(result[0].display_name).toBe('Apples'); // unchanged
	});
});

// ── item.checked ───────────────────────────────────────────────────────────

describe('applyEvent — item.checked', () => {
	it('marks the target item as checked', () => {
		const items = [item({ id: 'i1' }), item({ id: 'i2' })];
		const result = applyEvent(items, event('item.checked', { item_id: 'i1' }));
		expect(result.find((i) => i.id === 'i1')?.checked).toBe(true);
		expect(result.find((i) => i.id === 'i2')?.checked).toBe(false);
	});

	it('does not mutate the original array', () => {
		const original = [item({ id: 'i1' })];
		applyEvent(original, event('item.checked', { item_id: 'i1' }));
		expect(original[0].checked).toBe(false);
	});
});

// ── item.unchecked ─────────────────────────────────────────────────────────

describe('applyEvent — item.unchecked', () => {
	it('clears the checked flag', () => {
		const items = [item({ id: 'i1', checked: true })];
		const result = applyEvent(items, event('item.unchecked', { item_id: 'i1' }));
		expect(result[0].checked).toBe(false);
	});
});

// ── item.deleted ───────────────────────────────────────────────────────────

describe('applyEvent — item.deleted', () => {
	it('removes the item from the list', () => {
		const items = [item({ id: 'i1' }), item({ id: 'i2' })];
		const result = applyEvent(items, event('item.deleted', { item_id: 'i1' }));
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('i2');
	});

	it('is a no-op when item_id is not found', () => {
		const items = [item({ id: 'i1' })];
		const result = applyEvent(items, event('item.deleted', { item_id: 'unknown' }));
		expect(result).toHaveLength(1);
	});
});

// ── item.updated ───────────────────────────────────────────────────────────

describe('applyEvent — item.updated', () => {
	it('updates only the provided fields', () => {
		const items = [
			item({ id: 'i1', display_name: 'Apples', quantity: 1, unit: 'kg', note: 'old note' })
		];
		const result = applyEvent(items, event('item.updated', { item_id: 'i1', note: 'new note' }));
		expect(result[0].note).toBe('new note');
		expect(result[0].quantity).toBe(1); // unchanged
		expect(result[0].unit).toBe('kg'); // unchanged
	});

	it('updates display_name when name_override is provided', () => {
		const items = [item({ id: 'i1', display_name: 'Old Name' })];
		const result = applyEvent(
			items,
			event('item.updated', { item_id: 'i1', name_override: 'New Name' })
		);
		expect(result[0].name_override).toBe('New Name');
		expect(result[0].display_name).toBe('New Name');
	});

	it('updates store_id', () => {
		const items = [item({ id: 'i1', store_id: 's1' })];
		const result = applyEvent(items, event('item.updated', { item_id: 'i1', store_id: 's2' }));
		expect(result[0].store_id).toBe('s2');
	});

	it('clears store_id when set to empty string', () => {
		const items = [item({ id: 'i1', store_id: 's1' })];
		const result = applyEvent(items, event('item.updated', { item_id: 'i1', store_id: '' }));
		expect(result[0].store_id).toBe('');
	});

	it('leaves store_id unchanged when not in payload', () => {
		const items = [item({ id: 'i1', store_id: 's1' })];
		const result = applyEvent(items, event('item.updated', { item_id: 'i1', note: 'x' }));
		expect(result[0].store_id).toBe('s1');
	});

	it('is a no-op when item_id is not found', () => {
		const items = [item({ id: 'i1', display_name: 'Apples' })];
		const result = applyEvent(items, event('item.updated', { item_id: 'unknown', note: 'x' }));
		expect(result[0].display_name).toBe('Apples');
	});
});

// ── list.cleared ───────────────────────────────────────────────────────────

describe('applyEvent — list.cleared', () => {
	it('removes checked items and keeps unchecked ones', () => {
		const items = [
			item({ id: 'i1', checked: true }),
			item({ id: 'i2', checked: false }),
			item({ id: 'i3', checked: true })
		];
		const result = applyEvent(items, event('list.cleared', {}));
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('i2');
	});

	it('returns an empty array when all items were checked', () => {
		const items = [item({ id: 'i1', checked: true })];
		expect(applyEvent(items, event('list.cleared', {}))).toHaveLength(0);
	});
});

// ── unknown event type ─────────────────────────────────────────────────────

describe('applyEvent — unknown type', () => {
	it('returns the original list unchanged', () => {
		const items = [item({ id: 'i1' })];
		const result = applyEvent(items, event('store.created', { id: 's1' }));
		expect(result).toEqual(items);
	});
});

import { describe, it, expect } from 'vitest';
import { toItemVM, type CategoryLookup, type StoreLookup } from './viewmodel';
import type { ListItem } from './types';

function item(overrides: Partial<ListItem> = {}): ListItem {
  return {
    id: 'i1',
    list_id: 'l1',
    product_id: null,
    name_override: null,
    quantity: null,
    unit: null,
    note: null,
    checked: false,
    checked_by: null,
    checked_at: null,
    added_by: 'u1',
    added_at: 0,
    sort_order: 0,
    store_id: null,
    category_id: null,
    category_color: null,
    category_icon: null,
    display_name: 'Milch',
    preferred_store_ids: null,
    ...overrides,
  };
}

const categories: CategoryLookup = {
  c1: { name: 'Kühlregal', color: '#06b6d4', icon: 'dairy', order: 3 },
};
const stores: StoreLookup = { s1: 'REWE' };

describe('toItemVM', () => {
  it('maps name, falling back to — when empty', () => {
    expect(toItemVM(item(), categories, stores).name).toBe('Milch');
    expect(toItemVM(item({ display_name: '' }), categories, stores).name).toBe('—');
  });

  it('formats quantity with a comma decimal and passes unit through as a code', () => {
    const vm = toItemVM(item({ quantity: 1.5, unit: 'kg' }), categories, stores);
    expect(vm.qty).toBe('1,5');
    expect(vm.unit).toBe('kg');
  });

  it('leaves qty undefined when there is no quantity', () => {
    expect(toItemVM(item({ quantity: null }), categories, stores).qty).toBeUndefined();
  });

  it('resolves store_id to the store name (undefined when unset)', () => {
    expect(toItemVM(item({ store_id: 's1' }), categories, stores).store).toBe('REWE');
    expect(toItemVM(item(), categories, stores).store).toBeUndefined();
  });

  it('resolves category color/icon/label/order from the lookup', () => {
    const vm = toItemVM(item({ category_id: 'c1' }), categories, stores);
    expect(vm.categoryColor).toBe('#06b6d4');
    expect(vm.categoryIcon).toBe('dairy');
    expect(vm.categoryLabel).toBe('Kühlregal');
    expect(vm.categoryKey).toBe('c1');
    expect(vm.order).toBe(3);
  });

  it('falls back gracefully when category_id is unknown', () => {
    const vm = toItemVM(
      item({ category_id: 'nope', category_color: '#abcdef', category_icon: '🥖' }),
      categories,
      stores,
    );
    // unknown id → use item-level color + bridged icon, neutral label/group
    expect(vm.categoryColor).toBe('#abcdef');
    expect(vm.categoryIcon).toBe('bread');
    expect(vm.categoryKey).toBe('nope');
    expect(vm.categoryLabel).toBe('Sonstiges');
  });

  it('uses the catch-all group key when there is no category at all', () => {
    expect(toItemVM(item(), categories, stores).categoryKey).toBe('__none__');
  });

  it('passes the checked flag through', () => {
    expect(toItemVM(item({ checked: true }), categories, stores).checked).toBe(true);
  });
});

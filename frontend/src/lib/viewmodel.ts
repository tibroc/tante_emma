// viewmodel.ts — adapt the backend's models.ListItem into the shape the
// design-ref presentational components expect.
//
// Resolution sources (all from the live API, no backend changes):
//   - category name/color/icon: GET /api/categories  (id -> {name_de, color, icon})
//   - store name:               GET /api/stores       (id -> name)
//   - item name/qty/checked:    the list item itself
// Brand is NOT exposed on list items, so it's omitted (no fabrication). The
// design ref's per-name CATEGORIES map is only a fallback when a category_id
// can't be resolved.

import type { ListItem } from './types';
import { resolveCategoryIcon, FALLBACK_CATEGORY } from './categories';
import type { IconName } from '../components/Icon';

export interface CategoryInfo {
  name: string;
  color: string;
  icon: IconName;
  order: number;
}
export type CategoryLookup = Record<string, CategoryInfo>;
export type StoreLookup = Record<string, string>;

export interface ItemVM {
  id: string;
  name: string;
  qty?: string; // quantity number, formatted (no unit)
  unit?: string; // raw unit code (pcs|g|kg|ml|l|pkg); translated at display
  store?: string;
  checked: boolean;
  categoryColor: string;
  categoryIcon: IconName;
  categoryKey: string; // group key (category_id, or '__none__')
  categoryLabel: string;
  order: number;
  addedAt: number;
}

function formatQuantity(quantity: number | null): string | undefined {
  if (quantity == null) return undefined;
  return String(quantity).replace('.', ',');
}

export function toItemVM(it: ListItem, categories: CategoryLookup, stores: StoreLookup): ItemVM {
  const cat = it.category_id ? categories[it.category_id] : undefined;
  const color = cat?.color || it.category_color || FALLBACK_CATEGORY.color;
  const icon = cat?.icon ?? resolveCategoryIcon(it.category_icon);
  return {
    id: it.id,
    name: it.display_name || '—',
    qty: formatQuantity(it.quantity),
    unit: it.unit ?? undefined,
    store: it.store_id ? stores[it.store_id] : undefined,
    checked: it.checked,
    categoryColor: color,
    categoryIcon: icon,
    categoryKey: it.category_id ?? '__none__',
    categoryLabel: cat?.name || 'Sonstiges',
    order: cat?.order ?? 50,
    addedAt: it.added_at,
  };
}

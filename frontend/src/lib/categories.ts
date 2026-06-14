// categories.ts — category color + design line-icon, ported from
// design-ref/icons.jsx CATEGORIES, plus a best-effort bridge from whatever the
// backend stores per category.
//
// KNOWN GAP (PoC): the design ref keys category styling off the German category
// NAME, but GET /api/lists/:id returns per-item `category_id`, `category_color`,
// and `category_icon` (an emoji or icon-name from the seed). The list endpoint
// does NOT return the category name. So here we:
//   1. Always trust the backend's `category_color` when present.
//   2. Pick a design line-icon by mapping the backend `category_icon` (emoji or
//      name) to our icon set, falling back to 'pantry'.
// Firm this up once we see real seed data (decide one canonical category-icon
// vocabulary shared by seed + frontend).

import type { IconName } from '../components/Icon';

export interface CategoryMeta {
  color: string;
  icon: IconName;
  order: number;
}

// Verbatim from design-ref. Keyed by German display name (used as a fallback
// when we can resolve a name; the live data path keys off backend fields).
export const CATEGORIES: Record<string, CategoryMeta> = {
  'Obst & Gemüse': { color: '#22c55e', icon: 'produce', order: 1 },
  'Brot & Backwaren': { color: '#f59e0b', icon: 'bread', order: 2 },
  Kühlregal: { color: '#06b6d4', icon: 'dairy', order: 3 },
  Käse: { color: '#eab308', icon: 'cheese', order: 4 },
  'Fleisch & Wurst': { color: '#ef4444', icon: 'meat', order: 5 },
  Süßwaren: { color: '#f43f5e', icon: 'sweets', order: 6 },
  Getränke: { color: '#3b82f6', icon: 'drinks', order: 7 },
  Sonstiges: { color: '#9ca3af', icon: 'pantry', order: 99 },
};

export const FALLBACK_CATEGORY: CategoryMeta = CATEGORIES['Sonstiges'];

// Map backend category_icon (emoji or icon-name) -> our design line-icon set.
const ICON_BRIDGE: Record<string, IconName> = {
  // emoji
  '🥦': 'produce',
  '🥕': 'produce',
  '🍎': 'produce',
  '🍏': 'produce',
  '🍞': 'bread',
  '🥖': 'bread',
  '🥐': 'bread',
  '🥛': 'dairy',
  '🧈': 'dairy',
  '🥚': 'dairy',
  '🧀': 'cheese',
  '🥩': 'meat',
  '🍗': 'meat',
  '🌭': 'meat',
  '🍫': 'sweets',
  '🍬': 'sweets',
  '🍭': 'sweets',
  '🍪': 'sweets',
  '🥤': 'drinks',
  '🧃': 'drinks',
  '☕': 'drinks',
  '🍷': 'drinks',
  '🍺': 'drinks',
  '🥫': 'pantry',
  '🍝': 'pantry',
  '🧂': 'pantry',
  // possible icon-name strings
  produce: 'produce',
  vegetables: 'produce',
  fruit: 'produce',
  bread: 'bread',
  bakery: 'bread',
  dairy: 'dairy',
  fridge: 'dairy',
  cheese: 'cheese',
  meat: 'meat',
  sweets: 'sweets',
  candy: 'sweets',
  drinks: 'drinks',
  beverages: 'drinks',
  pantry: 'pantry',
  canned: 'pantry',
  other: 'pantry',
};

export function resolveCategoryIcon(categoryIcon?: string | null): IconName {
  if (!categoryIcon) return 'pantry';
  return ICON_BRIDGE[categoryIcon] ?? ICON_BRIDGE[categoryIcon.toLowerCase()] ?? 'pantry';
}

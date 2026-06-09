import { writable } from 'svelte/store';

export interface ListItem {
	id: string;
	list_id: string;
	product_id?: string;
	name_override?: string;
	quantity?: number;
	unit?: string;
	note?: string;
	checked: boolean;
	checked_by?: string;
	checked_at?: number;
	added_by: string;
	added_at: number;
	sort_order: number;
	store_id?: string;
	// Joined fields for display
	display_name?: string;
	brand?: string;
	category?: { id: string; name: string; icon: string; color: string };
}

export interface List {
	id: string;
	name: string;
	type: 'group' | 'private';
	owner_id: string;
	icon?: string;
	color?: string;
	archived: boolean;
	created_at: number;
	updated_at: number;
}

export const lists    = writable<List[]>([]);
export const items    = writable<ListItem[]>([]);
export const activeId = writable<string | null>(null);

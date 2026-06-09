import { writable } from 'svelte/store';

export interface User {
	id: string;
	name: string;
	email: string;
	avatar_url?: string;
	role: 'admin' | 'member' | 'child';
	locale: string;
}

export const user = writable<User | null>(null);

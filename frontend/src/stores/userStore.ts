// userStore.ts — the authenticated user. Mirrors the Svelte userStore.
import { create } from 'zustand';
import type { User } from '../lib/types';

interface UserState {
  user: User | null;
  setUser: (u: User | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

import { create } from 'zustand';
import type { ReactNode } from 'react';

interface HeaderStore {
  left: ReactNode;
  title: ReactNode;
  right: ReactNode;
  setHeader: (slots: { left?: ReactNode; title?: ReactNode; right?: ReactNode }) => void;
  clearHeader: () => void;
}

export const useHeaderStore = create<HeaderStore>((set) => ({
  left: null,
  title: null,
  right: null,
  setHeader: ({ left = null, title = null, right = null }) => set({ left, title, right }),
  clearHeader: () => set({ left: null, title: null, right: null }),
}));

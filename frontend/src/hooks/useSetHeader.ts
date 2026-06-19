import { useLayoutEffect, type ReactNode } from 'react';
import { useHeaderStore } from '../stores/headerStore';

// Call from any page component to populate the shared fixed header shell in Layout.
// useLayoutEffect (no deps) re-syncs on every render so dynamic content (e.g. async
// list names) updates immediately without the caller managing deps arrays.
export function useSetHeader(opts: { left?: ReactNode; title?: ReactNode; right?: ReactNode }) {
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  useLayoutEffect(() => {
    setHeader({ left: opts.left, title: opts.title, right: opts.right });
    return clearHeader;
  });
}

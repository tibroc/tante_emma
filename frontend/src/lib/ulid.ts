import { monotonicFactory } from 'ulid';

// Monotonic so offline events generated in the same millisecond stay ordered.
export const ulid = monotonicFactory();

// Client-side event timestamp (ms). Lives in this module so the impure Date.now()
// call stays outside component/hook scope, where the React Compiler purity rule
// (react-hooks/purity) forbids it.
export const nowMs = (): number => Date.now();

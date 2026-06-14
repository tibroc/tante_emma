import { monotonicFactory } from 'ulid';

// Monotonic so offline events generated in the same millisecond stay ordered.
export const ulid = monotonicFactory();

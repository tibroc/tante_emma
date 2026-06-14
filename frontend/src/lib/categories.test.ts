import { describe, it, expect } from 'vitest';
import { resolveCategoryIcon } from './categories';

describe('resolveCategoryIcon', () => {
  it('maps known emojis to the design icon set', () => {
    expect(resolveCategoryIcon('🥛')).toBe('dairy');
    expect(resolveCategoryIcon('🍞')).toBe('bread');
    expect(resolveCategoryIcon('🥩')).toBe('meat');
  });

  it('maps known icon-name strings (case-insensitively)', () => {
    expect(resolveCategoryIcon('produce')).toBe('produce');
    expect(resolveCategoryIcon('Beverages')).toBe('drinks');
  });

  it('falls back to pantry for unknown or missing values', () => {
    expect(resolveCategoryIcon('🛼')).toBe('pantry');
    expect(resolveCategoryIcon('')).toBe('pantry');
    expect(resolveCategoryIcon(undefined)).toBe('pantry');
    expect(resolveCategoryIcon(null)).toBe('pantry');
  });
});

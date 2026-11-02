import { afterEach, describe, expect, it, vi } from 'vitest';
import { localDateInput } from './dateFormatter';

describe('localDateInput', () => {
  afterEach(() => vi.useRealTimers());

  it('gives the date on the local clock, not the UTC date', () => {
    // 00:30 on 3 Nov in local time; in Nairobi the UTC date is still 2 Nov.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 3, 0, 30));
    expect(localDateInput()).toBe('2026-11-03');
  });

  it('formats a given value and leaves an empty one empty', () => {
    expect(localDateInput(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDateInput('')).toBe('');
  });
});

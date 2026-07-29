import assert from 'node:assert/strict';
import { test } from 'vitest';

import { currentProceeding } from './caseProceedingsUtils';

test('selects the earliest active proceeding and ignores completed events', () => {
  const result = currentProceeding([
    { id: 'completed', status: 'COMPLETED', starts_at: '2026-07-01T08:00:00Z' },
    { id: 'later', status: 'CONFIRMED', starts_at: '2026-08-10T08:00:00Z' },
    { id: 'next', status: 'SCHEDULED', starts_at: '2026-08-03T08:00:00Z' },
  ]);

  assert.equal(result.id, 'next');
});

test('returns null when no active proceeding exists', () => {
  assert.equal(
    currentProceeding([{ status: 'CONCLUDED', starts_at: '2026-07-01T08:00:00Z' }]),
    null,
  );
});

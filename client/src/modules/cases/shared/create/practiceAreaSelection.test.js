import { describe, expect, it } from 'vitest';

import { practiceAreaFromConflictCheck } from './practiceAreaSelection';

describe('practiceAreaFromConflictCheck', () => {
  it('inherits the practice area selected during jurisdiction review', () => {
    expect(practiceAreaFromConflictCheck({
      jurisdiction_facts: { practice_area: 'LAND_ENVIRONMENT' },
    })).toBe('LAND_ENVIRONMENT');
  });

  it('supports the display labels stored by earlier records', () => {
    expect(practiceAreaFromConflictCheck({
      jurisdiction_facts: { practice_area: 'Civil and Commercial Litigation' },
    })).toBe('CIVIL_COMMERCIAL_LITIGATION');
  });
});

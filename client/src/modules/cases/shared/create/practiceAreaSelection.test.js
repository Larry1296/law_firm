import { describe, expect, it } from 'vitest';

import { matterDefaultsFromConflictCheck, practiceAreaFromConflictCheck } from './practiceAreaSelection';

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

describe('matterDefaultsFromConflictCheck', () => {
  it('sets the category, court and station from the practice area and confirmed jurisdiction', () => {
    expect(matterDefaultsFromConflictCheck({
      jurisdiction_facts: { practice_area: 'EMPLOYMENT_LABOUR' },
      jurisdiction: { is_final: true, final_court_type: 'EMPLOYMENT_LABOUR', final_station: 'Nairobi' },
    })).toMatchObject({
      practice_area: 'EMPLOYMENT_LABOUR',
      case_type: 'EMPLOYMENT',
      court_type: 'EMPLOYMENT_LABOUR',
      court_division: 'ELRC',
      procedure_track: 'EMPLOYMENT_CLAIM',
      court_station: 'Nairobi',
    });
  });

  it('leaves the defaults alone when no practice area was chosen', () => {
    expect(matterDefaultsFromConflictCheck({ jurisdiction_facts: {} })).toEqual({});
  });
});

import { describe, expect, it } from 'vitest';

import { buildCaseCreatePayload } from './caseCreatePayload.js';

describe('buildCaseCreatePayload filed court case values', () => {
  it('keeps internal and official matter numbers separate and submits filed-case references', () => {
    const payload = buildCaseCreatePayload({
      client_id: 'client-1',
      conflict_check_id: 'conflict-1',
      case_number: 'MAT-2026-99999',
      entry_route: 'EXISTING_FILED_COURT_CASE',
      forum: 'COURT',
      title: 'Small claim',
      case_type: 'SMALL_CLAIM',
      procedure_track: 'SMALL_CLAIM',
      priority: 'MEDIUM',
      client_party_role: 'CLAIMANT',
      defendant: 'Apex Skyline Developers Limited',
      official_court_case_number: 'SCCCOMM E0001 of 2026',
      filing_date: '2026-07-24',
      filing_channel: 'ELECTRONIC',
      efiling_reference: 'EF-SCC-2026-0001',
      assessment_reference: 'ASM-1',
      court_fee_amount: '5000',
      payment_completed: true,
      payment_reference: 'PAY-SCC-2026-0001',
      payment_date: '2026-07-24',
      court_type: 'SMALL_CLAIMS',
      court_station: 'Milimani Small Claims Court',
      registry: 'Small Claims Court Registry',
    });

    expect(payload.case_number).toBeUndefined();
    expect(payload.court_proceeding.official_court_case_number).toBe('SCCCOMM E0001 of 2026');
    expect(payload.court_proceeding.payment_reference).toBe('PAY-SCC-2026-0001');
    expect(payload.court_proceeding.payment_date).toBe('2026-07-24');
    expect(payload.parties[0].role).toBe('RESPONDENT');
  });
});

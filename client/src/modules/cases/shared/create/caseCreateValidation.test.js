import { describe, expect, it } from 'vitest';

import { validateCaseCreateForm } from './caseCreateValidation.js';

const base = {
  client_id: 'client-1',
  conflict_check_id: 'conflict-1',
  entry_route: 'EXISTING_FILED_COURT_CASE',
  forum: 'COURT',
  title: 'Daniel Mutua Mwangi v Apex Skyline Developers Limited',
  case_type: 'SMALL_CLAIM',
  procedure_track: 'SMALL_CLAIM',
  practice_area: 'DEBT_RECOVERY',
  priority: 'MEDIUM',
  client_party_role: 'CLAIMANT',
  defendant: 'Apex Skyline Developers Limited',
  official_court_case_number: 'SCCCOMM E0001 of 2026',
  filing_date: '2026-07-24',
  filing_channel: 'ELECTRONIC',
  efiling_reference: 'EF-SCC-2026-0001',
  court_type: 'SMALL_CLAIMS',
  court_station: 'Milimani Small Claims Court',
  registry: 'Small Claims Court Registry',
  currency: 'KES',
};

describe('validateCaseCreateForm filed court case references', () => {
  it('requires payment date when a payment reference is entered', () => {
    const result = validateCaseCreateForm({ ...base, payment_reference: 'PAY-SCC-2026-0001' });

    expect(result.isValid).toBe(false);
    expect(result.errors.payment_date).toMatch(/Payment date is required/);
  });

  it('requires eFiling reference only for electronic filing', () => {
    const electronic = validateCaseCreateForm({ ...base, efiling_reference: '' });
    const physical = validateCaseCreateForm({ ...base, filing_channel: 'PHYSICAL', efiling_reference: '' });

    expect(electronic.errors.efiling_reference).toMatch(/submitted electronically/);
    expect(physical.errors.efiling_reference).toBeUndefined();
  });

  it('requires amount and currency when payment is marked completed', () => {
    const result = validateCaseCreateForm({ ...base, payment_completed: true, currency: '', payment_reference: 'PAY-1', payment_date: '2026-07-24' });

    expect(result.errors.court_fee_amount).toMatch(/Court fee amount is required/);
    expect(result.errors.currency).toMatch(/Currency is required/);
  });
});

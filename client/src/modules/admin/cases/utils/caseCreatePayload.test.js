import assert from 'node:assert/strict';

import {
  buildCaseCreatePayload,
  sanitizeCaseCreatePayload,
} from './caseCreatePayload.js';

const baseCase = {
  title: 'Musau Building Construction LTD v Metro Data Systems Limited',
  official_court_case_number: 'ELC E012 of 2026',
  filing_date: '2026-07-17',
  efiling_reference: 'EFILE-2026-00045871',
  payment_reference: 'KES-PAY-2026-781245',
  case_type: 'DEBT_RECOVERY',
  court_type: 'MAGISTRATE',
  client_id: 'client-1',
  cts_reference: '',
};

const assertNoCtsReference = (value) => {
  const payload = sanitizeCaseCreatePayload({
    ...baseCase,
    cts_reference: value,
  });

  assert.equal(
    Object.prototype.hasOwnProperty.call(payload, 'cts_reference'),
    false,
  );
};

assertNoCtsReference('');
assertNoCtsReference(null);
assertNoCtsReference(' TEST-CTS-001 ');

const original = {
  ...baseCase,
  cts_reference: 'TEST-CTS-001',
  jurisdiction_verified: true,
  jurisdiction_verified_by: 'user-1',
  jurisdiction_verified_at: '2026-07-17T09:00:00+03:00',
  case_number: 'ELC E012 of 2026',
};
const sanitized = sanitizeCaseCreatePayload(original);

assert.equal(original.cts_reference, 'TEST-CTS-001');
assert.equal(Object.prototype.hasOwnProperty.call(sanitized, 'cts_reference'), false);
assert.equal(Object.prototype.hasOwnProperty.call(sanitized, 'jurisdiction_verified'), false);
assert.equal(Object.prototype.hasOwnProperty.call(sanitized, 'jurisdiction_verified_by'), false);
assert.equal(Object.prototype.hasOwnProperty.call(sanitized, 'jurisdiction_verified_at'), false);
assert.equal(Object.prototype.hasOwnProperty.call(sanitized, 'case_number'), false);
assert.equal(sanitized.official_court_case_number, original.official_court_case_number);
assert.equal(sanitized.filing_date, original.filing_date);
assert.equal(sanitized.efiling_reference, original.efiling_reference);
assert.equal(sanitized.payment_reference, original.payment_reference);
assert.equal(sanitized.title, original.title);
assert.equal(sanitized.client_id, original.client_id);

const built = buildCaseCreatePayload(
  {
    title: original.title,
    official_court_case_number: original.official_court_case_number,
    filing_date: original.filing_date,
    efiling_reference: original.efiling_reference,
    payment_reference: original.payment_reference,
    cts_reference: 'SHOULD-NOT-SEND',
  },
  {
    client_id: 'client-2',
    plaintiff: 'Musau Building Construction LTD',
  },
);

assert.equal(Object.prototype.hasOwnProperty.call(built, 'cts_reference'), false);
assert.equal(built.official_court_case_number, 'ELC E012 of 2026');
assert.equal(built.filing_date, '2026-07-17');
assert.equal(built.efiling_reference, 'EFILE-2026-00045871');
assert.equal(built.payment_reference, 'KES-PAY-2026-781245');
assert.equal(built.client_id, 'client-2');
assert.equal(built.plaintiff, 'Musau Building Construction LTD');

import assert from 'node:assert/strict';

import {
  buildCaseCreatePayload,
  sanitizeCaseCreatePayload,
} from './caseCreatePayload.js';

const baseFiledCase = {
  entry_route: 'EXISTING_FILED_COURT_CASE',
  client_id: 'client-1',
  title: 'Musau Building Construction LTD v Metro Data Systems Limited',
  description: 'Land and commercial dispute registered from eFiling.',
  practice_area: 'LAND_ENVIRONMENT',
  matter_nature: 'CONTENTIOUS',
  forum: 'COURT',
  official_court_case_number: ' ELC   E012 of 2026 ',
  filing_date: '2026-07-17',
  efiling_reference: ' EFILE-2026-00045871 ',
  payment_reference: ' KES-PAY-2026-781245 ',
  case_type: 'LAND',
  court_type: 'ENVIRONMENT_LAND',
  procedure_track: 'ELC_SUIT',
  court_station: 'Nairobi',
  registry: 'Milimani Law Courts Registry',
  client_party_role: 'PLAINTIFF',
  defendant: 'Metro Data Systems Limited',
  claim_amount: '7500000.00',
  currency: 'kes',
  cts_reference: 'SHOULD-NOT-SEND',
  jurisdiction_verified: true,
  jurisdiction_verified_by: 'user-1',
  jurisdiction_verified_at: '2026-07-17T09:00:00+03:00',
  filed_by: 'user-1',
  status: 'WON',
  case_number: 'ELC E012 of 2026',
  internal_matter_number: 'MAT-2026-0001',
  created_by: 'user-1',
};

const assertAbsent = (payload, field) => {
  assert.equal(Object.prototype.hasOwnProperty.call(payload, field), false, `${field} should be absent`);
};

const filedPayload = buildCaseCreatePayload(baseFiledCase);

assert.equal(filedPayload.official_court_case_number, 'ELC E012 of 2026');
assert.equal(filedPayload.filing_date, '2026-07-17');
assert.equal(filedPayload.efiling_reference, 'EFILE-2026-00045871');
assert.equal(filedPayload.payment_reference, 'KES-PAY-2026-781245');
assert.equal(filedPayload.claim_amount, '7500000.00');
assert.equal(filedPayload.currency, 'KES');
assert.equal(filedPayload.title, baseFiledCase.title);
assert.equal(filedPayload.client_id, 'client-1');
assert.equal(filedPayload.defendant, 'Metro Data Systems Limited');

[
  'cts_reference',
  'jurisdiction_verified',
  'jurisdiction_verified_by',
  'jurisdiction_verified_at',
  'filed_by',
  'status',
  'case_number',
  'internal_matter_number',
  'created_by',
  'entry_route',
  'practice_area',
  'matter_nature',
  'forum',
].forEach((field) => assertAbsent(filedPayload, field));

const original = { ...baseFiledCase };
const sanitized = sanitizeCaseCreatePayload(original);
assert.equal(original.cts_reference, 'SHOULD-NOT-SEND');
assertAbsent(sanitized, 'cts_reference');
assert.equal(original.official_court_case_number, ' ELC   E012 of 2026 ');

['', null, ' TEST-CTS-001 '].forEach((value) => {
  const payload = buildCaseCreatePayload({ ...baseFiledCase, cts_reference: value });
  assertAbsent(payload, 'cts_reference');
});

const newInstructionPayload = buildCaseCreatePayload({
  ...baseFiledCase,
  entry_route: 'NEW_INSTRUCTION',
  official_court_case_number: 'SHOULD-NOT-SEND',
  filing_date: '2026-07-17',
  efiling_reference: 'SHOULD-NOT-SEND',
  payment_reference: 'SHOULD-NOT-SEND',
});

assertAbsent(newInstructionPayload, 'official_court_case_number');
assertAbsent(newInstructionPayload, 'filing_date');
assertAbsent(newInstructionPayload, 'efiling_reference');
assertAbsent(newInstructionPayload, 'payment_reference');

const zeroPayload = buildCaseCreatePayload({
  ...baseFiledCase,
  claim_amount: 0,
  court_fee_amount: 0,
});

assert.equal(zeroPayload.claim_amount, 0);
assert.equal(zeroPayload.court_fee_amount, 0);

const assessedPayload = buildCaseCreatePayload({
  ...baseFiledCase,
  monetary_relief_type: 'TO_BE_ASSESSED',
  claim_amount: '999999',
});
assertAbsent(assessedPayload, 'claim_amount');

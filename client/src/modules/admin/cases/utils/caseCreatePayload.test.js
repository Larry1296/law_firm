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
  procedure_track: 'CIVIL_SUIT',
  procedure_type: 'CIVIL_SUIT',
  court_station: 'Nairobi',
  registry: 'Milimani Law Courts Registry',
  client_party_role: 'PLAINTIFF',
  defendant: 'Metro Data Systems Limited',
  monetary_relief_type: 'QUANTIFIED',
  claim_amount: '7500000.00',
  currency: 'kes',
  property_description: 'Commercial development parcel',
  title_number: 'NAIROBI/BLOCK/1',
  property_value: '9000000.00',
  parties: [
    {
      party_type: 'COMPANY',
      role: 'DEFENDANT',
      organization_name: 'Metro Data Systems Limited',
      is_adverse: true,
    },
  ],
  conflict_record_status: 'REQUIRES_VERIFICATION',
  conflict_reason: 'Historical conflict position requires verification.',
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

assert.equal(filedPayload.entry_route, 'EXISTING_FILED_COURT_CASE');
assert.equal(filedPayload.practice_area, 'LAND_ENVIRONMENT');
assert.equal(filedPayload.matter_nature, 'CONTENTIOUS');
assert.equal(filedPayload.forum, 'COURT');
assert.equal(filedPayload.court_proceeding.official_court_case_number, 'ELC E012 of 2026');
assert.equal(filedPayload.court_proceeding.filing_date, '2026-07-17');
assert.equal(filedPayload.court_proceeding.efiling_reference, 'EFILE-2026-00045871');
assert.equal(filedPayload.court_proceeding.payment_reference, 'KES-PAY-2026-781245');
assert.equal(filedPayload.monetary_relief.relief_type, 'QUANTIFIED');
assert.equal(filedPayload.monetary_relief.principal_amount, '7500000.00');
assert.equal(filedPayload.monetary_relief.currency, 'KES');
assert.equal(filedPayload.land_details.title_number, 'NAIROBI/BLOCK/1');
assert.equal(filedPayload.land_details.estimated_property_value, '9000000.00');
assert.equal(filedPayload.parties.length, 1);
assert.equal(filedPayload.conflict_record.status, 'REQUIRES_VERIFICATION');
assert.equal(filedPayload.title, baseFiledCase.title);
assert.equal(filedPayload.client_id, 'client-1');

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
].forEach((field) => assertAbsent(filedPayload, field));
assertAbsent(filedPayload.court_proceeding, 'cts_reference');

const original = { ...baseFiledCase };
const sanitized = sanitizeCaseCreatePayload(original);
assert.equal(original.cts_reference, 'SHOULD-NOT-SEND');
assertAbsent(sanitized, 'cts_reference');
assert.equal(original.official_court_case_number, ' ELC   E012 of 2026 ');

['', null, ' TEST-CTS-001 '].forEach((value) => {
  const payload = buildCaseCreatePayload({ ...baseFiledCase, cts_reference: value });
  assertAbsent(payload, 'cts_reference');
  assertAbsent(payload.court_proceeding, 'cts_reference');
});

const newInstructionPayload = buildCaseCreatePayload({
  ...baseFiledCase,
  entry_route: 'NEW_INSTRUCTION',
  official_court_case_number: 'SHOULD-NOT-SEND',
  filing_date: '2026-07-17',
  efiling_reference: 'SHOULD-NOT-SEND',
  payment_reference: 'SHOULD-NOT-SEND',
});

assert.equal(newInstructionPayload.entry_route, 'NEW_INSTRUCTION');
assertAbsent(newInstructionPayload.court_proceeding, 'official_court_case_number');
assertAbsent(newInstructionPayload.court_proceeding, 'filing_date');
assertAbsent(newInstructionPayload.court_proceeding, 'efiling_reference');
assertAbsent(newInstructionPayload.court_proceeding, 'payment_reference');

const zeroPayload = buildCaseCreatePayload({
  ...baseFiledCase,
  claim_amount: 0,
  court_fee_amount: 0,
});

assert.equal(zeroPayload.monetary_relief.principal_amount, 0);
assertAbsent(zeroPayload.court_proceeding, 'court_fee_amount');

const assessedPayload = buildCaseCreatePayload({
  ...baseFiledCase,
  monetary_relief_type: 'TO_BE_ASSESSED',
  claim_amount: '999999',
  amount_to_be_assessed: true,
});
assert.equal(assessedPayload.monetary_relief.principal_amount, '999999');
assert.equal(assessedPayload.monetary_relief.amount_to_be_assessed, true);

const tribunalPayload = buildCaseCreatePayload({
  ...baseFiledCase,
  entry_route: 'EXISTING_TRIBUNAL_MATTER',
  forum: 'TRIBUNAL',
  tribunal_name: 'Business Premises Rent Tribunal',
  tribunal_reference: 'BPRT-001',
  registry_or_location: 'Nairobi',
});
assert.equal(tribunalPayload.tribunal_proceeding.tribunal_name, 'Business Premises Rent Tribunal');
assertAbsent(tribunalPayload, 'court_proceeding');

const arbitrationPayload = buildCaseCreatePayload({
  ...baseFiledCase,
  entry_route: 'EXISTING_ARBITRATION',
  forum: 'ARBITRATION',
  arbitration_reference: 'ARB-001',
  arbitration_institution: 'NCIA',
  arbitration_seat: 'Nairobi',
});
assert.equal(arbitrationPayload.arbitration_proceeding.institution, 'NCIA');
assertAbsent(arbitrationPayload, 'court_proceeding');

const advisoryPayload = buildCaseCreatePayload({
  ...baseFiledCase,
  entry_route: 'NON_CONTENTIOUS_MATTER',
  forum: 'NO_FORMAL_FORUM',
  instruction_type: 'Contract Review',
  deliverable: 'Reviewed contract',
  target_completion_date: '2026-07-30',
});
assert.equal(advisoryPayload.non_contentious_details.instruction_type, 'Contract Review');
assertAbsent(advisoryPayload, 'court_proceeding');

import assert from 'node:assert/strict';

import { buildCaseCreatePayload } from './caseCreatePayload.js';

const filedMatter = {
  client_id: 'client-1',
  entry_route: 'EXISTING_FILED_COURT_CASE',
  title: 'Musau Building Construction LTD v Metro Data Systems Limited',
  description: 'Existing ELC matter registered for firm management.',
  practice_area: 'LAND_ENVIRONMENT',
  matter_nature: 'CONTENTIOUS',
  forum: 'COURT',
  case_type: 'LAND',
  procedure_track: 'ELC_SUIT',
  priority: 'MEDIUM',
  client_party_role: 'PLAINTIFF',
  official_court_case_number: ' ELC E012 of 2026 ',
  filing_date: '2026-07-17',
  efiling_reference: 'EFILE-2026-00045871',
  payment_reference: 'KES-PAY-2026-781245',
  court_type: 'ENVIRONMENT_LAND',
  court_level: 'SUPERIOR_COURT',
  court_name: 'Environment and Land Court',
  court_station: 'Nairobi',
  registry: 'Milimani Law Courts Registry',
  claim_amount: '7500000.00',
  monetary_relief_type: 'QUANTIFIED',
  currency: 'kes',
  defendant: 'Metro Data Systems Limited',
  assigned_lawyer_membership_id: 'lawyer-1',
  assigned_secretary_membership_id: 'secretary-1',
  cts_reference: 'CTS-SHOULD-NOT-SUBMIT',
  matter_status: 'ACTIVE',
  court_stage: 'FILED',
  created_by: 'user-1',
};

const original = structuredClone(filedMatter);
const adminPayload = buildCaseCreatePayload(filedMatter);
const lawyerPayload = buildCaseCreatePayload(filedMatter);

assert.deepEqual(filedMatter, original, 'payload builder must not mutate form state');
assert.deepEqual(lawyerPayload, adminPayload, 'admin and lawyer forms must use the same payload contract');
assert.equal(adminPayload.court_proceeding.official_court_case_number, 'ELC E012 of 2026');
assert.equal(adminPayload.court_proceeding.filing_date, '2026-07-17');
assert.equal(adminPayload.court_proceeding.efiling_reference, 'EFILE-2026-00045871');
assert.equal(adminPayload.court_proceeding.payment_reference, 'KES-PAY-2026-781245');
assert.equal(adminPayload.monetary_relief.principal_amount, '7500000.00');
assert.equal(adminPayload.monetary_relief.currency, 'KES');
assert.equal(Object.prototype.hasOwnProperty.call(adminPayload, 'cts_reference'), false);
assert.equal(Object.prototype.hasOwnProperty.call(adminPayload.court_proceeding, 'cts_reference'), false);
assert.equal(Object.prototype.hasOwnProperty.call(adminPayload, 'matter_status'), false);
assert.equal(Object.prototype.hasOwnProperty.call(adminPayload, 'court_stage'), false);
assert.equal(Object.prototype.hasOwnProperty.call(adminPayload, 'created_by'), false);

const newInstruction = buildCaseCreatePayload({
  ...filedMatter,
  entry_route: 'NEW_INSTRUCTION',
  official_court_case_number: 'ELC E012 of 2026',
  filing_date: '2026-07-17',
  efiling_reference: 'EFILE-2026-00045871',
  payment_reference: 'KES-PAY-2026-781245',
});

assert.equal(Object.prototype.hasOwnProperty.call(newInstruction.court_proceeding || {}, 'official_court_case_number'), false);
assert.equal(Object.prototype.hasOwnProperty.call(newInstruction.court_proceeding || {}, 'filing_date'), false);
assert.equal(Object.prototype.hasOwnProperty.call(newInstruction.court_proceeding || {}, 'efiling_reference'), false);
assert.equal(Object.prototype.hasOwnProperty.call(newInstruction.court_proceeding || {}, 'payment_reference'), false);

import assert from 'node:assert/strict';

import { validateCaseCreateForm } from './caseCreateValidation.js';

const filedCase = {
  entry_route: 'EXISTING_FILED_COURT_CASE',
  client_id: 'client-1',
  title: 'Musau Building Construction LTD v Metro Data Systems Limited',
  case_type: 'LAND',
  priority: 'MEDIUM',
  client_party_role: 'PLAINTIFF',
  matter_nature: 'CONTENTIOUS',
  forum: 'COURT',
  official_court_case_number: 'ELC E012 of 2026',
  filing_date: '2026-07-17',
  efiling_reference: 'EFILE-2026-00045871',
  court_type: 'ENVIRONMENT_LAND',
  court_station: 'Nairobi',
  defendant: 'Metro Data Systems Limited',
  monetary_relief_type: 'QUANTIFIED',
  claim_amount: '7500000.00',
  conflict_record_status: 'REQUIRES_VERIFICATION',
};

const validFiled = validateCaseCreateForm(filedCase, { client_id: 'client-1' });
assert.equal(validFiled.isValid, true);
assert.equal(validFiled.warnings.length, 1);

const missingOfficial = validateCaseCreateForm(
  { ...filedCase, official_court_case_number: '' },
  { client_id: 'client-1' },
);
assert.equal(missingOfficial.isValid, false);
assert.equal(Object.prototype.hasOwnProperty.call(missingOfficial.errors, 'official_court_case_number'), true);

const missingEfiling = validateCaseCreateForm(
  { ...filedCase, efiling_reference: '' },
  { client_id: 'client-1' },
);
assert.equal(Object.prototype.hasOwnProperty.call(missingEfiling.errors, 'efiling_reference'), true);

const newInstruction = validateCaseCreateForm(
  {
    ...filedCase,
    entry_route: 'NEW_INSTRUCTION',
    official_court_case_number: '',
    filing_date: '',
    efiling_reference: '',
    defendant: '',
  },
  { client_id: 'client-1' },
);
assert.equal(newInstruction.isValid, false);
assert.equal(Object.prototype.hasOwnProperty.call(newInstruction.errors, 'entry_route'), true);
assert.equal(Object.prototype.hasOwnProperty.call(newInstruction.errors, 'official_court_case_number'), false);

const tribunal = validateCaseCreateForm(
  { ...filedCase, entry_route: 'EXISTING_TRIBUNAL_MATTER', forum: 'TRIBUNAL', tribunal_name: '' },
  { client_id: 'client-1' },
);
assert.equal(Object.prototype.hasOwnProperty.call(tribunal.errors, 'entry_route'), true);
assert.equal(Object.prototype.hasOwnProperty.call(tribunal.errors, 'tribunal_name'), true);

const badDate = validateCaseCreateForm(
  { ...filedCase, next_court_date: '2026-07-01T09:00' },
  { client_id: 'client-1' },
);
assert.equal(Object.prototype.hasOwnProperty.call(badDate.errors, 'next_court_date'), true);

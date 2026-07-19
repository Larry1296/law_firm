import assert from 'node:assert/strict';

import {
  buildIndividualClientPayload,
  validateIndividualClientForm,
} from './individualClientPayload.js';

const baseIndividual = {
  full_name: ' Peter Mwangi Kamau ',
  first_name: ' Peter ',
  middle_name: ' Mwangi ',
  last_name: ' Kamau ',
  preferred_name: ' Peter ',
  email: ' PETER.MWANGI.UI@EXAMPLE.COM ',
  phone_number: ' +254712345678 ',
  national_id: ' 12345678 ',
  passport_number: '',
  kra_pin: ' a012345678b ',
  date_of_birth: '1988-06-17',
  gender: 'MALE',
  marital_status: 'MARRIED',
  occupation: ' Civil Engineer ',
  employer: ' Metro Engineering Limited ',
  nationality: ' Kenyan ',
  citizenship: ' Kenya ',
  preferred_language: 'English',
  preferred_contact_channel: 'EMAIL',
  country: 'Kenya',
  county: 'Nairobi',
  city: 'Nairobi',
  street: 'South B',
  postal_code: '00100',
  full_address: 'South B, Nairobi',
  next_of_kin_name: 'Mary Wanjiku Kamau',
  next_of_kin_relationship: 'Spouse',
  next_of_kin_phone: '+254723456789',
  next_of_kin_email: ' MARY.WANJIKU@EXAMPLE.COM ',
};

const original = structuredClone(baseIndividual);
const portalPayload = buildIndividualClientPayload(baseIndividual, 'portal');

assert.deepEqual(baseIndividual, original, 'individual payload builder must not mutate form state');
assert.equal(portalPayload.access_type, 'PROSPECT');
assert.equal(portalPayload.full_name, 'Peter Mwangi Kamau');
assert.equal(portalPayload.email, 'peter.mwangi.ui@example.com');
assert.equal(portalPayload.next_of_kin_email, 'mary.wanjiku@example.com');
assert.equal(portalPayload.national_id, '12345678');
assert.equal(portalPayload.kra_pin, 'A012345678B');
assert.equal(portalPayload.phone_number, '+254712345678');
assert.equal(portalPayload.next_of_kin_phone, '+254723456789');
assert.equal(Object.prototype.hasOwnProperty.call(portalPayload, 'contact_email'), false);

const assistedPayload = buildIndividualClientPayload(
  {
    ...baseIndividual,
    email: '',
    phone_number: '+254733456789',
  },
  'assisted',
);

assert.equal(assistedPayload.access_type, 'ASSISTED_CLIENT');
assert.equal(Object.prototype.hasOwnProperty.call(assistedPayload, 'email'), false);
assert.equal(assistedPayload.phone_number, '+254733456789');

const assistedWithNextOfKinOnly = buildIndividualClientPayload(
  {
    ...baseIndividual,
    email: '',
    next_of_kin_email: 'guardian@example.com',
  },
  'assisted',
);

assert.equal(
  Object.prototype.hasOwnProperty.call(assistedWithNextOfKinOnly, 'email'),
  false,
  'next-of-kin email must not become the client login email',
);
assert.equal(assistedWithNextOfKinOnly.next_of_kin_email, 'guardian@example.com');

const portalValidation = validateIndividualClientForm(baseIndividual, 'portal');
assert.equal(portalValidation.isValid, true);

const missingPortalEmail = validateIndividualClientForm(
  { ...baseIndividual, email: '' },
  'portal',
);
assert.equal(missingPortalEmail.isValid, false);
assert.equal(
  missingPortalEmail.errors.email,
  'Portal individual clients require a login email address.',
);

const assistedWithoutEmail = validateIndividualClientForm(
  { ...baseIndividual, email: '' },
  'assisted',
);
assert.equal(assistedWithoutEmail.isValid, true);

const futureDob = validateIndividualClientForm(
  { ...baseIndividual, date_of_birth: '2999-01-01' },
  'portal',
);
assert.equal(futureDob.isValid, false);
assert.equal(futureDob.errors.date_of_birth, 'Date of birth cannot be in the future.');

const noIdentity = validateIndividualClientForm(
  { ...baseIndividual, national_id: '', passport_number: '' },
  'portal',
);
assert.equal(noIdentity.isValid, false);
assert.equal(noIdentity.errors.identification, 'Record either a National ID or passport number.');

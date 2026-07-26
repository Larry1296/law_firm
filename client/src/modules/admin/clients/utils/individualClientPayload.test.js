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
  identification_type: 'NATIONAL_ID',
  identification_number: ' 12345678 ',
  identification_country: ' Kenya ',
  identification_expiry_date: '',
  identification_document_reference: ' ID copy file 12 ',
  national_id: ' 12345678 ',
  passport_number: '',
  kra_pin: ' a012345678b ',
  date_of_birth: '1988-06-17',
  gender: 'MALE',
  marital_status: 'MARRIED',
  occupation_status: 'EMPLOYED',
  occupation: ' Civil Engineer ',
  employer: ' Metro Engineering Limited ',
  business_name: '',
  nationality: ' Kenyan ',
  citizenship: ' Kenya ',
  preferred_language: 'English',
  preferred_contact_channel: 'EMAIL',
  country: 'Kenya',
  county_or_region: 'Nairobi',
  city_or_town: 'Nairobi',
  street_or_locality: 'South B',
  postal_code: '00100',
  address_description: 'South B, Nairobi',
  next_of_kin_name: 'Mary Wanjiku Kamau',
  next_of_kin_relationship: 'Spouse',
  next_of_kin_phone: '+254723456789',
  next_of_kin_email: ' MARY.WANJIKU@EXAMPLE.COM ',
  next_of_kin_identification_number: ' 23456789 ',
  next_of_kin_address: 'Langata, Nairobi',
  guardian_name: '',
  guardian_relationship: '',
  guardian_phone: '',
  guardian_email: '',
  privacy_notice_version: ' 2026-07 ',
  personal_data_source: 'CLIENT',
};

const original = structuredClone(baseIndividual);
const portalPayload = buildIndividualClientPayload(baseIndividual, 'portal');

assert.deepEqual(baseIndividual, original, 'individual payload builder must not mutate form state');
assert.equal(portalPayload.access_type, 'PORTAL_ENABLED');
assert.equal(portalPayload.full_name, 'Peter Mwangi Kamau');
assert.equal(Object.prototype.hasOwnProperty.call(portalPayload, 'first_name'), false);
assert.equal(Object.prototype.hasOwnProperty.call(portalPayload, 'middle_name'), false);
assert.equal(Object.prototype.hasOwnProperty.call(portalPayload, 'last_name'), false);
assert.equal(portalPayload.email, 'peter.mwangi.ui@example.com');
assert.equal(portalPayload.next_of_kin_email, 'mary.wanjiku@example.com');
assert.equal(portalPayload.identification_type, 'NATIONAL_ID');
assert.equal(portalPayload.identification_number, '12345678');
assert.equal(portalPayload.identification_country, 'Kenya');
assert.equal(portalPayload.identification_document_reference, 'ID copy file 12');
assert.equal(portalPayload.national_id, '12345678');
assert.equal(portalPayload.kra_pin, 'A012345678B');
assert.equal(portalPayload.phone_number, '+254712345678');
assert.equal(portalPayload.next_of_kin_phone, '+254723456789');
assert.equal(portalPayload.next_of_kin_identification_number, '23456789');
assert.equal(portalPayload.address_description, 'South B, Nairobi');
assert.equal(portalPayload.privacy_notice_version, '2026-07');
assert.equal(Object.prototype.hasOwnProperty.call(portalPayload, 'contact_email'), false);

const assistedPayload = buildIndividualClientPayload(
  {
    ...baseIndividual,
    email: '',
    phone_number: '+254733456789',
  },
  'assisted',
);

assert.equal(assistedPayload.access_type, 'ASSISTED');
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
  { ...baseIndividual, email: '', preferred_contact_channel: 'PHONE' },
  'assisted',
);
assert.equal(assistedWithoutEmail.isValid, true);

const assistedWithoutAnyContact = validateIndividualClientForm(
  { ...baseIndividual, email: '', phone_number: '', preferred_contact_channel: 'PHONE' },
  'assisted',
);
assert.equal(assistedWithoutAnyContact.isValid, false);
assert.equal(
  assistedWithoutAnyContact.errors.contact_method,
  'At least one reliable contact method is required.',
);

const futureDob = validateIndividualClientForm(
  { ...baseIndividual, date_of_birth: '2999-01-01' },
  'portal',
);
assert.equal(futureDob.isValid, false);
assert.equal(futureDob.errors.date_of_birth, 'Date of birth must be in the past.');

const noIdentity = validateIndividualClientForm(
  { ...baseIndividual, identification_number: '', national_id: '', passport_number: '' },
  'portal',
);
assert.equal(noIdentity.isValid, false);
assert.equal(noIdentity.errors.identification_number, 'Identification number is required.');

const missingRequiredPortalFields = validateIndividualClientForm(
  {
    ...baseIndividual,
    full_name: '',
    date_of_birth: '',
    nationality: '',
    occupation_status: '',
    preferred_contact_channel: '',
    country: '',
    city_or_town: '',
    street_or_locality: '',
    address_description: '',
    privacy_notice_version: '',
    personal_data_source: '',
  },
  'portal',
);
assert.equal(missingRequiredPortalFields.isValid, false);
assert.equal(missingRequiredPortalFields.errors.full_name, 'Full legal name is required.');
assert.equal(missingRequiredPortalFields.errors.date_of_birth, 'Date of birth is required.');
assert.equal(missingRequiredPortalFields.errors.nationality, 'Nationality is required.');
assert.equal(missingRequiredPortalFields.errors.occupation_status, 'Occupation status is required.');
assert.equal(missingRequiredPortalFields.errors.preferred_contact_channel, 'Preferred contact channel is required.');
assert.equal(missingRequiredPortalFields.errors.country, 'Residential country is required.');
assert.equal(missingRequiredPortalFields.errors.city_or_town, 'Residential city, town or locality is required.');
assert.equal(missingRequiredPortalFields.errors.address_description, 'Residential address description is required.');
assert.equal(missingRequiredPortalFields.errors.privacy_notice_version, 'Privacy notice version is required.');
assert.equal(missingRequiredPortalFields.errors.personal_data_source, 'Personal data source is required.');

const passportPayload = buildIndividualClientPayload(
  {
    ...baseIndividual,
    identification_type: 'PASSPORT',
    identification_number: ' ab123456 ',
    identification_country: 'Uganda',
    identification_expiry_date: '2999-01-01',
    national_id: '',
    passport_number: '',
  },
  'portal',
);

assert.equal(passportPayload.identification_type, 'PASSPORT');
assert.equal(passportPayload.identification_number, 'AB123456');
assert.equal(passportPayload.passport_number, 'AB123456');
assert.equal(Object.prototype.hasOwnProperty.call(passportPayload, 'national_id'), false);

const passportWithoutExpiry = validateIndividualClientForm(
  {
    ...baseIndividual,
    identification_type: 'PASSPORT',
    identification_number: 'AB123456',
    identification_country: 'Uganda',
    identification_expiry_date: '',
  },
  'portal',
);
assert.equal(passportWithoutExpiry.isValid, false);
assert.equal(passportWithoutExpiry.errors.identification_expiry_date, 'Passport expiry date is required.');

const passportWithPastExpiry = validateIndividualClientForm(
  {
    ...baseIndividual,
    identification_type: 'PASSPORT',
    identification_number: 'AB123456',
    identification_country: 'Uganda',
    identification_expiry_date: '2000-01-01',
  },
  'portal',
);
assert.equal(passportWithPastExpiry.isValid, false);
assert.equal(passportWithPastExpiry.errors.identification_expiry_date, 'Passport expiry date must be in the future.');

const minorWithoutGuardian = validateIndividualClientForm(
  {
    ...baseIndividual,
    date_of_birth: '2012-01-01',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
  },
  'portal',
);
assert.equal(minorWithoutGuardian.isValid, false);
assert.equal(
  minorWithoutGuardian.errors.guardian_name,
  'Guardian or legal representative name is required for minor clients.',
);
assert.equal(
  minorWithoutGuardian.errors.guardian_contact,
  'Guardian phone or guardian email is required for minor clients.',
);

const minorWithGuardian = validateIndividualClientForm(
  {
    ...baseIndividual,
    date_of_birth: '2012-01-01',
    guardian_name: 'Grace Mwangi',
    guardian_phone: '+254722000111',
    guardian_email: '',
  },
  'assisted',
);
assert.equal(minorWithGuardian.isValid, true);

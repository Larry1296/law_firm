import assert from 'node:assert/strict';

import {
  buildLegalEntityClientPayload,
  canonicalLegalEntityTypes,
} from './legalEntityClientPayload.js';

const baseEntity = {
  legal_name: ' Nairobi Public Benefit Initiative ',
  registration_number: ' pbo-2026-001 ',
  kra_pin: ' p051234567x ',
  email: ' PBO.CONTACT@EXAMPLE.COM ',
  phone_number: ' +254700000001 ',
  country: 'Kenya',
  county: 'Nairobi',
  city: 'Nairobi',
  street: 'Milimani',
  full_address: ' Milimani, Nairobi ',
  contact_full_name: ' Mercy Wanjiku Njeri ',
  contact_role_or_designation: ' Executive Director ',
  contact_email: ' MERCY.WANJIKU@EXAMPLE.COM ',
  contact_phone_number: ' +254700000002 ',
  nonprofit_form: 'PUBLIC_BENEFIT_ORGANIZATION',
  objectives: 'Access to justice and legal awareness.',
};

assert.equal(canonicalLegalEntityTypes.includes('PUBLIC_ENTITY'), true);
assert.equal(canonicalLegalEntityTypes.includes('REPRESENTATIVE'), false);
assert.equal(canonicalLegalEntityTypes.includes('SACCO'), false);

const original = structuredClone(baseEntity);
const nonprofitPayload = buildLegalEntityClientPayload(baseEntity, {
  clientType: 'NON_PROFIT_ORGANIZATION',
  accessType: 'PROSPECT',
});

assert.deepEqual(baseEntity, original, 'legal entity payload builder must not mutate form state');
assert.equal(nonprofitPayload.client_type, 'NON_PROFIT_ORGANIZATION');
assert.equal(nonprofitPayload.legal_name, 'Nairobi Public Benefit Initiative');
assert.equal(nonprofitPayload.registration_number, 'PBO-2026-001');
assert.equal(nonprofitPayload.kra_pin, 'P051234567X');
assert.equal(nonprofitPayload.email, 'pbo.contact@example.com');
assert.equal(nonprofitPayload.access_type, 'PROSPECT');
assert.equal(nonprofitPayload.representatives.length, 1);
assert.equal(nonprofitPayload.representatives[0].full_legal_name, 'Mercy Wanjiku Njeri');
assert.equal(nonprofitPayload.representatives[0].is_portal_contact, true);
assert.equal(Object.prototype.hasOwnProperty.call(nonprofitPayload, 'company_type'), false);

const assistedEntity = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    email: '',
    contact_email: 'secretary@example.com',
  },
  {
    clientType: 'SOCIETY_OR_ASSOCIATION',
    accessType: 'ASSISTED_CLIENT',
  },
);

assert.equal(assistedEntity.access_type, 'ASSISTED_CLIENT');
assert.equal(Object.prototype.hasOwnProperty.call(assistedEntity, 'email'), false);
assert.equal(assistedEntity.representatives[0].email, 'secretary@example.com');

const saccoPayload = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    registered_name: ' Nairobi Members SACCO ',
    cooperative_subtype: 'PRIMARY_COOPERATIVE',
  },
  {
    clientType: 'COOPERATIVE',
    requestedClientType: 'SACCO',
    accessType: 'PROSPECT',
  },
);

assert.equal(saccoPayload.client_type, 'COOPERATIVE');
assert.equal(saccoPayload.registered_name, 'Nairobi Members SACCO');
assert.equal(saccoPayload.cooperative_subtype, 'SACCO');

const partnershipPayload = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    partnership_name: ' Nairobi Works Partnership ',
    partner_one_name: ' Peter Ben ',
    partner_two_name: ' Mercy Wanjiku ',
  },
  {
    clientType: 'PARTNERSHIP',
    accessType: 'ASSISTED_CLIENT',
  },
);

assert.equal(partnershipPayload.partnership_name, 'Nairobi Works Partnership');
assert.equal(partnershipPayload.partners.length, 2);
assert.equal(partnershipPayload.partners[0].legal_name, 'Peter Ben');

const estatePayload = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    estate_name: ' Estate of John Kamau ',
    deceased_full_name: ' John Kamau ',
    grant_type: 'LETTERS_OF_ADMINISTRATION',
    personal_representative_name: ' Mary Wanjiku Kamau ',
  },
  {
    clientType: 'ESTATE',
    accessType: 'ASSISTED_CLIENT',
  },
);

assert.equal(estatePayload.personal_representatives.length, 1);
assert.equal(
  estatePayload.personal_representatives[0].full_legal_name,
  'Mary Wanjiku Kamau',
);

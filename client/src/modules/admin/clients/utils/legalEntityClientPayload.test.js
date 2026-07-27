import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  buildLegalEntityClientPayload,
  canonicalLegalEntityTypes,
} from './legalEntityClientPayload.js';

test('builds canonical legal entity client payloads', () => {
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
  accessType: 'PORTAL_ENABLED',
});

assert.deepEqual(baseEntity, original, 'legal entity payload builder must not mutate form state');
assert.equal(nonprofitPayload.client_type, 'NON_PROFIT_ORGANIZATION');
assert.equal(nonprofitPayload.legal_name, 'Nairobi Public Benefit Initiative');
assert.equal(nonprofitPayload.registration_number, 'PBO-2026-001');
assert.equal(nonprofitPayload.kra_pin, 'P051234567X');
assert.equal(nonprofitPayload.email, 'pbo.contact@example.com');
assert.equal(nonprofitPayload.access_type, 'PORTAL_ENABLED');
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
    accessType: 'ASSISTED',
  },
);

assert.equal(assistedEntity.access_type, 'ASSISTED');
assert.equal(Object.prototype.hasOwnProperty.call(assistedEntity, 'email'), false);
assert.equal(
  Object.prototype.hasOwnProperty.call(assistedEntity, 'contact_email'),
  false,
);
assert.equal(
  Object.prototype.hasOwnProperty.call(assistedEntity.representatives[0], 'email'),
  false,
);

const portalSoleProprietorship = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    email: 'proprietor@example.com',
    phone_number: '+254700000010',
    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    registered_business_name: 'Wanjiku Hardware',
    proprietor_name: 'Mercy Wanjiku Njeri',
    proprietor_identifier: '24567891',
    proprietor_kra_pin: 'a001234567b',
  },
  {
    clientType: 'SOLE_PROPRIETORSHIP',
    accessType: 'PORTAL_ENABLED',
  },
);

assert.equal(portalSoleProprietorship.access_type, 'PORTAL_ENABLED');
assert.equal(portalSoleProprietorship.phone_number, '+254700000010');
assert.equal(portalSoleProprietorship.contact_full_name, 'Mercy Wanjiku Njeri');
assert.equal(portalSoleProprietorship.contact_national_id_number, '24567891');
assert.equal(portalSoleProprietorship.representatives.length, 1);
assert.equal(
  portalSoleProprietorship.representatives[0].representative_category,
  'PROPRIETOR',
);
assert.equal(portalSoleProprietorship.representatives[0].is_portal_contact, true);
assert.equal(
  portalSoleProprietorship.representatives[0].email,
  'proprietor@example.com',
);

const assistedSoleProprietorship = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    email: '',
    phone_number: '',
    contact_phone_number: '+254700000011',
    registered_business_name: 'Wanjiku Hardware',
    proprietor_name: 'Mercy Wanjiku Njeri',
    proprietor_identifier: '24567891',
  },
  {
    clientType: 'SOLE_PROPRIETORSHIP',
    accessType: 'ASSISTED',
  },
);

assert.equal(assistedSoleProprietorship.access_type, 'ASSISTED');
assert.equal(assistedSoleProprietorship.phone_number, '+254700000011');
assert.equal(
  Object.prototype.hasOwnProperty.call(assistedSoleProprietorship, 'email'),
  false,
);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    assistedSoleProprietorship.representatives[0],
    'email',
  ),
  false,
);

const saccoPayload = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    registered_name: ' Nairobi Members SACCO ',
    cooperative_subtype: 'PRIMARY_COOPERATIVE',
  },
  {
    clientType: 'COOPERATIVE',
    requestedClientType: 'SACCO',
    accessType: 'PORTAL_ENABLED',
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
    partner_one_identifier: ' PARTNER-ID-001 ',
    partner_two_name: ' Mercy Wanjiku ',
    partner_two_identifier: ' PARTNER-ID-002 ',
  },
  {
    clientType: 'PARTNERSHIP',
    accessType: 'ASSISTED',
  },
);

assert.equal(partnershipPayload.partnership_name, 'Nairobi Works Partnership');
assert.equal(partnershipPayload.partners.length, 2);
assert.equal(partnershipPayload.partners[0].legal_name, 'Peter Ben');
assert.equal(partnershipPayload.partners[0].identifier, 'PARTNER-ID-001');

const portalPartnership = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    email: 'partner.portal@example.com',
    phone_number: '+254700000020',
    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    partnership_name: 'Nairobi Works Partnership',
    partner_one_name: 'Peter Ben',
    partner_one_identifier: 'PARTNER-ID-001',
    partner_two_name: 'Mercy Wanjiku',
    partner_two_identifier: 'PARTNER-ID-002',
  },
  {
    clientType: 'PARTNERSHIP',
    accessType: 'PORTAL_ENABLED',
  },
);

assert.equal(portalPartnership.access_type, 'PORTAL_ENABLED');
assert.equal(portalPartnership.contact_full_name, 'Peter Ben');
assert.equal(portalPartnership.contact_national_id_number, 'PARTNER-ID-001');
assert.equal(
  portalPartnership.representatives[0].representative_category,
  'PARTNER',
);
assert.equal(portalPartnership.representatives[0].is_portal_contact, true);
assert.equal(
  portalPartnership.representatives[0].email,
  'partner.portal@example.com',
);

const portalLlp = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    email: 'designated.partner@example.com',
    phone_number: '+254700000021',
    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    registered_name: 'Nairobi Works LLP',
    llp_registration_number: 'LLP-2026-001',
    designated_partner_name: 'Peter Ben',
    designated_partner_identifier: 'LLP-ID-001',
    partner_two_name: 'Mercy Wanjiku',
    partner_two_identifier: 'LLP-ID-002',
  },
  {
    clientType: 'LIMITED_LIABILITY_PARTNERSHIP',
    accessType: 'PORTAL_ENABLED',
  },
);

const designatedPartner = portalLlp.partners.find(
  (partner) => partner.is_designated_partner,
);

assert.equal(portalLlp.access_type, 'PORTAL_ENABLED');
assert.equal(portalLlp.registered_name, 'Nairobi Works LLP');
assert.equal(portalLlp.partners.length, 2);
assert.equal(designatedPartner.legal_name, 'Peter Ben');
assert.equal(designatedPartner.identifier, 'LLP-ID-001');
assert.equal(portalLlp.contact_full_name, 'Peter Ben');
assert.equal(portalLlp.contact_national_id_number, 'LLP-ID-001');
assert.equal(
  portalLlp.representatives[0].representative_category,
  'DESIGNATED_PARTNER',
);
assert.equal(portalLlp.representatives[0].is_portal_contact, true);
assert.equal(
  portalLlp.representatives[0].email,
  'designated.partner@example.com',
);

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
    accessType: 'ASSISTED',
  },
);

assert.equal(estatePayload.personal_representatives.length, 1);
assert.equal(
  estatePayload.personal_representatives[0].full_legal_name,
  'Mary Wanjiku Kamau',
);
});

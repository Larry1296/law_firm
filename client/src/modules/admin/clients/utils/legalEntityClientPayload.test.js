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
    cooperative_officer_name: ' Mercy Wanjiku ',
    cooperative_officer_identifier: ' SACCO-OFFICER-ID-001 ',
    contact_full_name: '',
    contact_national_id_number: '',
  },
  {
    clientType: 'SACCO',
    requestedClientType: 'SACCO',
    accessType: 'PORTAL_ENABLED',
  },
);

assert.equal(saccoPayload.client_type, 'SACCO');
assert.equal(saccoPayload.registered_name, 'Nairobi Members SACCO');
assert.equal(saccoPayload.cooperative_subtype, 'SACCO');
assert.equal(saccoPayload.contact_full_name, 'Mercy Wanjiku');
assert.equal(saccoPayload.contact_national_id_number, 'SACCO-OFFICER-ID-001');
assert.equal(
  saccoPayload.representatives[0].representative_category,
  'COOPERATIVE_OFFICER',
);

const cooperativePayload = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    registered_name: ' Nairobi Farmers Cooperative ',
    cooperative_subtype: 'PRIMARY_COOPERATIVE',
    cooperative_officer_name: ' Mercy Wanjiku ',
    cooperative_officer_identifier: ' COOPERATIVE-OFFICER-ID-001 ',
    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    email: 'cooperative.officer@example.com',
    phone_number: '+254700000026',
  },
  {
    clientType: 'COOPERATIVE',
    requestedClientType: 'COOPERATIVE',
    accessType: 'PORTAL_ENABLED',
  },
);

assert.equal(cooperativePayload.client_type, 'COOPERATIVE');
assert.equal(cooperativePayload.cooperative_subtype, 'PRIMARY_COOPERATIVE');
assert.equal(cooperativePayload.contact_full_name, 'Mercy Wanjiku');
assert.equal(
  cooperativePayload.contact_national_id_number,
  'COOPERATIVE-OFFICER-ID-001',
);
assert.equal(
  cooperativePayload.representatives[0].representative_category,
  'COOPERATIVE_OFFICER',
);
assert.equal(cooperativePayload.representatives[0].is_portal_contact, true);

const ngoPayload = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    registered_name: ' Nairobi Justice Initiative ',
    nonprofit_official_name: ' Mercy Wanjiku ',
    nonprofit_official_identifier: ' NGO-OFFICIAL-ID-001 ',
    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    email: 'ngo.official@example.com',
    phone_number: '+254700000025',
  },
  {
    clientType: 'NGO',
    requestedClientType: 'NGO',
    accessType: 'PORTAL_ENABLED',
  },
);

assert.equal(ngoPayload.client_type, 'NGO');
assert.equal(ngoPayload.registered_name, 'Nairobi Justice Initiative');
assert.equal(ngoPayload.nonprofit_form, 'LEGACY_NGO_OR_TRANSITIONAL');
assert.equal(ngoPayload.contact_full_name, 'Mercy Wanjiku');
assert.equal(ngoPayload.contact_national_id_number, 'NGO-OFFICIAL-ID-001');
assert.equal(
  ngoPayload.representatives[0].representative_category,
  'PBO_OFFICIAL',
);
assert.equal(ngoPayload.representatives[0].is_portal_contact, true);

const associationPayload = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    legal_name: ' Milimani Residents Association ',
    registration_status: 'REGISTERED',
    association_official_name: ' Mercy Wanjiku ',
    association_official_identifier: ' ASSOCIATION-OFFICIAL-ID-001 ',
    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    email: 'association.official@example.com',
    phone_number: '+254700000027',
  },
  {
    clientType: 'SOCIETY_OR_ASSOCIATION',
    requestedClientType: 'ASSOCIATION',
    accessType: 'PORTAL_ENABLED',
  },
);

assert.equal(associationPayload.client_type, 'SOCIETY_OR_ASSOCIATION');
assert.equal(
  associationPayload.legal_name,
  'Milimani Residents Association',
);
assert.equal(associationPayload.contact_full_name, 'Mercy Wanjiku');
assert.equal(
  associationPayload.contact_national_id_number,
  'ASSOCIATION-OFFICIAL-ID-001',
);
assert.equal(
  associationPayload.representatives[0].representative_category,
  'SOCIETY_OFFICIAL',
);
assert.equal(associationPayload.representatives[0].is_portal_contact, true);

const publicEntityPayload = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    official_name: ' County Roads Authority ',
    public_entity_subtype: 'COUNTY_ENTITY',
    public_officer_name: ' Mercy Wanjiku ',
    public_officer_identifier: ' PUBLIC-OFFICER-ID-001 ',
    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    email: 'public.officer@example.com',
    phone_number: '+254700000028',
  },
  {
    clientType: 'PUBLIC_ENTITY',
    requestedClientType: 'GOVERNMENT',
    accessType: 'PORTAL_ENABLED',
  },
);

assert.equal(publicEntityPayload.client_type, 'PUBLIC_ENTITY');
assert.equal(publicEntityPayload.official_name, 'County Roads Authority');
assert.equal(publicEntityPayload.public_entity_subtype, 'COUNTY_ENTITY');
assert.equal(publicEntityPayload.contact_full_name, 'Mercy Wanjiku');
assert.equal(
  publicEntityPayload.contact_national_id_number,
  'PUBLIC-OFFICER-ID-001',
);
assert.equal(
  publicEntityPayload.representatives[0].representative_category,
  'AUTHORIZED_PUBLIC_OFFICER',
);
assert.equal(publicEntityPayload.representatives[0].is_portal_contact, true);

const publicEntityWithAuthorizedContactPayload =
  buildLegalEntityClientPayload(
    {
      ...baseEntity,
      official_name: 'County Roads Authority',
      public_entity_subtype: 'COUNTY_ENTITY',
      public_officer_name: 'Mercy Wanjiku',
      public_officer_identifier: 'PUBLIC-OFFICER-ID-001',
      contact_full_name: 'Mercy Wanjiku',
      contact_role_or_designation: 'County Secretary',
      contact_email: 'mercy.wanjiku@example.com',
      contact_phone_number: '+254700000028',
      contact_national_id_number: 'PUBLIC-OFFICER-ID-001',
    },
    {
      clientType: 'PUBLIC_ENTITY',
      requestedClientType: 'GOVERNMENT',
      accessType: 'PORTAL_ENABLED',
    },
  );

assert.equal(
  publicEntityWithAuthorizedContactPayload.representatives[0]
    .representative_category,
  'AUTHORIZED_PUBLIC_OFFICER',
);
assert.equal(
  publicEntityWithAuthorizedContactPayload.representatives[0].role_title,
  'County Secretary',
);
assert.equal(
  publicEntityWithAuthorizedContactPayload.representatives[0].email,
  'mercy.wanjiku@example.com',
);
assert.equal(
  publicEntityWithAuthorizedContactPayload.representatives[0].telephone,
  '+254700000028',
);
assert.equal(
  publicEntityWithAuthorizedContactPayload.representatives[0]
    .is_portal_contact,
  true,
);

const internationalOrganizationPayload = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    official_name: ' Regional Development Organization ',
    organization_type: 'INTERGOVERNMENTAL',
    international_representative_name: ' Mercy Wanjiku ',
    international_representative_identifier: ' INTL-REP-ID-001 ',
    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    email: 'international.rep@example.com',
    phone_number: '+254700000029',
  },
  {
    clientType: 'INTERNATIONAL_ORGANIZATION',
    requestedClientType: 'INTERNATIONAL_ORGANIZATION',
    accessType: 'PORTAL_ENABLED',
  },
);

assert.equal(
  internationalOrganizationPayload.client_type,
  'INTERNATIONAL_ORGANIZATION',
);
assert.equal(
  internationalOrganizationPayload.official_name,
  'Regional Development Organization',
);
assert.equal(
  internationalOrganizationPayload.organization_type,
  'INTERGOVERNMENTAL',
);
assert.equal(
  internationalOrganizationPayload.contact_full_name,
  'Mercy Wanjiku',
);
assert.equal(
  internationalOrganizationPayload.contact_national_id_number,
  'INTL-REP-ID-001',
);
assert.equal(
  internationalOrganizationPayload.representatives[0].representative_category,
  'AUTHORIZED_AGENT',
);
assert.equal(
  internationalOrganizationPayload.representatives[0].is_portal_contact,
  true,
);

const schoolPayload = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    official_name: ' Milimani Academy ',
    registration_number: ' school-2026-001 ',
    school_representative_name: ' Mercy Wanjiku ',
    school_representative_identifier: ' SCHOOL-REP-ID-001 ',
    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    email: 'school.rep@example.com',
    phone_number: '+254700000030',
  },
  {
    clientType: 'EDUCATIONAL_INSTITUTION',
    requestedClientType: 'SCHOOL',
    accessType: 'PORTAL_ENABLED',
  },
);

assert.equal(schoolPayload.client_type, 'EDUCATIONAL_INSTITUTION');
assert.equal(schoolPayload.official_name, 'Milimani Academy');
assert.equal(schoolPayload.contact_full_name, 'Mercy Wanjiku');
assert.equal(
  schoolPayload.contact_national_id_number,
  'SCHOOL-REP-ID-001',
);
assert.equal(
  schoolPayload.representatives[0].representative_category,
  'AUTHORIZED_AGENT',
);
assert.equal(schoolPayload.representatives[0].is_portal_contact, true);

const religiousOrganizationPayload = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    registered_name: ' Nairobi Faith Community ',
    religious_official_name: ' Mercy Wanjiku ',
    religious_official_identifier: ' RELIGIOUS-OFFICIAL-ID-001 ',
    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    email: 'religious.official@example.com',
    phone_number: '+254700000031',
  },
  {
    clientType: 'RELIGIOUS_ORGANIZATION',
    requestedClientType: 'RELIGIOUS',
    accessType: 'PORTAL_ENABLED',
  },
);

assert.equal(
  religiousOrganizationPayload.client_type,
  'RELIGIOUS_ORGANIZATION',
);
assert.equal(
  religiousOrganizationPayload.nonprofit_form,
  'FAITH_BASED_ORGANIZATION',
);
assert.equal(
  religiousOrganizationPayload.contact_full_name,
  'Mercy Wanjiku',
);
assert.equal(
  religiousOrganizationPayload.contact_national_id_number,
  'RELIGIOUS-OFFICIAL-ID-001',
);
assert.equal(
  religiousOrganizationPayload.representatives[0].representative_category,
  'AUTHORIZED_AGENT',
);
assert.equal(
  religiousOrganizationPayload.representatives[0].is_portal_contact,
  true,
);

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

const portalTrust = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    email: 'primary.trustee@example.com',
    phone_number: '+254700000022',
    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    trust_name: 'Wanjiku Family Trust',
    trust_type: 'PRIVATE_TRUST',
    trustee_name: 'Mercy Wanjiku',
    trustee_identifier: 'TRUSTEE-ID-001',
    trust_deed_reference: 'TRUST-DEED-001',
  },
  {
    clientType: 'TRUST',
    accessType: 'PORTAL_ENABLED',
  },
);

assert.equal(portalTrust.access_type, 'PORTAL_ENABLED');
assert.equal(portalTrust.trustees.length, 1);
assert.equal(portalTrust.trustees[0].legal_name, 'Mercy Wanjiku');
assert.equal(portalTrust.trustees[0].identifier, 'TRUSTEE-ID-001');
assert.equal(portalTrust.contact_full_name, 'Mercy Wanjiku');
assert.equal(portalTrust.contact_national_id_number, 'TRUSTEE-ID-001');
assert.equal(
  portalTrust.representatives[0].representative_category,
  'TRUSTEE',
);
assert.equal(portalTrust.representatives[0].is_portal_contact, true);
assert.equal(
  portalTrust.representatives[0].email,
  'primary.trustee@example.com',
);

const estatePayload = buildLegalEntityClientPayload(
  {
    ...baseEntity,
    email: 'administrator@example.com',
    phone_number: '+254700000023',
    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    estate_name: ' Estate of John Kamau ',
    deceased_full_name: ' John Kamau ',
    grant_type: 'PROBATE',
    personal_representative_name: ' Mary Wanjiku Kamau ',
    personal_representative_identifier: 'ESTATE-REP-ID-001',
    probate_number: 'SUCCESSION-001',
  },
  {
    clientType: 'ESTATE',
    accessType: 'PORTAL_ENABLED',
  },
);

assert.equal(estatePayload.personal_representatives.length, 1);
assert.equal(
  estatePayload.personal_representatives[0].full_legal_name,
  'Mary Wanjiku Kamau',
);
assert.equal(
  estatePayload.personal_representatives[0].identifier,
  'ESTATE-REP-ID-001',
);
assert.equal(estatePayload.personal_representatives[0].representative_type, 'EXECUTOR');
assert.equal(estatePayload.personal_representatives[0].grant_reference, 'SUCCESSION-001');
assert.equal(estatePayload.contact_full_name, 'Mary Wanjiku Kamau');
assert.equal(estatePayload.contact_national_id_number, 'ESTATE-REP-ID-001');
assert.equal(
  estatePayload.representatives[0].representative_category,
  'EXECUTOR',
);
assert.equal(estatePayload.representatives[0].is_portal_contact, true);
assert.equal(
  estatePayload.representatives[0].email,
  'administrator@example.com',
);
});

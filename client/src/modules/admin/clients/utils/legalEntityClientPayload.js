const EMPTY_VALUES = new Set(['', null, undefined]);

export const canonicalLegalEntityTypes = [
  'SOLE_PROPRIETORSHIP',
  'PARTNERSHIP',
  'LIMITED_LIABILITY_PARTNERSHIP',
  'COOPERATIVE',
  'SOCIETY_OR_ASSOCIATION',
  'NON_PROFIT_ORGANIZATION',
  'TRUST',
  'ESTATE',
  'PUBLIC_ENTITY',
  'INTERNATIONAL_ORGANIZATION',
];

const trim = (value) => (typeof value === 'string' ? value.trim() : value);
const lower = (value) => {
  const next = trim(value);
  return next ? String(next).toLowerCase() : next;
};
const upper = (value) => {
  const next = trim(value);
  return next ? String(next).toUpperCase() : next;
};

const clean = (payload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => !EMPTY_VALUES.has(value)),
  );

export const buildLegalEntityClientPayload = (
  formData,
  {
    clientType,
    requestedClientType = clientType,
    accessType = 'PROSPECT',
  } = {},
) => {
  const isProspect = accessType === 'PROSPECT';
  const email = isProspect
    ? lower(formData.email) || lower(formData.contact_email) || lower(formData.contact_person_email)
    : lower(formData.email);
  const phoneNumber = isProspect
    ? trim(formData.phone_number) ||
      trim(formData.contact_phone_number) ||
      trim(formData.contact_person_phone) ||
      trim(formData.primary_trustee_contact) ||
      trim(formData.executor_contact) ||
      trim(formData.administrator_contact) ||
      trim(formData.director_contact)
    : trim(formData.phone_number);

  const representatives = trim(formData.contact_full_name)
    ? [
        {
          full_legal_name: trim(formData.contact_full_name),
          representative_category: 'AUTHORIZED_AGENT',
          role_title: trim(formData.contact_role_or_designation),
          national_id_or_passport: trim(formData.contact_national_id_number),
          email: lower(formData.contact_email),
          telephone: trim(formData.contact_phone_number),
          is_primary: true,
          is_portal_contact: isProspect,
          is_litigation_representative: true,
          authority_type: 'Client instruction authority',
        },
      ]
    : [];

  const partners = [
    trim(formData.partner_one_name) && {
      partner_type: 'INDIVIDUAL',
      partner_kind: 'INDIVIDUAL',
      legal_name: trim(formData.partner_one_name),
      designation: 'GENERAL_PARTNER',
      is_designated_partner: clientType === 'LIMITED_LIABILITY_PARTNERSHIP',
      authority_to_instruct: true,
    },
    trim(formData.partner_two_name) && {
      partner_type: 'INDIVIDUAL',
      partner_kind: 'INDIVIDUAL',
      legal_name: trim(formData.partner_two_name),
      designation: 'GENERAL_PARTNER',
      is_designated_partner: false,
      authority_to_instruct: false,
    },
    trim(formData.designated_partner_name) && {
      partner_type: 'INDIVIDUAL',
      partner_kind: 'INDIVIDUAL',
      legal_name: trim(formData.designated_partner_name),
      designation: 'GENERAL_PARTNER',
      is_designated_partner: true,
      authority_to_instruct: true,
    },
  ].filter(Boolean);

  const trustees = trim(formData.trustee_name)
    ? [
        {
          trustee_type: 'INDIVIDUAL',
          legal_name: trim(formData.trustee_name),
          is_primary_contact: true,
          authority_to_instruct: true,
        },
      ]
    : [];

  const personalRepresentatives = trim(formData.personal_representative_name)
    ? [
        {
          representative_type: formData.grant_type === 'PROBATE' ? 'EXECUTOR' : 'ADMINISTRATOR',
          full_legal_name: trim(formData.personal_representative_name),
          is_primary: true,
          is_verified: false,
        },
      ]
    : [];

  return clean({
    email,
    phone_number: phoneNumber,
    access_type: accessType,
    country: trim(formData.country),
    county: trim(formData.county),
    city: trim(formData.city),
    street: trim(formData.street),
    postal_code: trim(formData.postal_code),
    full_address: trim(formData.full_address),

    client_type: clientType,
    legal_name: trim(formData.legal_name) || trim(formData.company_name),
    registration_number: upper(formData.registration_number),
    kra_pin: upper(formData.kra_pin),
    country_of_registration: trim(formData.country_of_registration) || trim(formData.country_of_incorporation) || 'Kenya',
    registration_authority: trim(formData.registration_authority),
    registration_date: formData.registration_date || null,
    registered_address: trim(formData.registered_address) || trim(formData.full_address),
    postal_address: trim(formData.postal_address),
    operational_address: trim(formData.operational_address) || trim(formData.headquarters_address),
    status: formData.status,
    sector: trim(formData.sector) || trim(formData.industry),
    website: trim(formData.website),
    compliance_notes: trim(formData.compliance_notes),
    representatives,

    registered_business_name: trim(formData.registered_business_name) || trim(formData.company_name),
    business_registration_number: upper(formData.business_registration_number || formData.registration_number),
    proprietor_name: trim(formData.proprietor_name) || trim(formData.contact_full_name),
    proprietor_identifier: trim(formData.proprietor_identifier) || trim(formData.contact_national_id_number),
    proprietor_kra_pin: upper(formData.proprietor_kra_pin),
    business_kra_pin: upper(formData.business_kra_pin || formData.kra_pin),
    trading_name: trim(formData.trading_name),

    partnership_name: trim(formData.partnership_name) || trim(formData.legal_name),
    subtype: formData.subtype,
    formation_date: formData.formation_date || null,
    principal_place_of_business: trim(formData.principal_place_of_business),
    partnership_agreement_reference: trim(formData.partnership_agreement_reference),
    partners,

    registered_name: trim(formData.registered_name) || trim(formData.company_name) || trim(formData.legal_name),
    llp_registration_number: upper(formData.llp_registration_number || formData.registration_number),
    registered_office: trim(formData.registered_office) || trim(formData.full_address),
    principal_business_address: trim(formData.principal_business_address),

    cooperative_subtype: requestedClientType === 'SACCO' ? 'SACCO' : formData.cooperative_subtype,
    area_of_operation: trim(formData.area_of_operation),
    activity_sector: trim(formData.activity_sector) || trim(formData.sector),
    regulator_name: trim(formData.regulator_name),
    license_number: trim(formData.license_number),
    license_status: trim(formData.license_status),

    common_name: trim(formData.common_name),
    registration_status: formData.registration_status,
    constitution_reference: trim(formData.constitution_reference),
    objectives: trim(formData.objectives),
    principal_office: trim(formData.principal_office),
    litigation_authority_reference: trim(formData.litigation_authority_reference),
    nonprofit_form: requestedClientType === 'RELIGIOUS' ? 'FAITH_BASED_ORGANIZATION' : formData.nonprofit_form,
    canonical_legal_form: formData.canonical_legal_form,
    pbo_or_ngo_status: formData.pbo_or_ngo_status,
    operational_scope: trim(formData.operational_scope) || trim(formData.operational_regions),
    funding_compliance_notes: trim(formData.funding_compliance_notes) || trim(formData.funding_sources),

    trust_name: trim(formData.trust_name) || trim(formData.legal_name),
    trust_type: formData.trust_type,
    trust_deed_reference: trim(formData.trust_deed_reference),
    trust_deed_date: formData.trust_deed_date || null,
    jurisdiction: trim(formData.jurisdiction),
    purpose: trim(formData.purpose),
    principal_address: trim(formData.principal_address),
    settlor_details: trim(formData.settlor_details),
    trustees,

    estate_name: trim(formData.estate_name) || trim(formData.legal_name),
    deceased_full_name: trim(formData.deceased_full_name),
    deceased_id_number: trim(formData.deceased_id_number),
    date_of_death: formData.date_of_death || null,
    deceased_last_address: trim(formData.deceased_last_address),
    probate_number: trim(formData.probate_number),
    court_reference: trim(formData.court_reference),
    grant_type: formData.grant_type,
    grant_issue_date: formData.grant_issue_date || null,
    grant_confirmation_date: formData.grant_confirmation_date || null,
    grant_status: formData.grant_status,
    estate_value_estimate: formData.estate_value_estimate,
    personal_representatives: personalRepresentatives,

    official_name: trim(formData.official_name) || trim(formData.government_entity_name) || trim(formData.legal_name),
    public_entity_subtype: requestedClientType === 'SCHOOL' ? 'PUBLIC_UNIVERSITY' : formData.public_entity_subtype,
    enabling_instrument: trim(formData.enabling_instrument),
    parent_ministry_or_county: trim(formData.parent_ministry_or_county),
    legal_capacity_notes: trim(formData.legal_capacity_notes),
    official_address: trim(formData.official_address) || trim(formData.office_address),
    statutory_representative: trim(formData.statutory_representative),
    jurisdiction_level: trim(formData.jurisdiction_level),

    organization_type: formData.organization_type,
    founding_instrument: trim(formData.founding_instrument),
    headquarters_country: trim(formData.headquarters_country),
    kenya_recognition_details: trim(formData.kenya_recognition_details),
    privileges_immunities_status: trim(formData.privileges_immunities_status),
    kenya_office_address: trim(formData.kenya_office_address),
  });
};

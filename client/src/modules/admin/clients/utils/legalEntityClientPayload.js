const EMPTY_VALUES = new Set(['', null, undefined]);

export const canonicalLegalEntityTypes = [
  'SOLE_PROPRIETORSHIP',
  'PARTNERSHIP',
  'LIMITED_LIABILITY_PARTNERSHIP',
  'COOPERATIVE',
  'SACCO',
  'SOCIETY_OR_ASSOCIATION',
  'NON_PROFIT_ORGANIZATION',
  'NGO',
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
    accessType = 'PORTAL_ENABLED',
  } = {},
) => {
  const isProspect = accessType === 'PORTAL_ENABLED';
  const isSoleProprietorship = clientType === 'SOLE_PROPRIETORSHIP';
  const isPartnership = clientType === 'PARTNERSHIP';
  const isLimitedLiabilityPartnership =
    clientType === 'LIMITED_LIABILITY_PARTNERSHIP';
  const isTrust = clientType === 'TRUST';
  const isEstate = clientType === 'ESTATE';
  const isSacco = clientType === 'SACCO';
  const isCooperative = clientType === 'COOPERATIVE' || isSacco;
  const isNgo = clientType === 'NGO';
  const isSocietyOrAssociation = clientType === 'SOCIETY_OR_ASSOCIATION';
  const proprietorName = trim(formData.proprietor_name);
  const proprietorIdentifier = trim(formData.proprietor_identifier);
  const firstPartnerName = trim(formData.partner_one_name);
  const firstPartnerIdentifier = trim(formData.partner_one_identifier);
  const designatedPartnerName = trim(formData.designated_partner_name);
  const designatedPartnerIdentifier = trim(
    formData.designated_partner_identifier,
  );
  const trusteeName = trim(formData.trustee_name);
  const trusteeIdentifier = trim(formData.trustee_identifier);
  const personalRepresentativeName = trim(
    formData.personal_representative_name,
  );
  const personalRepresentativeIdentifier = trim(
    formData.personal_representative_identifier,
  );
  const cooperativeOfficerName = trim(formData.cooperative_officer_name);
  const cooperativeOfficerIdentifier = trim(
    formData.cooperative_officer_identifier,
  );
  const nonprofitOfficialName = trim(formData.nonprofit_official_name);
  const nonprofitOfficialIdentifier = trim(
    formData.nonprofit_official_identifier,
  );
  const associationOfficialName = trim(formData.association_official_name);
  const associationOfficialIdentifier = trim(
    formData.association_official_identifier,
  );
  const personalRepresentativeType =
    formData.grant_type === 'PROBATE'
      ? 'EXECUTOR'
      : formData.grant_type === 'PUBLIC_TRUSTEE'
        ? 'PUBLIC_TRUSTEE'
        : 'ADMINISTRATOR';
  const contactName =
    trim(formData.contact_full_name) ||
    (isSoleProprietorship
      ? proprietorName
      : isPartnership
        ? firstPartnerName
        : isLimitedLiabilityPartnership
          ? designatedPartnerName
          : isTrust
            ? trusteeName
            : isEstate
              ? personalRepresentativeName
              : isCooperative
                ? cooperativeOfficerName
                : isNgo
                  ? nonprofitOfficialName
                  : isSocietyOrAssociation
                    ? associationOfficialName
                    : '');
  const contactEmail = isProspect
    ? lower(formData.contact_email) ||
      (isSoleProprietorship ||
      isTrust ||
      isEstate ||
      isCooperative ||
      isNgo ||
      isSocietyOrAssociation
        ? lower(formData.email)
        : '')
    : '';
  const contactPhone =
    trim(formData.contact_phone_number) ||
    (isSoleProprietorship ||
    isTrust ||
    isEstate ||
    isCooperative ||
    isNgo ||
    isSocietyOrAssociation
      ? trim(formData.phone_number)
      : '');
  const contactIdentifier =
    trim(formData.contact_national_id_number) ||
    (isSoleProprietorship
      ? proprietorIdentifier
      : isPartnership
        ? firstPartnerIdentifier
        : isLimitedLiabilityPartnership
          ? designatedPartnerIdentifier
          : isTrust
            ? trusteeIdentifier
            : isEstate
              ? personalRepresentativeIdentifier
              : isCooperative
                ? cooperativeOfficerIdentifier
                : isNgo
                  ? nonprofitOfficialIdentifier
                  : isSocietyOrAssociation
                    ? associationOfficialIdentifier
                    : '');
  const email = isProspect
    ? lower(formData.email) || contactEmail || lower(formData.contact_person_email)
    : '';
  const phoneNumber =
    trim(formData.phone_number) ||
    contactPhone ||
    (isProspect
      ? trim(formData.contact_person_phone) ||
      trim(formData.primary_trustee_contact) ||
      trim(formData.executor_contact) ||
      trim(formData.administrator_contact) ||
      trim(formData.director_contact)
      : '');

  const representatives = contactName
    ? [
        {
          full_legal_name: contactName,
          representative_category:
            isSoleProprietorship && !trim(formData.contact_full_name)
              ? 'PROPRIETOR'
              : isPartnership && !trim(formData.contact_full_name)
                ? 'PARTNER'
                : isLimitedLiabilityPartnership &&
                    !trim(formData.contact_full_name)
                  ? 'DESIGNATED_PARTNER'
                  : isTrust && !trim(formData.contact_full_name)
                    ? 'TRUSTEE'
                    : isEstate && !trim(formData.contact_full_name)
                      ? personalRepresentativeType
                      : isCooperative && !trim(formData.contact_full_name)
                        ? 'COOPERATIVE_OFFICER'
                        : isNgo && !trim(formData.contact_full_name)
                          ? 'PBO_OFFICIAL'
                          : isSocietyOrAssociation &&
                              !trim(formData.contact_full_name)
                            ? 'SOCIETY_OFFICIAL'
                            : 'AUTHORIZED_AGENT',
          role_title:
            trim(formData.contact_role_or_designation) ||
            (isSoleProprietorship
              ? 'Proprietor'
              : isPartnership
                ? 'Partner'
                : isLimitedLiabilityPartnership
                  ? 'Designated Partner'
                  : isTrust
                    ? 'Trustee'
                    : isEstate
                      ? personalRepresentativeType === 'EXECUTOR'
                        ? 'Executor'
                        : personalRepresentativeType === 'PUBLIC_TRUSTEE'
                          ? 'Public Trustee'
                          : 'Administrator'
                      : isCooperative
                        ? isSacco
                          ? 'SACCO Officer'
                          : 'Cooperative Officer'
                        : isNgo
                          ? 'NGO Official'
                          : isSocietyOrAssociation
                            ? 'Association Official'
                            : ''),
          national_id_or_passport: contactIdentifier,
          ...(isProspect && contactEmail ? { email: contactEmail } : {}),
          telephone: contactPhone,
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
      identifier: trim(formData.partner_one_identifier),
      designation: 'GENERAL_PARTNER',
      is_designated_partner: clientType === 'LIMITED_LIABILITY_PARTNERSHIP',
      authority_to_instruct: true,
    },
    trim(formData.partner_two_name) && {
      partner_type: 'INDIVIDUAL',
      partner_kind: 'INDIVIDUAL',
      legal_name: trim(formData.partner_two_name),
      identifier: trim(formData.partner_two_identifier),
      designation: 'GENERAL_PARTNER',
      is_designated_partner: false,
      authority_to_instruct: false,
    },
    trim(formData.designated_partner_name) && {
      partner_type: 'INDIVIDUAL',
      partner_kind: 'INDIVIDUAL',
      legal_name: trim(formData.designated_partner_name),
      identifier: trim(formData.designated_partner_identifier),
      designation: 'GENERAL_PARTNER',
      is_designated_partner: true,
      authority_to_instruct: true,
    },
  ].filter(Boolean);

  const trustees = trusteeName
    ? [
        {
          trustee_type: 'INDIVIDUAL',
          legal_name: trusteeName,
          identifier: trusteeIdentifier,
          is_primary_contact: true,
          authority_to_instruct: true,
        },
      ]
    : [];

  const personalRepresentatives = personalRepresentativeName
    ? [
        {
          representative_type: personalRepresentativeType,
          full_legal_name: personalRepresentativeName,
          identifier: personalRepresentativeIdentifier,
          phone_number: contactPhone,
          ...(isProspect && contactEmail ? { email: contactEmail } : {}),
          grant_reference:
            trim(formData.probate_number) || trim(formData.court_reference),
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
    contact_full_name: contactName,
    contact_role_or_designation:
      trim(formData.contact_role_or_designation) ||
      (isSoleProprietorship
        ? 'Proprietor'
        : isPartnership
          ? 'Partner'
          : isLimitedLiabilityPartnership
            ? 'Designated Partner'
            : isTrust
              ? 'Trustee'
                : isEstate
                ? personalRepresentativeType === 'EXECUTOR'
                  ? 'Executor'
                  : personalRepresentativeType === 'PUBLIC_TRUSTEE'
                    ? 'Public Trustee'
                    : 'Administrator'
                : isCooperative
                  ? isSacco
                    ? 'SACCO Officer'
                    : 'Cooperative Officer'
                  : isNgo
                    ? 'NGO Official'
                    : isSocietyOrAssociation
                      ? 'Association Official'
                      : ''),
    contact_email: contactEmail,
    contact_phone_number: contactPhone,
    contact_national_id_number: contactIdentifier,

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
    proprietor_name: proprietorName || contactName,
    proprietor_identifier: proprietorIdentifier || contactIdentifier,
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

    cooperative_subtype:
      requestedClientType === 'SACCO' || clientType === 'SACCO'
        ? 'SACCO'
        : formData.cooperative_subtype,
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
    nonprofit_form:
      requestedClientType === 'RELIGIOUS'
        ? 'FAITH_BASED_ORGANIZATION'
        : requestedClientType === 'NGO' || clientType === 'NGO'
          ? 'LEGACY_NGO_OR_TRANSITIONAL'
          : formData.nonprofit_form,
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

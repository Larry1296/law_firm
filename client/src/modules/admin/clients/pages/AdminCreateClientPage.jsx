import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from '@/core/utils/themedSwal';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';
import FloatingInput from '@/components/ui/FloatingInput';
import Select3D from '@/components/ui/Select3D';

import adminClientsService from '@/modules/admin/clients/services/adminClientsService';
import secretaryClientsService from '@/modules/staff/secretary/clients/services/secretaryClientServices';
import {
  buildIndividualClientPayload,
  INDIVIDUAL_PRIVACY_NOTICE_VERSION,
  isMinorIndividualClient,
  validateIndividualClientForm,
} from '@/modules/admin/clients/utils/individualClientPayload';
import {
  buildLegalEntityClientPayload,
  canonicalLegalEntityTypes,
} from '@/modules/admin/clients/utils/legalEntityClientPayload';
import ClientCreationSuccessPanel from '@/modules/admin/clients/components/ClientCreationSuccessPanel';

export default function AdminCreateClientPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSecretaryCreate = location.pathname.startsWith('/secretary/');

  const [searchParams] = useSearchParams();

  const requestedClientType = (
    searchParams.get('type') || 'INDIVIDUAL'
  ).toUpperCase();

  const clientTypeMap = {
    SACCO: 'COOPERATIVE',
    COOPERATIVE: 'COOPERATIVE',
    ASSOCIATION: 'SOCIETY_OR_ASSOCIATION',
    NGO_ASSOCIATION: 'SOCIETY_OR_ASSOCIATION',
    NGO: 'NON_PROFIT_ORGANIZATION',
    RELIGIOUS: 'NON_PROFIT_ORGANIZATION',
    RELIGIOUS_ORGANIZATION: 'NON_PROFIT_ORGANIZATION',
    GOVERNMENT: 'PUBLIC_ENTITY',
    GOVERNMENT_BODY: 'PUBLIC_ENTITY',
    SCHOOL: 'PUBLIC_ENTITY',
    EDUCATIONAL_INSTITUTION: 'PUBLIC_ENTITY',
    INTERNATIONAL_ENTITY: 'INTERNATIONAL_ORGANIZATION',
  };

  const clientType = clientTypeMap[requestedClientType] || requestedClientType;
  const companyLikeClientTypes = [
    'COMPANY',
  ];
  const ngoLikeClientTypes = [
    'NGO',
    'NGO_ASSOCIATION',
    'RELIGIOUS_ORGANIZATION',
  ];
  const governmentLikeClientTypes = [
    'GOVERNMENT',
    'GOVERNMENT_BODY',
    'EDUCATIONAL_INSTITUTION',
  ];
  const canonicalEntityTypes = canonicalLegalEntityTypes;
  const clientMode = searchParams.get('mode'); // portal | assisted | null
  const isIndividualClientType = clientType === 'INDIVIDUAL';
  const [selectedClientMode, setSelectedClientMode] = useState(
    isIndividualClientType && clientMode === 'assisted' ? 'assisted' : 'portal',
  );
  const [selectedEntityAccessType, setSelectedEntityAccessType] = useState(
    clientMode === 'assisted' ? 'ASSISTED' : 'PORTAL_ENABLED',
  );
  const partnershipAgreementTypes = [
    {
      value: 'GENERAL_PARTNERSHIP',
      label: 'General Partnership Agreement',
    },
    {
      value: 'LIMITED_PARTNERSHIP',
      label: 'Limited Partnership Agreement',
    },
    {
      value: 'LIMITED_LIABILITY_PARTNERSHIP',
      label: 'Limited Liability Partnership Agreement',
    },
    {
      value: 'JOINT_VENTURE',
      label: 'Joint Venture Agreement',
    },
    {
      value: 'SILENT_PARTNERSHIP',
      label: 'Silent Partnership Agreement',
    },
    {
      value: 'STRATEGIC_ALLIANCE',
      label: 'Strategic Alliance Agreement',
    },
    {
      value: 'PROFIT_SHARING',
      label: 'Profit Sharing Agreement',
    },
    {
      value: 'MEMORANDUM_OF_UNDERSTANDING',
      label: 'Memorandum of Understanding',
    },
  ];
  const nextOfKinRelationshipOptions = [
    { value: 'Spouse', label: 'Spouse' },
    { value: 'Brother', label: 'Brother' },
    { value: 'Sister', label: 'Sister' },
    { value: 'Parent', label: 'Parent' },
    { value: 'Other', label: 'Other' },
  ];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    phone_number: '',

    full_name: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    preferred_name: '',
    onboarding_method: 'STAFF_ASSISTED',
    identification_type: 'NATIONAL_ID',
    identification_number: '',
    identification_country: 'Kenya',
    identification_expiry_date: '',
    identification_document_reference: '',
    identification_verified: false,
    verification_method: '',
    verification_notes: '',
    national_id: '',
    passport_number: '',
    date_of_birth: '',
    gender: '',
    occupation_status: '',
    occupation: '',
    employer: '',
    business_name: '',
    marital_status: '',
    nationality: '',
    citizenship: 'Kenya',
    county_of_residence: '',
    physical_address: '',
    postal_address: '',
    preferred_language: 'English',
    preferred_contact_channel: '',
    disability_or_accessibility_notes: '',
    next_of_kin_name: '',
    next_of_kin_relationship: '',
    next_of_kin_phone: '',
    next_of_kin_email: '',
    next_of_kin_identification_number: '',
    next_of_kin_national_id: '',
    next_of_kin_address: '',
    next_of_kin_physical_address: '',
    guardian_name: '',
    guardian_relationship: '',
    guardian_phone: '',
    guardian_email: '',
    privacy_notice_version: INDIVIDUAL_PRIVACY_NOTICE_VERSION,
    privacy_notice_delivery_method: 'PORTAL',
    privacy_notice_acknowledged: false,
    privacy_acknowledgement_reference: '',
    privacy_lawful_basis: 'CONTRACT_AND_LEGAL_OBLIGATION',
    privacy_data_sharing_explanation: 'Courts, tribunals, opposing counsel and authorised service providers where necessary for the legal service.',
    privacy_retention_category: 'CLIENT_AND_MATTER_RECORD',
    personal_data_source: '',
    acting_for_self: true,
    represented_person: '',
    representation_capacity: '',
    authority_document_reference: '',
    authority_verified: false,
    purpose_and_nature_of_relationship: '',
    pep_status: 'PENDING',
    pep_details: '',
    sanctions_screening_status: 'PENDING',
    screening_date: '',
    screening_method: '',
    screening_result: '',
    risk_rating: 'NOT_ASSESSED',
    risk_assessment_reason: '',
    source_of_funds: '',
    source_of_wealth: '',
    enhanced_due_diligence_required: false,
    enhanced_due_diligence_reason: '',
    next_review_date: '',
    notes: '',

    company_name: '',
    trading_name: '',
    registration_number: '',
    kra_pin: '',
    company_type: 'PRIVATE_LIMITED_COMPANY',
    incorporation_date: '',
    country_of_incorporation: 'Kenya',
    industry: '',
    nature_of_business: '',
    website: '',
    company_status: 'ACTIVE',
    company_registration_authority: 'Business Registration Service',
    registration_document_reference: '',
    registration_verification_source: 'BRS_ECITIZEN',
    registration_verified: false,
    onboarding_method_company: 'STAFF_ASSISTED',
    preferred_contact_channel_company: 'PHONE',
    company_privacy_notice_version: INDIVIDUAL_PRIVACY_NOTICE_VERSION,
    company_privacy_notice_delivery_method: 'PAPER',
    company_privacy_notice_acknowledged: false,
    company_personal_data_source: 'AUTHORISED_REPRESENTATIVE',
    company_privacy_lawful_basis: 'LEGAL_SERVICE_AND_CONTRACT',
    company_purpose_and_nature: '',
    company_pep_status: 'PENDING',
    company_sanctions_status: 'PENDING',
    company_risk_rating: 'NOT_ASSESSED',
    company_source_of_funds: '',
    company_source_of_wealth: '',
    company_edd_required: false,
    company_edd_reason: '',
    client_instructions_confirmed: false,
    director_full_legal_name: '',
    director_identifier: '',
    director_nationality: 'Kenyan',
    director_identity_verified: false,
    director_verification_reference: '',
    director_authority_to_instruct: false,
    owner_full_legal_name: '',
    owner_identifier: '',
    owner_nationality: 'Kenyan',
    owner_ownership_percentage: '',
    owner_voting_percentage: '',
    owner_control_method: 'SHAREHOLDING',
    owner_identity_verified: false,
    owner_evidence_reference: '',
    beneficial_ownership_verified: false,
    representative_authority_type: 'BOARD_RESOLUTION',
    representative_authority_reference: '',
    representative_authority_verified: false,
    director_count: '',
    employee_count: '',
    beneficial_ownership_declared: false,
    annual_returns_up_to_date: false,
    compliance_notes: '',

    partnership_name: '',
    tax_pin: '',
    formation_date: '',
    partner_count: '',
    agreement_type: '',

    ngo_name: '',
    registration_authority: '',
    registration_date: '',
    sector: '',
    headquarters_address: '',
    operational_regions: '',
    director_name: '',
    director_contact: '',
    funding_sources: '',

    trust_name: '',
    trust_type: '',
    trust_deed_reference: '',
    jurisdiction: '',
    trustee_count: '',
    primary_trustee_name: '',
    primary_trustee_contact: '',
    beneficiary_details: '',
    assets_under_trust: '',
    legal_representative: '',

    estate_name: '',
    deceased_full_name: '',
    deceased_id_number: '',
    date_of_death: '',
    probate_number: '',
    court_reference: '',
    executor_name: '',
    executor_contact: '',
    administrator_name: '',
    administrator_contact: '',
    estate_value_estimate: '',
    beneficiaries: '',
    assets_description: '',
    liabilities_description: '',
    court_status: '',

    government_entity_name: '',
    department: '',
    agency_code: '',
    jurisdiction_level: '',
    contact_person_name: '',
    contact_person_position: '',
    contact_person_phone: '',
    contact_person_email: '',
    office_address: '',
    mandate_area: '',
    legal_department_head: '',
    legal_department_contact: '',

    legal_name: '',
    registered_business_name: '',
    business_registration_number: '',
    proprietor_name: '',
    proprietor_identifier: '',
    proprietor_kra_pin: '',
    business_kra_pin: '',
    subtype: 'GENERAL_PARTNERSHIP',
    registered_name: '',
    llp_registration_number: '',
    registered_office: '',
    principal_business_address: '',
    principal_place_of_business: '',
    partnership_agreement_reference: '',
    partner_one_name: '',
    partner_one_identifier: '',
    partner_two_name: '',
    partner_two_identifier: '',
    designated_partner_name: '',
    designated_partner_identifier: '',
    trustee_name: '',
    trustee_identifier: '',
    personal_representative_name: '',
    cooperative_subtype: 'PRIMARY_COOPERATIVE',
    area_of_operation: '',
    activity_sector: '',
    regulator_name: '',
    license_number: '',
    license_status: '',
    common_name: '',
    registration_status: 'UNKNOWN',
    constitution_reference: '',
    objectives: '',
    principal_office: '',
    litigation_authority_reference: '',
    nonprofit_form: 'PUBLIC_BENEFIT_ORGANIZATION',
    canonical_legal_form: '',
    pbo_or_ngo_status: '',
    operational_scope: '',
    funding_compliance_notes: '',
    trust_deed_date: '',
    purpose: '',
    principal_address: '',
    settlor_details: '',
    deceased_last_address: '',
    grant_type: '',
    grant_issue_date: '',
    grant_confirmation_date: '',
    grant_status: 'UNKNOWN',
    official_name: '',
    public_entity_subtype: 'OTHER_STATUTORY_BODY',
    enabling_instrument: '',
    parent_ministry_or_county: '',
    legal_capacity_notes: '',
    official_address: '',
    statutory_representative: '',
    organization_type: 'INTERGOVERNMENTAL',
    founding_instrument: '',
    headquarters_country: '',
    kenya_recognition_details: '',
    privileges_immunities_status: '',
    kenya_office_address: '',

    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    contact_role_or_designation: '',

    country: 'Kenya',
    county: '',
    county_or_region: '',
    city: '',
    city_or_town: '',
    street: '',
    street_or_locality: '',
    postal_code: '',
    full_address: '',
    address_description: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
      ...(name === 'identification_type'
        ? {
            identification_number: '',
            identification_expiry_date: '',
            national_id: '',
            passport_number: '',
            identification_country: nextValue === 'NATIONAL_ID' ? 'Kenya' : '',
          }
        : {}),
      ...(name === 'occupation_status' && nextValue !== 'EMPLOYED' ? { employer: '' } : {}),
      ...(name === 'occupation_status' && nextValue !== 'BUSINESS_OWNER' ? { business_name: '' } : {}),
    }));
    setFieldErrors((prev) => ({
      ...prev,
      [name]: undefined,
      ...(name === 'national_id' || name === 'passport_number'
        ? {
            identification: undefined,
            national_id: undefined,
            passport_number: undefined,
          }
        : {}),
      ...(name === 'identification_type'
        ? { identification_expiry_date: undefined, identification_country: undefined }
        : {}),
      ...(name === 'date_of_birth'
        ? { guardian_name: undefined, guardian_contact: undefined }
        : {}),
    }));
    setGeneralError('');
  };

  const normalizeUpper = (value) => (value || '').trim().toUpperCase();

  const isValidEmail = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const isValidUrl = (value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  const validateCompanyForm = () => {
    const errors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const incorporationDate = formData.incorporation_date
      ? new Date(`${formData.incorporation_date}T00:00:00`)
      : null;

    if (!formData.company_name.trim()) {
      errors.company_name = 'Company name is required.';
    }
    if (!formData.registration_number.trim()) {
      errors.registration_number = 'Registration number is required.';
    }
    if (!formData.company_registration_authority.trim()) errors.company_registration_authority = 'Registration authority is required.';
    if (!formData.incorporation_date) errors.incorporation_date = 'Registration date is required.';
    if (!formData.nature_of_business.trim()) errors.nature_of_business = 'Nature of business is required.';
    if (!formData.industry.trim()) errors.industry = 'Industry or sector is required.';
    if (!formData.registration_verified) errors.registration_verified = 'Verify the company registration.';
    if (!formData.registration_document_reference.trim()) errors.registration_document_reference = 'Registration evidence reference is required.';
    if (!formData.director_full_legal_name.trim()) errors.director_full_legal_name = 'Record at least one director.';
    if (!formData.director_identifier.trim()) errors.director_identifier = 'Director identification is required.';
    if (!formData.owner_full_legal_name.trim()) errors.owner_full_legal_name = 'Record a beneficial owner or controlling official.';
    if (!formData.owner_identifier.trim()) errors.owner_identifier = 'Beneficial-owner identification is required.';
    if (!formData.owner_evidence_reference.trim()) errors.owner_evidence_reference = 'Ownership evidence is required.';
    if (!formData.contact_full_name.trim()) errors.contact_full_name = 'An authorised representative is required.';
    if (!formData.contact_national_id_number.trim()) errors.contact_national_id_number = 'Representative identification is required.';
    if (!formData.contact_phone_number.trim() && !formData.phone_number.trim()) errors.contact_phone_number = 'Representative phone is required.';
    if (!formData.representative_authority_reference.trim()) errors.representative_authority_reference = 'Authority evidence is required.';
    if (!formData.representative_authority_verified) errors.representative_authority_verified = 'Verify the representative authority.';
    if (!formData.company_purpose_and_nature.trim()) errors.company_purpose_and_nature = 'Describe the legal service and purpose.';
    if (!formData.company_privacy_notice_acknowledged) errors.company_privacy_notice_acknowledged = 'Confirm privacy-notice acknowledgement.';
    if (!formData.client_instructions_confirmed) errors.client_instructions_confirmed = 'Confirm the company instructions.';
    if (formData.kra_pin && normalizeUpper(formData.kra_pin).length < 8) {
      errors.kra_pin = 'Enter a valid KRA PIN.';
    }
    if (incorporationDate && incorporationDate > today) {
      errors.incorporation_date = 'Incorporation date cannot be in the future.';
    }
    if (formData.director_count !== '' && Number(formData.director_count) < 0) {
      errors.director_count = 'Number of directors cannot be negative.';
    }
    if (formData.employee_count !== '' && Number(formData.employee_count) < 0) {
      errors.employee_count = 'Number of employees cannot be negative.';
    }
    if (!isValidEmail(formData.email)) {
      errors.email = 'Enter a valid company email.';
    }
    if (!isValidEmail(formData.contact_email)) {
      errors.contact_email = 'Enter a valid contact email.';
    }
    if (!isValidUrl(formData.website)) {
      errors.website = 'Enter a valid http or https URL.';
    }

    if (selectedEntityAccessType === 'PORTAL_ENABLED') {
      if (!formData.email.trim()) {
        errors.email = 'Company email is required for client portal access.';
      }
      if (!formData.phone_number.trim() && !formData.contact_phone_number.trim()) {
        errors.phone_number = 'Add a company phone or authorised contact phone.';
      }
      if (!formData.contact_full_name.trim()) {
        errors.contact_full_name = 'Authorised contact full name is required.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildPayload = () => {
    if (clientType === 'INDIVIDUAL') {
      return buildIndividualClientPayload(formData, selectedClientMode);
    }

    const isProspect =
      clientType === 'INDIVIDUAL'
        ? selectedClientMode === 'portal'
        : selectedEntityAccessType === 'PORTAL_ENABLED';
    const clean = (payload) =>
      Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== '' && value !== null),
      );

    const base = {
      email: isProspect
        ? formData.email ||
          formData.contact_email ||
          formData.contact_person_email
        : '',
      phone_number: isProspect
        ? formData.phone_number ||
          formData.contact_phone_number ||
          formData.contact_person_phone ||
          formData.primary_trustee_contact ||
          formData.executor_contact ||
          formData.administrator_contact ||
          formData.director_contact
        : formData.phone_number,
      access_type: isProspect ? 'PORTAL_ENABLED' : 'ASSISTED',
      country: formData.country,
      county: formData.county,
      city: formData.city,
      street: formData.street,
      postal_code: formData.postal_code,
      full_address: formData.full_address,
    };

    if (canonicalEntityTypes.includes(clientType)) {
      return buildLegalEntityClientPayload(formData, {
        client_type: clientType,
        clientType,
        requestedClientType,
        accessType: isProspect ? 'PORTAL_ENABLED' : 'ASSISTED',
      });
    }

    if (companyLikeClientTypes.includes(clientType)) {
      const portalEnabled = selectedEntityAccessType === 'PORTAL_ENABLED';
      return clean({
        ...base,
        access_type: portalEnabled ? 'PORTAL_ENABLED' : 'ASSISTED',
        legal_name: formData.company_name.trim(),
        company_name:
          formData.company_name.trim() ||
          `${requestedClientType.replace(/_/g, ' ')} Client`,
        trading_name: formData.trading_name.trim(),
        registration_number: normalizeUpper(formData.registration_number),
        kra_pin: normalizeUpper(formData.kra_pin),
        company_type: formData.company_type,
        incorporation_date: formData.incorporation_date || null,
        registration_date: formData.incorporation_date || null,
        country_of_incorporation: formData.country_of_incorporation || 'Kenya',
        country_of_registration: formData.country_of_incorporation || 'Kenya',
        registration_authority: formData.company_registration_authority,
        industry: formData.industry,
        nature_of_business: formData.nature_of_business,
        website: formData.website,
        company_status: formData.company_status,
        director_count: formData.director_count,
        employee_count: formData.employee_count,
        beneficial_ownership_declared: formData.beneficial_ownership_declared,
        beneficial_ownership_verified: formData.beneficial_ownership_verified,
        annual_returns_up_to_date: formData.annual_returns_up_to_date,
        compliance_notes: formData.compliance_notes,
        registration_verified: formData.registration_verified,
        registration_verification_source: formData.registration_verification_source,
        registration_document_reference: formData.registration_document_reference,
        onboarding_method: portalEnabled ? 'PORTAL' : formData.onboarding_method_company,
        preferred_contact_channel: portalEnabled ? 'EMAIL' : formData.preferred_contact_channel_company,
        privacy_notice_version: formData.company_privacy_notice_version,
        privacy_notice_delivery_method: portalEnabled ? 'PORTAL' : formData.company_privacy_notice_delivery_method,
        privacy_notice_acknowledged: formData.company_privacy_notice_acknowledged,
        personal_data_source: formData.company_personal_data_source,
        privacy_lawful_basis: formData.company_privacy_lawful_basis,
        purpose_and_nature_of_relationship: formData.company_purpose_and_nature,
        pep_status: formData.company_pep_status,
        sanctions_screening_status: formData.company_sanctions_status,
        risk_rating: formData.company_risk_rating,
        source_of_funds: formData.company_source_of_funds,
        source_of_wealth: formData.company_source_of_wealth,
        enhanced_due_diligence_required: formData.company_edd_required,
        enhanced_due_diligence_reason: formData.company_edd_reason,
        engagement_letter_status: 'PENDING',
        fee_agreement_status: 'PENDING',
        client_instructions_confirmed: formData.client_instructions_confirmed,
        directors: formData.director_full_legal_name ? [{
          full_legal_name: formData.director_full_legal_name,
          person_type: 'INDIVIDUAL',
          national_id_or_passport: formData.director_identifier,
          nationality: formData.director_nationality,
          role: 'DIRECTOR',
          is_active: true,
          authority_to_instruct: formData.director_authority_to_instruct,
          identity_verified: formData.director_identity_verified,
          verification_document_reference: formData.director_verification_reference,
        }] : [],
        beneficial_owners: formData.owner_full_legal_name ? [{
          full_legal_name: formData.owner_full_legal_name,
          person_type: 'INDIVIDUAL',
          national_id_or_passport: formData.owner_identifier,
          nationality: formData.owner_nationality,
          ownership_percentage: formData.owner_ownership_percentage,
          voting_rights_percentage: formData.owner_voting_percentage,
          control_method: formData.owner_control_method,
          identity_verified: formData.owner_identity_verified,
          ownership_evidence_reference: formData.owner_evidence_reference,
          pep_status: 'PENDING',
          sanctions_screening_status: 'PENDING',
        }] : [],
        authorised_representatives: [{
          full_legal_name: formData.contact_full_name,
          role_title: formData.contact_role_or_designation,
          national_id_or_passport: formData.contact_national_id_number,
          telephone: formData.contact_phone_number || formData.phone_number,
          ...(portalEnabled
            ? { email: formData.contact_email || formData.email }
            : {}),
          authority_type: formData.representative_authority_type,
          authority_document_reference: formData.representative_authority_reference,
          authority_verified: formData.representative_authority_verified,
          is_primary: true,
          is_portal_contact: portalEnabled,
        }],
        contact_full_name: formData.contact_full_name,
        contact_email: portalEnabled ? formData.contact_email : '',
        contact_phone_number: formData.contact_phone_number,
        contact_national_id_number: formData.contact_national_id_number,
        contact_role_or_designation: formData.contact_role_or_designation,
      });
    }

    if (clientType === 'PARTNERSHIP') {
      return clean({
        ...base,
        partnership_name: formData.partnership_name,
        registration_number: formData.registration_number,
        tax_pin: formData.tax_pin,
        formation_date: formData.formation_date || null,
        partner_count: formData.partner_count,
        agreement_type: formData.agreement_type,
      });
    }

    if (ngoLikeClientTypes.includes(clientType)) {
      return clean({
        ...base,
        ngo_name: formData.ngo_name || formData.company_name,
        registration_number: formData.registration_number,
        tax_pin: formData.tax_pin,
        registration_authority: formData.registration_authority,
        registration_date: formData.registration_date || null,
        sector: formData.sector,
        headquarters_address: formData.headquarters_address,
        operational_regions: formData.operational_regions,
        director_name: formData.director_name,
        director_contact: formData.director_contact,
        funding_sources: formData.funding_sources,
      });
    }

    if (clientType === 'TRUST') {
      return clean({
        ...base,
        trust_name: formData.trust_name,
        trust_type: formData.trust_type,
        trust_deed_reference: formData.trust_deed_reference,
        formation_date: formData.formation_date || null,
        jurisdiction: formData.jurisdiction,
        trustee_count: formData.trustee_count,
        primary_trustee_name: formData.primary_trustee_name,
        primary_trustee_contact: formData.primary_trustee_contact,
        beneficiary_details: formData.beneficiary_details,
        assets_under_trust: formData.assets_under_trust,
        legal_representative: formData.legal_representative,
      });
    }

    if (clientType === 'ESTATE') {
      return clean({
        ...base,
        estate_name: formData.estate_name,
        deceased_full_name: formData.deceased_full_name,
        deceased_id_number: formData.deceased_id_number,
        date_of_death: formData.date_of_death || null,
        probate_number: formData.probate_number,
        court_reference: formData.court_reference,
        executor_name: formData.executor_name,
        executor_contact: formData.executor_contact,
        administrator_name: formData.administrator_name,
        administrator_contact: formData.administrator_contact,
        estate_value_estimate: formData.estate_value_estimate,
        beneficiaries: formData.beneficiaries,
        assets_description: formData.assets_description,
        liabilities_description: formData.liabilities_description,
        court_status: formData.court_status,
      });
    }

    if (governmentLikeClientTypes.includes(clientType)) {
      return clean({
        ...base,
        government_entity_name:
          formData.government_entity_name || formData.company_name,
        department: formData.department,
        agency_code: formData.agency_code,
        registration_number: formData.registration_number,
        jurisdiction_level: formData.jurisdiction_level,
        contact_person_name: formData.contact_person_name,
        contact_person_position: formData.contact_person_position,
        contact_person_phone: formData.contact_person_phone,
        contact_person_email: formData.contact_person_email,
        office_address: formData.office_address,
        mandate_area: formData.mandate_area,
        legal_department_head: formData.legal_department_head,
        legal_department_contact: formData.legal_department_contact,
      });
    }

    return clean(base);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (clientType === 'COMPANY' && !validateCompanyForm()) {
      setGeneralError('Please fix the highlighted company details.');
      return;
    }

    if (clientType === 'INDIVIDUAL') {
      const validation = validateIndividualClientForm(formData, selectedClientMode);
      if (!validation.isValid) {
        setFieldErrors(validation.errors);
        setGeneralError('Please correct the highlighted individual details.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setFieldErrors({});
      setGeneralError('');

      const payload = buildPayload();
      const response = isSecretaryCreate
        ? await secretaryClientsService.createClient(payload, clientType)
        : await adminClientsService.createClient(payload, clientType);

      setSuccessData(response);
      return;
    } catch (error) {
      const data = error?.response?.data;
      const backendErrors = data?.errors || data || {};

      if (clientType === 'COMPANY' || clientType === 'INDIVIDUAL') {
        const nextFieldErrors = {};
        Object.entries(backendErrors).forEach(([field, errors]) => {
          if (['detail', 'message', 'non_field_errors'].includes(field)) return;
          nextFieldErrors[field] = Array.isArray(errors) ? errors.join(', ') : errors;
        });
        setFieldErrors(nextFieldErrors);
        setGeneralError(
          backendErrors.non_field_errors?.join?.(', ') ||
            data?.detail ||
            data?.message ||
            `Unable to create ${clientType === 'COMPANY' ? 'company' : 'individual'} client.`,
        );
        return;
      }

      let html = `<p>${data?.message ?? 'Unable to create client'}</p>`;

      if (data?.errors) {
        html += "<ul style='text-align:left;margin-top:10px'>";
        Object.entries(data.errors).forEach(([field, errors]) => {
          const message = Array.isArray(errors) ? errors.join(', ') : errors;
          html += `<li><b>${field}</b>: ${message}</li>`;
        });
        html += '</ul>';
      }

      Swal.fire({
        icon: 'error',
        title: 'Creation Failed',
        html,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isIndividual = clientType === 'INDIVIDUAL';
  const isCompanyClient = clientType === 'COMPANY';
  const isCompany = companyLikeClientTypes.includes(clientType);
  const usesCanonicalEntityForm = canonicalEntityTypes.includes(clientType);
  const isPartnership = !usesCanonicalEntityForm && clientType === 'PARTNERSHIP';
  const isNGO = !usesCanonicalEntityForm && ngoLikeClientTypes.includes(clientType);
  const isTrust = !usesCanonicalEntityForm && clientType === 'TRUST';
  const isEstate = !usesCanonicalEntityForm && clientType === 'ESTATE';
  const isGovernment = !usesCanonicalEntityForm && governmentLikeClientTypes.includes(clientType);
  const isProspect =
    clientType === 'INDIVIDUAL'
      ? selectedClientMode === 'portal'
      : selectedEntityAccessType === 'PORTAL_ENABLED';
  const isAssistedIndividual = isIndividual && !isProspect;
  const isMinorIndividual = isIndividual && isMinorIndividualClient(formData.date_of_birth);
  const individualSubtitle = isIndividual
    ? `Individual Client / ${selectedClientMode === 'portal' ? 'Portal Access' : 'Fully Assisted'}`
    : `${requestedClientType} / ${isProspect ? 'prospect' : 'assisted'}`;
  const successPayload = successData?.data || successData;
  const createdClientResponse = successPayload?.client;
  const createdClient = createdClientResponse?.detail
    ? {
        ...createdClientResponse.detail,
        id: createdClientResponse.id || createdClientResponse.detail.id,
        full_name:
          createdClientResponse.full_name ||
          createdClientResponse.detail.full_name,
      }
    : createdClientResponse;
  const createdProfile = successPayload?.profile;
  const createdPortalUser = successPayload?.portal_user;
  const createdTempPassword = successPayload?.temp_password;
  const createdClientId = createdClient?.id;
  const clientsPath = isSecretaryCreate ? '/secretary/clients' : '/admin/clients';
  const createMatterPath = createdClientId ? `/admin/clients/${createdClientId}/conflict-checks/new` : '/admin/clients';
  const createdClientTypeLabel = (createdClient?.client_type || clientType || requestedClientType)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const createdClientName =
    createdClient?.full_name ||
    createdProfile?.company_name ||
    createdProfile?.legal_name ||
    createdProfile?.registered_name ||
    createdProfile?.registered_business_name ||
    createdProfile?.partnership_name ||
    createdProfile?.trust_name ||
    createdProfile?.estate_name ||
    createdProfile?.official_name ||
    'Not recorded';
  const createdPortalAccess = Boolean(
    createdTempPassword ||
      createdPortalUser ||
      createdClient?.portal_access_exists ||
      createdClient?.user,
  );
  const createdPortalLoginEmail =
    createdClient?.portal_login_email ||
    createdPortalUser?.email ||
    (createdPortalAccess ? createdClient?.email : '') ||
    '';
  const createdPrimaryReference =
    createdProfile?.registration_number ||
    createdProfile?.business_registration_number ||
    createdProfile?.llp_registration_number ||
    createdClient?.national_id ||
    createdClient?.passport_number ||
    createdClient?.kra_pin ||
    '';

  const resetCompanyForm = () => {
    setSuccessData(null);
    setFieldErrors({});
    setGeneralError('');
    setSelectedEntityAccessType(
      clientMode === 'assisted' ? 'ASSISTED' : 'PORTAL_ENABLED',
    );
    setFormData((prev) => ({
      ...prev,
      email: '',
      phone_number: '',
      company_name: '',
      trading_name: '',
      registration_number: '',
      kra_pin: '',
      company_type: 'PRIVATE_LIMITED_COMPANY',
      incorporation_date: '',
      country_of_incorporation: 'Kenya',
      industry: '',
      nature_of_business: '',
      website: '',
      company_status: 'ACTIVE',
      registration_document_reference: '',
      registration_verification_source: 'BRS_ECITIZEN',
      onboarding_method_company: 'STAFF_ASSISTED',
      preferred_contact_channel_company: 'PHONE',
      company_privacy_notice_version: INDIVIDUAL_PRIVACY_NOTICE_VERSION,
      company_privacy_notice_delivery_method: 'PAPER',
      company_personal_data_source: 'AUTHORISED_REPRESENTATIVE',
      company_privacy_lawful_basis: 'LEGAL_SERVICE_AND_CONTRACT',
      company_pep_status: 'PENDING',
      company_sanctions_status: 'PENDING',
      company_risk_rating: 'NOT_ASSESSED',
      company_source_of_funds: '',
      company_source_of_wealth: '',
      director_count: '',
      employee_count: '',
      beneficial_ownership_declared: false,
      registration_verified: false,
      beneficial_ownership_verified: false,
      annual_returns_up_to_date: false,
      compliance_notes: '',
      director_full_legal_name: '',
      director_identifier: '',
      director_nationality: 'Kenyan',
      director_verification_reference: '',
      director_identity_verified: false,
      director_authority_to_instruct: false,
      owner_full_legal_name: '',
      owner_identifier: '',
      owner_nationality: 'Kenyan',
      owner_ownership_percentage: '',
      owner_voting_percentage: '',
      owner_control_method: 'SHAREHOLDING',
      owner_identity_verified: false,
      owner_evidence_reference: '',
      representative_authority_type: 'BOARD_RESOLUTION',
      representative_authority_reference: '',
      representative_authority_verified: false,
      company_purpose_and_nature: '',
      company_privacy_notice_acknowledged: false,
      client_instructions_confirmed: false,
      company_edd_required: false,
      company_edd_reason: '',
      partnership_name: '',
      tax_pin: '',
      formation_date: '',
      partner_count: '',
      agreement_type: '',
      ngo_name: '',
      registration_authority: '',
      company_registration_authority: 'Business Registration Service',
      registration_date: '',
      sector: '',
      headquarters_address: '',
      operational_regions: '',
      director_name: '',
      director_contact: '',
      funding_sources: '',
      trust_name: '',
      trust_type: '',
      trust_deed_reference: '',
      jurisdiction: '',
      trustee_count: '',
      primary_trustee_name: '',
      primary_trustee_contact: '',
      beneficiary_details: '',
      assets_under_trust: '',
      legal_representative: '',
      estate_name: '',
      deceased_full_name: '',
      deceased_id_number: '',
      date_of_death: '',
      probate_number: '',
      court_reference: '',
      executor_name: '',
      executor_contact: '',
      administrator_name: '',
      administrator_contact: '',
      estate_value_estimate: '',
      beneficiaries: '',
      assets_description: '',
      liabilities_description: '',
      court_status: '',
      government_entity_name: '',
      department: '',
      agency_code: '',
      jurisdiction_level: '',
      contact_person_name: '',
      contact_person_position: '',
      contact_person_phone: '',
      contact_person_email: '',
      office_address: '',
      mandate_area: '',
      legal_department_head: '',
      legal_department_contact: '',
      legal_name: '',
      registered_business_name: '',
      business_registration_number: '',
      proprietor_name: '',
      proprietor_identifier: '',
      proprietor_kra_pin: '',
      business_kra_pin: '',
      subtype: 'GENERAL_PARTNERSHIP',
      registered_name: '',
      llp_registration_number: '',
      registered_office: '',
      principal_business_address: '',
      principal_place_of_business: '',
      partnership_agreement_reference: '',
      partner_one_name: '',
      partner_one_identifier: '',
      partner_two_name: '',
      partner_two_identifier: '',
      designated_partner_name: '',
      designated_partner_identifier: '',
      trustee_name: '',
      trustee_identifier: '',
      personal_representative_name: '',
      cooperative_subtype: 'PRIMARY_COOPERATIVE',
      area_of_operation: '',
      activity_sector: '',
      regulator_name: '',
      license_number: '',
      license_status: '',
      common_name: '',
      registration_status: 'UNKNOWN',
      constitution_reference: '',
      objectives: '',
      principal_office: '',
      litigation_authority_reference: '',
      nonprofit_form: 'PUBLIC_BENEFIT_ORGANIZATION',
      canonical_legal_form: '',
      pbo_or_ngo_status: '',
      operational_scope: '',
      funding_compliance_notes: '',
      trust_deed_date: '',
      purpose: '',
      principal_address: '',
      settlor_details: '',
      deceased_last_address: '',
      grant_type: '',
      grant_issue_date: '',
      grant_confirmation_date: '',
      grant_status: 'UNKNOWN',
      official_name: '',
      public_entity_subtype: 'OTHER_STATUTORY_BODY',
      enabling_instrument: '',
      parent_ministry_or_county: '',
      legal_capacity_notes: '',
      official_address: '',
      statutory_representative: '',
      organization_type: 'INTERGOVERNMENTAL',
      founding_instrument: '',
      headquarters_country: '',
      kenya_recognition_details: '',
      privileges_immunities_status: '',
      kenya_office_address: '',
      contact_full_name: '',
      contact_email: '',
      contact_phone_number: '',
      contact_national_id_number: '',
      contact_role_or_designation: '',
      country: 'Kenya',
      county: '',
      city: '',
      street: '',
      postal_code: '',
      full_address: '',
    address_description: '',
    }));
  };

  const resetIndividualForm = () => {
    setSuccessData(null);
    setFieldErrors({});
    setGeneralError('');
    setSelectedClientMode('portal');
    setFormData((prev) => ({
      ...prev,
      email: '',
      phone_number: '',
      full_name: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      preferred_name: '',
      onboarding_method: 'STAFF_ASSISTED',
      identification_type: 'NATIONAL_ID',
      identification_number: '',
      identification_country: 'Kenya',
      identification_expiry_date: '',
      identification_document_reference: '',
      identification_verified: false,
      verification_method: '',
      verification_notes: '',
      national_id: '',
      passport_number: '',
      date_of_birth: '',
      gender: '',
      occupation_status: '',
      occupation: '',
      employer: '',
      business_name: '',
      marital_status: '',
      nationality: '',
      citizenship: 'Kenya',
      county_of_residence: '',
      physical_address: '',
      postal_address: '',
      preferred_language: 'English',
      preferred_contact_channel: '',
      disability_or_accessibility_notes: '',
      next_of_kin_name: '',
      next_of_kin_relationship: '',
      next_of_kin_phone: '',
      next_of_kin_email: '',
      next_of_kin_identification_number: '',
      next_of_kin_national_id: '',
      next_of_kin_address: '',
      next_of_kin_physical_address: '',
      guardian_name: '',
      guardian_relationship: '',
      guardian_phone: '',
      guardian_email: '',
      privacy_notice_version: INDIVIDUAL_PRIVACY_NOTICE_VERSION,
      privacy_notice_delivery_method: 'PORTAL',
      privacy_notice_acknowledged: false,
      privacy_acknowledgement_reference: '',
      privacy_lawful_basis: 'CONTRACT_AND_LEGAL_OBLIGATION',
      privacy_data_sharing_explanation: 'Courts, tribunals, opposing counsel and authorised service providers where necessary for the legal service.',
      privacy_retention_category: 'CLIENT_AND_MATTER_RECORD',
      personal_data_source: '',
      acting_for_self: true,
      represented_person: '',
      representation_capacity: '',
      authority_document_reference: '',
      authority_verified: false,
      purpose_and_nature_of_relationship: '',
      pep_status: 'PENDING',
      pep_details: '',
      sanctions_screening_status: 'PENDING',
      screening_date: '',
      screening_method: '',
      screening_result: '',
      risk_rating: 'NOT_ASSESSED',
      risk_assessment_reason: '',
      source_of_funds: '',
      source_of_wealth: '',
      enhanced_due_diligence_required: false,
      enhanced_due_diligence_reason: '',
      next_review_date: '',
      notes: '',
      country: 'Kenya',
      county: '',
      county_or_region: '',
      city: '',
      city_or_town: '',
      street: '',
      street_or_locality: '',
      postal_code: '',
      full_address: '',
      address_description: '',
    }));
  };

  const copyTempPassword = async () => {
    if (!createdTempPassword) return;
    await navigator.clipboard.writeText(createdTempPassword);
  };

  const resetCurrentForm = isIndividual ? resetIndividualForm : resetCompanyForm;
  const successTitle = isIndividual
    ? 'Individual client created successfully'
    : `${createdClientTypeLabel} client created successfully`;
  const successDescription = createdTempPassword
    ? 'A portal login was created. The temporary password is shown once.'
    : 'This client is staff-assisted and has no portal login.';
  const successFields = isIndividual
    ? [
        { label: 'Client name', value: createdClient?.full_name },
        { label: 'Client ID', value: createdClient?.id },
        { label: 'Access type', value: createdClient?.access_type },
        { label: 'Lifecycle status', value: createdClient?.lifecycle_status },
        { label: 'National ID', value: createdClient?.national_id || 'Not recorded' },
        { label: 'Passport', value: createdClient?.passport_number || 'Not recorded' },
        { label: 'Phone', value: createdClient?.phone_number || 'Not recorded' },
        ...(createdPortalAccess
          ? [{ label: 'Email', value: createdClient?.email }]
          : []),
        { label: 'Portal access', value: createdPortalAccess ? 'Created' : 'Not created' },
        ...(createdPortalAccess
          ? [{ label: 'Portal login email', value: createdPortalLoginEmail }]
          : []),
      ]
    : [
        { label: 'Client name', value: createdClientName },
        { label: 'Client ID', value: createdClient?.id },
        { label: 'Client type', value: createdClientTypeLabel },
        { label: 'Access type', value: createdClient?.access_type },
        { label: 'Lifecycle status', value: createdClient?.lifecycle_status },
        ...(createdPrimaryReference
          ? [{ label: 'Reference', value: createdPrimaryReference }]
          : []),
        { label: 'Phone', value: createdClient?.phone_number || 'Not recorded' },
        ...(createdPortalAccess
          ? [{ label: 'Email', value: createdClient?.email }]
          : []),
        { label: 'Portal access', value: createdPortalAccess ? 'Created' : 'Not created' },
        ...(createdPortalAccess
          ? [{ label: 'Portal login email', value: createdPortalLoginEmail }]
          : []),
      ];

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <SectionHeading
        title='Create Client'
        subtitle={individualSubtitle}
      />

      {successData && (
        <ClientCreationSuccessPanel
          title={successTitle}
          description={successDescription}
          fields={successFields}
          tempPassword={createdTempPassword}
          viewLabel={isIndividual ? 'View individual client' : 'View client'}
          onView={() => navigate(`${isSecretaryCreate ? '/secretary' : '/admin'}/clients/${createdClient?.id}`)}
          onCreateMatter={isSecretaryCreate ? null : () => navigate(createMatterPath)}
          onCreateAnother={resetCurrentForm}
          onReturnToClients={() => navigate(clientsPath)}
          onCopyPassword={copyTempPassword}
        />
      )}

		      {!successData && (
      <Card className='p-6'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          {generalError && (
            <div className='rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200'>
              {generalError}
            </div>
          )}
	          {isIndividual && (
	            <section className='space-y-4'>
	              <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
	                Access type
	              </h3>
	              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
	                {[
	                  {
	                    value: 'portal',
	                    title: 'Portal access',
	                    description: 'For a client who can use email and the online portal. Creates secure login credentials.',
	                  },
	                  {
	                    value: 'assisted',
	                    title: 'Fully assisted',
	                    description: 'For a client served in person or by phone. No email, login or digital access is requested.',
	                  },
	                ].map((option) => (
	                  <button
	                    key={option.value}
	                    type='button'
	                    onClick={() => {
	                      setSelectedClientMode(option.value);
	                      setFormData((current) => ({
	                        ...current,
	                        email: option.value === 'assisted' ? '' : current.email,
	                        guardian_email: option.value === 'assisted' ? '' : current.guardian_email,
	                        next_of_kin_email: option.value === 'assisted' ? '' : current.next_of_kin_email,
	                        preferred_contact_channel: option.value === 'assisted' ? 'IN_PERSON' : '',
	                        onboarding_method: option.value === 'assisted' ? 'IN_PERSON' : 'STAFF_ASSISTED',
	                        privacy_notice_delivery_method: option.value === 'assisted' ? 'VERBAL' : 'PORTAL',
	                        privacy_notice_acknowledged: false,
	                      }));
	                      setFieldErrors({});
	                      setGeneralError('');
	                    }}
	                    className={`rounded-xl border p-4 text-left transition ${
	                      selectedClientMode === option.value
	                        ? 'border-blue-600 bg-blue-50 text-blue-950 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-100'
	                        : 'border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)]'
	                    }`}
	                  >
	                    <span className='block font-semibold'>{option.title}</span>
	                    <span className='mt-1 block text-sm'>{option.description}</span>
	                  </button>
	                ))}
	              </div>
	              {isProspect ? (
	                <div className='rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100'>
	                  Portal access creates a login account and temporary password.
	                </div>
	              ) : (
	                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 dark:border-[color:var(--border)] dark:bg-[color:var(--surface-raised)] dark:text-[color:var(--text-primary)]'>
	                  Fully assisted does not create a login account. The firm manages the client information.
	                </div>
	              )}
	              <Select3D
	                label='Client Onboarding Method'
	                name='onboarding_method'
	                value={formData.onboarding_method}
	                onChange={handleChange}
	                error={fieldErrors.onboarding_method}
	                required
	                options={isProspect ? [
	                  { value: 'STAFF_ASSISTED', label: 'Staff assisted portal setup' },
	                ] : [
	                  { value: 'IN_PERSON', label: 'In person' },
	                  { value: 'PHONE', label: 'By phone' },
	                  { value: 'STAFF_ASSISTED', label: 'Other staff-assisted intake' },
	                ]}
	              />
	            </section>
	          )}

          {!isCompanyClient && !isIndividual && !isAssistedIndividual && (
            <section className='space-y-4'>
              <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                Access type
              </h3>
              <Select3D
                label='Client Access'
                name='entity_access_type'
                value={selectedEntityAccessType}
                onChange={(event) => {
                  const accessType = event.target.value;
                  setSelectedEntityAccessType(accessType);
                  if (accessType === 'ASSISTED') {
                    setFormData((current) => ({
                      ...current,
                      email: '',
                      contact_email: '',
                      contact_person_email: '',
                    }));
                  }
                  setGeneralError('');
                }}
                options={[
                  { value: 'ASSISTED', label: 'Firm-managed client' },
                  { value: 'PORTAL_ENABLED', label: 'Client portal access' },
                ]}
              />
              {isProspect ? (
                <div className='rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100'>
                  Portal access creates login credentials for an authorized human contact.
                </div>
              ) : (
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 dark:border-[color:var(--border)] dark:bg-[color:var(--surface-raised)] dark:text-[color:var(--text-primary)]'>
                  No portal account or email credentials will be created. The firm manages contact by phone or in person.
                </div>
              )}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {isProspect && (
                  <FloatingInput
                    label='Portal Login Email'
                    name='email'
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                )}

                <FloatingInput
                  label={isProspect ? 'Portal Contact Phone Number' : 'Contact Phone Number'}
                  name='phone_number'
                  value={formData.phone_number}
                  onChange={handleChange}
                  required={isProspect}
                />
              </div>
            </section>
          )}

          {canonicalEntityTypes.includes(clientType) && (
            <section className='space-y-5'>
              <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                Legal identity and authority
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <FloatingInput
                  label='Legal / Registered Name'
                  name='legal_name'
                  value={formData.legal_name}
                  onChange={handleChange}
                />
                <FloatingInput
                  label='Registration Number'
                  name='registration_number'
                  value={formData.registration_number}
                  onChange={handleChange}
                />
                <FloatingInput
                  label='KRA PIN'
                  name='kra_pin'
                  value={formData.kra_pin}
                  onChange={handleChange}
                />
                <FloatingInput
                  label='Registration Date'
                  name='registration_date'
                  type='date'
                  value={formData.registration_date}
                  onChange={handleChange}
                  noFloat
                />
                <FloatingInput
                  label='Registration Authority'
                  name='registration_authority'
                  value={formData.registration_authority}
                  onChange={handleChange}
                />
                <FloatingInput
                  label='Sector / Purpose'
                  name='sector'
                  value={formData.sector}
                  onChange={handleChange}
                />
              </div>

              {clientType === 'SOLE_PROPRIETORSHIP' && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Registered Business Name' name='registered_business_name' value={formData.registered_business_name} onChange={handleChange} required />
                  <FloatingInput label='Proprietor Full Legal Name' name='proprietor_name' value={formData.proprietor_name} onChange={handleChange} required />
                  <FloatingInput label='Proprietor ID / Passport' name='proprietor_identifier' value={formData.proprietor_identifier} onChange={handleChange} required />
                  <FloatingInput label='Business KRA PIN' name='business_kra_pin' value={formData.business_kra_pin} onChange={handleChange} />
                </div>
              )}

              {clientType === 'PARTNERSHIP' && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Partnership Name' name='partnership_name' value={formData.partnership_name} onChange={handleChange} required />
                  <Select3D label='Partnership Type' name='subtype' value={formData.subtype} onChange={handleChange} options={[
                    { value: 'GENERAL_PARTNERSHIP', label: 'General Partnership' },
                    { value: 'LIMITED_PARTNERSHIP', label: 'Limited Partnership' },
                    { value: 'FOREIGN_PARTNERSHIP', label: 'Foreign Partnership' },
                  ]} />
                  <FloatingInput label='Partner 1 Legal Name' name='partner_one_name' value={formData.partner_one_name} onChange={handleChange} required />
                  <FloatingInput label='Partner 1 ID / Passport' name='partner_one_identifier' value={formData.partner_one_identifier} onChange={handleChange} required />
                  <FloatingInput label='Partner 2 Legal Name' name='partner_two_name' value={formData.partner_two_name} onChange={handleChange} required />
                  <FloatingInput label='Partner 2 ID / Passport' name='partner_two_identifier' value={formData.partner_two_identifier} onChange={handleChange} required />
                  <FloatingInput label='Partnership Agreement Reference' name='partnership_agreement_reference' value={formData.partnership_agreement_reference} onChange={handleChange} />
                  <FloatingInput label='Principal Place of Business' name='principal_place_of_business' value={formData.principal_place_of_business} onChange={handleChange} />
                </div>
              )}

              {clientType === 'LIMITED_LIABILITY_PARTNERSHIP' && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Registered LLP Name' name='registered_name' value={formData.registered_name} onChange={handleChange} required />
                  <FloatingInput label='LLP Registration Number' name='llp_registration_number' value={formData.llp_registration_number} onChange={handleChange} required />
                  <FloatingInput label='Designated Partner Legal Name' name='designated_partner_name' value={formData.designated_partner_name} onChange={handleChange} required />
                  <FloatingInput label='Designated Partner ID / Passport' name='designated_partner_identifier' value={formData.designated_partner_identifier} onChange={handleChange} required />
                  <FloatingInput label='Second Partner Legal Name' name='partner_two_name' value={formData.partner_two_name} onChange={handleChange} required />
                  <FloatingInput label='Second Partner ID / Passport' name='partner_two_identifier' value={formData.partner_two_identifier} onChange={handleChange} required />
                  <FloatingInput label='Registered Office' name='registered_office' value={formData.registered_office} onChange={handleChange} />
                  <FloatingInput label='Principal Business Address' name='principal_business_address' value={formData.principal_business_address} onChange={handleChange} />
                </div>
              )}

              {clientType === 'COOPERATIVE' && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Registered Cooperative Name' name='registered_name' value={formData.registered_name} onChange={handleChange} required />
                  <Select3D label='Cooperative Subtype' name='cooperative_subtype' value={requestedClientType === 'SACCO' ? 'SACCO' : formData.cooperative_subtype} onChange={handleChange} options={[
                    { value: 'PRIMARY_COOPERATIVE', label: 'Primary Co-operative' },
                    { value: 'COOPERATIVE_UNION', label: 'Co-operative Union' },
                    { value: 'APEX_COOPERATIVE', label: 'Apex Co-operative' },
                    { value: 'SACCO', label: 'SACCO' },
                    { value: 'OTHER_COOPERATIVE', label: 'Other Co-operative' },
                  ]} />
                  <FloatingInput label='Area of Operation' name='area_of_operation' value={formData.area_of_operation} onChange={handleChange} />
                  <FloatingInput label='Regulator / License Status' name='license_status' value={formData.license_status} onChange={handleChange} />
                </div>
              )}

              {clientType === 'SOCIETY_OR_ASSOCIATION' && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Society / Association Legal Name' name='legal_name' value={formData.legal_name} onChange={handleChange} required />
                  <Select3D label='Registration Status' name='registration_status' value={formData.registration_status} onChange={handleChange} options={[
                    { value: 'REGISTERED', label: 'Registered' },
                    { value: 'UNREGISTERED', label: 'Unregistered' },
                    { value: 'EXEMPTED', label: 'Exempted' },
                    { value: 'UNKNOWN', label: 'Unknown' },
                  ]} />
                  <FloatingInput label='Constitution Reference' name='constitution_reference' value={formData.constitution_reference} onChange={handleChange} />
                  <FloatingInput label='Litigation Authority Reference' name='litigation_authority_reference' value={formData.litigation_authority_reference} onChange={handleChange} />
                </div>
              )}

              {clientType === 'NON_PROFIT_ORGANIZATION' && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Registered Non-Profit Name' name='registered_name' value={formData.registered_name} onChange={handleChange} required />
                  <Select3D label='Non-Profit Form' name='nonprofit_form' value={formData.nonprofit_form} onChange={handleChange} options={[
                    { value: 'PUBLIC_BENEFIT_ORGANIZATION', label: 'Public Benefit Organization' },
                    { value: 'LEGACY_NGO_OR_TRANSITIONAL', label: 'Legacy NGO / Transitional' },
                    { value: 'COMPANY_LIMITED_BY_GUARANTEE', label: 'Company Limited by Guarantee' },
                    { value: 'CHARITABLE_TRUST', label: 'Charitable Trust' },
                    { value: 'SOCIETY', label: 'Society' },
                    { value: 'FAITH_BASED_ORGANIZATION', label: 'Faith Based Organization' },
                    { value: 'OTHER_NON_PROFIT', label: 'Other Non-Profit' },
                  ]} />
                  <FloatingInput label='PBO / NGO Status' name='pbo_or_ngo_status' value={formData.pbo_or_ngo_status} onChange={handleChange} />
                  <FloatingInput label='Objectives' name='objectives' value={formData.objectives} onChange={handleChange} />
                </div>
              )}

              {clientType === 'TRUST' && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Trust Name' name='trust_name' value={formData.trust_name} onChange={handleChange} required />
                  <Select3D label='Trust Type' name='trust_type' value={formData.trust_type} onChange={handleChange} options={[
                    { value: 'PRIVATE_TRUST', label: 'Private Trust' },
                    { value: 'CHARITABLE_TRUST', label: 'Charitable Trust' },
                    { value: 'INCORPORATED_TRUSTEES', label: 'Incorporated Trustees' },
                    { value: 'PUBLIC_TRUST', label: 'Public Trust' },
                    { value: 'OTHER', label: 'Other' },
                  ]} />
                  <FloatingInput label='Trustee Legal Name' name='trustee_name' value={formData.trustee_name} onChange={handleChange} required />
                  <FloatingInput label='Trustee ID / Passport' name='trustee_identifier' value={formData.trustee_identifier} onChange={handleChange} required />
                  <FloatingInput label='Trust Deed Reference' name='trust_deed_reference' value={formData.trust_deed_reference} onChange={handleChange} />
                </div>
              )}

              {clientType === 'ESTATE' && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Estate Display Name' name='estate_name' value={formData.estate_name} onChange={handleChange} required />
                  <FloatingInput label='Deceased Full Name' name='deceased_full_name' value={formData.deceased_full_name} onChange={handleChange} required />
                  <FloatingInput label='Date of Death' name='date_of_death' type='date' value={formData.date_of_death} onChange={handleChange} noFloat />
                  <FloatingInput label='Executor / Administrator Name' name='personal_representative_name' value={formData.personal_representative_name} onChange={handleChange} />
                  <FloatingInput label='Succession Cause / Probate Number' name='probate_number' value={formData.probate_number} onChange={handleChange} />
                </div>
              )}

              {clientType === 'PUBLIC_ENTITY' && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Official Name' name='official_name' value={formData.official_name} onChange={handleChange} required />
                  <Select3D label='Public Entity Type' name='public_entity_subtype' value={formData.public_entity_subtype} onChange={handleChange} options={[
                    { value: 'NATIONAL_GOVERNMENT', label: 'National Government' },
                    { value: 'COUNTY_GOVERNMENT', label: 'County Government' },
                    { value: 'MINISTRY_OR_DEPARTMENT', label: 'Ministry or Department' },
                    { value: 'CONSTITUTIONAL_COMMISSION', label: 'Constitutional Commission' },
                    { value: 'INDEPENDENT_OFFICE', label: 'Independent Office' },
                    { value: 'STATE_CORPORATION', label: 'State Corporation' },
                    { value: 'COUNTY_ENTITY', label: 'County Entity' },
                    { value: 'PUBLIC_UNIVERSITY', label: 'Public University' },
                    { value: 'OTHER_STATUTORY_BODY', label: 'Other Statutory Body' },
                  ]} />
                  <FloatingInput label='Enabling Instrument' name='enabling_instrument' value={formData.enabling_instrument} onChange={handleChange} />
                  <FloatingInput label='Authorized Public Officer' name='statutory_representative' value={formData.statutory_representative} onChange={handleChange} />
                </div>
              )}

              {clientType === 'INTERNATIONAL_ORGANIZATION' && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Official Name' name='official_name' value={formData.official_name} onChange={handleChange} required />
                  <Select3D label='Organization Type' name='organization_type' value={formData.organization_type} onChange={handleChange} options={[
                    { value: 'INTERGOVERNMENTAL', label: 'Intergovernmental Organization' },
                    { value: 'TREATY_BODY', label: 'Treaty Body' },
                    { value: 'DIPLOMATIC_OR_MISSION_ENTITY', label: 'Diplomatic or Mission Entity' },
                    { value: 'OTHER', label: 'Other' },
                  ]} />
                  <FloatingInput label='Founding Instrument' name='founding_instrument' value={formData.founding_instrument} onChange={handleChange} />
                  <FloatingInput label='Kenya Recognition / Host Details' name='kenya_recognition_details' value={formData.kenya_recognition_details} onChange={handleChange} />
                </div>
              )}

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <FloatingInput label='Authorized Contact Full Name' name='contact_full_name' value={formData.contact_full_name} onChange={handleChange} required={isProspect} />
                <FloatingInput label='Authorized Contact Role / Title' name='contact_role_or_designation' value={formData.contact_role_or_designation} onChange={handleChange} />
                {isProspect && (
                  <FloatingInput
                    label='Authorized Contact Email (optional if login email is above)'
                    name='contact_email'
                    value={formData.contact_email}
                    onChange={handleChange}
                  />
                )}
                <FloatingInput label='Authorized Contact Phone' name='contact_phone_number' value={formData.contact_phone_number} onChange={handleChange} />
              </div>
            </section>
          )}

          {isCompany && !isCompanyClient && (
            <>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput
                label={requestedClientType === 'COMPANY' ? 'Company Name' : 'Entity Name'}
                name='company_name'
                value={formData.company_name}
                onChange={handleChange}
                  required
                />

                <FloatingInput
                  label='Registration Number'
                  name='registration_number'
                  value={formData.registration_number}
                  onChange={handleChange}
                  required
                />
              </div>

              <FloatingInput
                label='Incorporation Date'
                name='incorporation_date'
                type='date'
                value={formData.incorporation_date}
                onChange={handleChange}
              />

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <FloatingInput
                  label='Country of Incorporation'
                  name='country_of_incorporation'
                  value={formData.country_of_incorporation}
                  onChange={handleChange}
                />

                <FloatingInput
                  label='Industry / Sector'
                  name='industry'
                  value={formData.industry}
                  onChange={handleChange}
                />

                <FloatingInput
                  label='Director / Committee Count'
                  name='director_count'
                  type='number'
                  value={formData.director_count}
                  onChange={handleChange}
                />
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <FloatingInput
                  label='Contact Full Name'
                  name='contact_full_name'
                  value={formData.contact_full_name}
                  onChange={handleChange}
                  required
                />

                <FloatingInput
                  label='Contact Email'
                  name='contact_email'
                  value={formData.contact_email}
                  onChange={handleChange}
                  required
                />

                <FloatingInput
                  label='Contact Phone'
                  name='contact_phone_number'
                  value={formData.contact_phone_number}
                  onChange={handleChange}
                />

                <FloatingInput
                  label='Contact National ID'
                  name='contact_national_id_number'
                  value={formData.contact_national_id_number}
                  onChange={handleChange}
                  required
                />

                <FloatingInput
                  label='Contact Role'
                  name='contact_role_or_designation'
                  value={formData.contact_role_or_designation}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {isPartnership && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput
                label='Partnership Name'
                name='partnership_name'
                value={formData.partnership_name}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label='Registration Number'
                name='registration_number'
                value={formData.registration_number}
                onChange={handleChange}
              />

              <FloatingInput
                label='Tax PIN'
                name='tax_pin'
                value={formData.tax_pin}
                onChange={handleChange}
              />

              <FloatingInput
                label='Formation Date'
                name='formation_date'
                type='date'
                value={formData.formation_date}
                onChange={handleChange}
              />

              <FloatingInput
                label='Partner Count'
                name='partner_count'
                type='number'
                value={formData.partner_count}
                onChange={handleChange}
              />

              <Select3D
                label='Agreement Type'
                name='agreement_type'
                value={formData.agreement_type}
                onChange={handleChange}
                options={partnershipAgreementTypes}
              />
            </div>
          )}

          {isNGO && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput
                label={
                  clientType === 'RELIGIOUS_ORGANIZATION'
                    ? 'Religious Organization Name'
                    : clientType === 'NGO_ASSOCIATION'
                      ? 'Association Name'
                      : 'Organization Name'
                }
                name='ngo_name'
                value={formData.ngo_name}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label={
                  clientType === 'RELIGIOUS_ORGANIZATION'
                    ? 'Registration / Faith Body Number'
                    : 'Registration Number'
                }
                name='registration_number'
                value={formData.registration_number}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label='Tax PIN'
                name='tax_pin'
                value={formData.tax_pin}
                onChange={handleChange}
              />

              <FloatingInput
                label='Registration Authority'
                name='registration_authority'
                value={formData.registration_authority}
                onChange={handleChange}
              />

              <FloatingInput
                label='Registration Date'
                name='registration_date'
                type='date'
                value={formData.registration_date}
                onChange={handleChange}
              />

              <FloatingInput
                label='Sector'
                name='sector'
                value={formData.sector}
                onChange={handleChange}
              />

              <FloatingInput
                label={
                  clientType === 'RELIGIOUS_ORGANIZATION'
                    ? 'Leader / Clergy Name'
                    : 'Director Name'
                }
                name='director_name'
                value={formData.director_name}
                onChange={handleChange}
              />

              <FloatingInput
                label={
                  clientType === 'RELIGIOUS_ORGANIZATION'
                    ? 'Leader / Clergy Contact'
                    : 'Director Contact'
                }
                name='director_contact'
                value={formData.director_contact}
                onChange={handleChange}
              />

              <FloatingInput
                label='Headquarters Address'
                name='headquarters_address'
                value={formData.headquarters_address}
                onChange={handleChange}
              />

              <FloatingInput
                label='Operational Regions'
                name='operational_regions'
                value={formData.operational_regions}
                onChange={handleChange}
              />

              <FloatingInput
                label='Funding Sources'
                name='funding_sources'
                value={formData.funding_sources}
                onChange={handleChange}
              />
            </div>
          )}

          {isTrust && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput
                label='Trust Name'
                name='trust_name'
                value={formData.trust_name}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label='Trust Type'
                name='trust_type'
                value={formData.trust_type}
                onChange={handleChange}
              />

              <FloatingInput
                label='Trust Deed Reference'
                name='trust_deed_reference'
                value={formData.trust_deed_reference}
                onChange={handleChange}
              />

              <FloatingInput
                label='Formation Date'
                name='formation_date'
                type='date'
                value={formData.formation_date}
                onChange={handleChange}
              />

              <FloatingInput
                label='Jurisdiction'
                name='jurisdiction'
                value={formData.jurisdiction}
                onChange={handleChange}
              />

              <FloatingInput
                label='Trustee Count'
                name='trustee_count'
                type='number'
                value={formData.trustee_count}
                onChange={handleChange}
              />

              <FloatingInput
                label='Primary Trustee Name'
                name='primary_trustee_name'
                value={formData.primary_trustee_name}
                onChange={handleChange}
              />

              <FloatingInput
                label='Primary Trustee Contact'
                name='primary_trustee_contact'
                value={formData.primary_trustee_contact}
                onChange={handleChange}
              />

              <FloatingInput
                label='Beneficiary Details'
                name='beneficiary_details'
                value={formData.beneficiary_details}
                onChange={handleChange}
              />

              <FloatingInput
                label='Assets Under Trust'
                name='assets_under_trust'
                value={formData.assets_under_trust}
                onChange={handleChange}
              />

              <FloatingInput
                label='Legal Representative'
                name='legal_representative'
                value={formData.legal_representative}
                onChange={handleChange}
              />
            </div>
          )}

          {isEstate && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput
                label='Estate Name'
                name='estate_name'
                value={formData.estate_name}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label='Deceased Full Name'
                name='deceased_full_name'
                value={formData.deceased_full_name}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label='Deceased ID Number'
                name='deceased_id_number'
                value={formData.deceased_id_number}
                onChange={handleChange}
              />

              <FloatingInput
                label='Date of Death'
                name='date_of_death'
                type='date'
                value={formData.date_of_death}
                onChange={handleChange}
              />

              <FloatingInput
                label='Probate Number'
                name='probate_number'
                value={formData.probate_number}
                onChange={handleChange}
              />

              <FloatingInput
                label='Court Reference'
                name='court_reference'
                value={formData.court_reference}
                onChange={handleChange}
              />

              <FloatingInput
                label='Executor Name'
                name='executor_name'
                value={formData.executor_name}
                onChange={handleChange}
              />

              <FloatingInput
                label='Executor Contact'
                name='executor_contact'
                value={formData.executor_contact}
                onChange={handleChange}
              />

              <FloatingInput
                label='Administrator Name'
                name='administrator_name'
                value={formData.administrator_name}
                onChange={handleChange}
              />

              <FloatingInput
                label='Administrator Contact'
                name='administrator_contact'
                value={formData.administrator_contact}
                onChange={handleChange}
              />

              <FloatingInput
                label='Estate Value Estimate'
                name='estate_value_estimate'
                type='number'
                value={formData.estate_value_estimate}
                onChange={handleChange}
              />

              <FloatingInput
                label='Beneficiaries'
                name='beneficiaries'
                value={formData.beneficiaries}
                onChange={handleChange}
              />

              <FloatingInput
                label='Assets Description'
                name='assets_description'
                value={formData.assets_description}
                onChange={handleChange}
              />

              <FloatingInput
                label='Liabilities Description'
                name='liabilities_description'
                value={formData.liabilities_description}
                onChange={handleChange}
              />

              <FloatingInput
                label='Court Status'
                name='court_status'
                value={formData.court_status}
                onChange={handleChange}
              />
            </div>
          )}

          {isGovernment && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput
                label={requestedClientType === 'SCHOOL' ? 'School Name' : 'Government Entity Name'}
                name='government_entity_name'
                value={formData.government_entity_name}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label='Department'
                name='department'
                value={formData.department}
                onChange={handleChange}
              />

              <FloatingInput
                label='Agency / Institution Code'
                name='agency_code'
                value={formData.agency_code}
                onChange={handleChange}
              />

              <FloatingInput
                label='Registration Number'
                name='registration_number'
                value={formData.registration_number}
                onChange={handleChange}
              />

              <FloatingInput
                label='Jurisdiction Level'
                name='jurisdiction_level'
                value={formData.jurisdiction_level}
                onChange={handleChange}
              />

              <FloatingInput
                label='Contact Person Name'
                name='contact_person_name'
                value={formData.contact_person_name}
                onChange={handleChange}
              />

              <FloatingInput
                label='Contact Person Position'
                name='contact_person_position'
                value={formData.contact_person_position}
                onChange={handleChange}
              />

              <FloatingInput
                label='Contact Person Phone'
                name='contact_person_phone'
                value={formData.contact_person_phone}
                onChange={handleChange}
              />

              <FloatingInput
                label='Contact Person Email'
                name='contact_person_email'
                value={formData.contact_person_email}
                onChange={handleChange}
              />

              <FloatingInput
                label='Office Address'
                name='office_address'
                value={formData.office_address}
                onChange={handleChange}
              />

              <FloatingInput
                label='Mandate Area'
                name='mandate_area'
                value={formData.mandate_area}
                onChange={handleChange}
              />

              <FloatingInput
                label='Legal Department Head'
                name='legal_department_head'
                value={formData.legal_department_head}
                onChange={handleChange}
              />

              <FloatingInput
                label='Legal Department Contact'
                name='legal_department_contact'
                value={formData.legal_department_contact}
                onChange={handleChange}
              />
            </div>
          )}

          {isIndividual && (
            <>
              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  Legal identity
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Full Legal Name' name='full_name' value={formData.full_name} onChange={handleChange} error={fieldErrors.full_name} required />
                  <FloatingInput label='First Name' name='first_name' value={formData.first_name} onChange={handleChange} error={fieldErrors.first_name} />
                  <FloatingInput label='Middle Name' name='middle_name' value={formData.middle_name} onChange={handleChange} error={fieldErrors.middle_name} />
                  <FloatingInput label='Last Name' name='last_name' value={formData.last_name} onChange={handleChange} error={fieldErrors.last_name} />
                  <Select3D label='Identification Type' name='identification_type' value={formData.identification_type} onChange={handleChange} error={fieldErrors.identification_type} required options={[
                    { value: 'NATIONAL_ID', label: 'National ID' },
                    { value: 'PASSPORT', label: 'Passport' },
                    { value: 'ALIEN_ID', label: 'Alien ID' },
                    { value: 'REFUGEE_ID', label: 'Refugee ID' },
                    { value: 'BIRTH_CERTIFICATE', label: 'Birth Certificate' },
                    { value: 'OTHER_GOVERNMENT_ID', label: 'Other Government ID' },
                  ]} />
                  <FloatingInput label='Identification Number' name='identification_number' value={formData.identification_number} onChange={handleChange} error={fieldErrors.identification_number || fieldErrors.identification} required />
                  <FloatingInput label='Issuing Country' name='identification_country' value={formData.identification_country} onChange={handleChange} error={fieldErrors.identification_country} required />
                  {formData.identification_type === 'PASSPORT' && (
                    <FloatingInput label='Passport Expiry Date' name='identification_expiry_date' type='date' value={formData.identification_expiry_date} onChange={handleChange} error={fieldErrors.identification_expiry_date} required />
                  )}
                  <FloatingInput label='Date of Birth' name='date_of_birth' type='date' value={formData.date_of_birth} onChange={handleChange} error={fieldErrors.date_of_birth} required />
                  <FloatingInput label='Nationality' name='nationality' value={formData.nationality} onChange={handleChange} error={fieldErrors.nationality} required />
                  <FloatingInput label='Document Reference' name='identification_document_reference' value={formData.identification_document_reference} onChange={handleChange} error={fieldErrors.identification_document_reference} />
                  <FloatingInput label='Preferred Name' name='preferred_name' value={formData.preferred_name} onChange={handleChange} error={fieldErrors.preferred_name} />
                  <FloatingInput label='KRA PIN' name='kra_pin' value={formData.kra_pin} onChange={handleChange} error={fieldErrors.kra_pin} />
                  <FloatingInput label='Citizenship' name='citizenship' value={formData.citizenship} onChange={handleChange} error={fieldErrors.citizenship} />
                </div>
                <label className='flex items-start gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                  <input type='checkbox' name='identification_verified' checked={formData.identification_verified} onChange={handleChange} className='mt-1' />
                  <span>
                    <span className='block font-medium'>Identity document has been independently verified</span>
                    <span className='block text-sm text-[color:var(--text-secondary)]'>Select only after inspecting an original, a certified copy, or a reliable official electronic source.</span>
                  </span>
                </label>
                {formData.identification_verified ? (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <Select3D label='Verification Method' name='verification_method' value={formData.verification_method} onChange={handleChange} error={fieldErrors.verification_method} required options={[
                      { value: 'ORIGINAL_INSPECTED', label: 'Original document inspected' },
                      { value: 'CERTIFIED_COPY', label: 'Certified copy inspected' },
                      { value: 'OFFICIAL_ELECTRONIC_SOURCE', label: 'Official electronic source' },
                    ]} />
                    <FloatingInput label='Verification Notes' name='verification_notes' value={formData.verification_notes} onChange={handleChange} error={fieldErrors.verification_notes} />
                  </div>
                ) : (
                  <div className='rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-100'>
                    Identity is recorded but remains unverified. Complete verification before regulated work or client-money activity proceeds.
                  </div>
                )}
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  Contact information
                </h3>
                {fieldErrors.contact_method && <p className='text-sm text-red-500'>{fieldErrors.contact_method}</p>}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {isProspect && (
                    <FloatingInput label='Portal Login Email' name='email' value={formData.email} onChange={handleChange} error={fieldErrors.email} required />
                  )}
                  <FloatingInput label='Phone Number' name='phone_number' value={formData.phone_number} onChange={handleChange} error={fieldErrors.phone_number} required={isProspect} />
                  <Select3D label='Preferred Communication Channel' name='preferred_contact_channel' value={formData.preferred_contact_channel} onChange={handleChange} error={fieldErrors.preferred_contact_channel} required options={[
                    ...(!isProspect ? [{ value: 'IN_PERSON', label: 'In person at the firm' }] : []),
                    { value: 'PHONE', label: 'Phone' },
                    ...(isProspect ? [
                      { value: 'EMAIL', label: 'Email' },
                      { value: 'SMS', label: 'SMS' },
                      { value: 'WHATSAPP', label: 'WhatsApp' },
                    ] : []),
                  ]} />
                  <Select3D label='Preferred Language' name='preferred_language' value={formData.preferred_language} onChange={handleChange} error={fieldErrors.preferred_language} options={[
                    { value: 'English', label: 'English' },
                    { value: 'Kiswahili', label: 'Kiswahili / Swahili' },
                  ]} />
                </div>
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  Instructions and authority
                </h3>
                <p className='text-sm text-[color:var(--text-secondary)]'>
                  Record who is giving instructions and the legal service being requested. This supports conflict checking and Kenyan client due diligence.
                </p>
                <label className='flex items-start gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                  <input
                    type='checkbox'
                    name='acting_for_self'
                    checked={formData.acting_for_self}
                    onChange={handleChange}
                    className='mt-1'
                  />
                  <span>
                    <span className='block font-medium'>The client is acting for themself</span>
                    <span className='block text-sm text-[color:var(--text-secondary)]'>Untick where the client is acting as an agent, nominee, guardian, trustee or other representative.</span>
                  </span>
                </label>
                {!formData.acting_for_self && (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <FloatingInput label='Person Represented' name='represented_person' value={formData.represented_person} onChange={handleChange} error={fieldErrors.represented_person} required />
                    <FloatingInput label='Relationship / Legal Capacity' name='representation_capacity' value={formData.representation_capacity} onChange={handleChange} error={fieldErrors.representation_capacity} required />
                    <FloatingInput label='Authority Document / Reference' name='authority_document_reference' value={formData.authority_document_reference} onChange={handleChange} error={fieldErrors.authority_document_reference} required />
                    <label className='flex items-start gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                      <input type='checkbox' name='authority_verified' checked={formData.authority_verified} onChange={handleChange} className='mt-1' />
                      <span className='text-sm'>I inspected and verified the representative’s authority to give instructions.</span>
                    </label>
                    {fieldErrors.authority_verified && <p className='text-sm text-red-500'>{fieldErrors.authority_verified}</p>}
                  </div>
                )}
                <FloatingInput
                  label='Legal Service Sought / Purpose of Instructions'
                  name='purpose_and_nature_of_relationship'
                  value={formData.purpose_and_nature_of_relationship}
                  onChange={handleChange}
                  error={fieldErrors.purpose_and_nature_of_relationship}
                  required
                />
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  Residential address
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Residential Country' name='country' value={formData.country} onChange={handleChange} error={fieldErrors.country} required />
                  <FloatingInput label='County or Region' name='county_or_region' value={formData.county_or_region} onChange={handleChange} error={fieldErrors.county_or_region || fieldErrors.county} />
                  <FloatingInput label='City, Town or Locality' name='city_or_town' value={formData.city_or_town} onChange={handleChange} error={fieldErrors.city_or_town || fieldErrors.city} required />
                  <FloatingInput label='Street or Locality' name='street_or_locality' value={formData.street_or_locality} onChange={handleChange} error={fieldErrors.street_or_locality || fieldErrors.street} />
                  <FloatingInput label='Postal Code' name='postal_code' value={formData.postal_code} onChange={handleChange} error={fieldErrors.postal_code} />
                  <FloatingInput label='Address Description' name='address_description' value={formData.address_description} onChange={handleChange} error={fieldErrors.address_description || fieldErrors.full_address} required />
                </div>
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  Employment information
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <Select3D label='Occupation Status' name='occupation_status' value={formData.occupation_status} onChange={handleChange} error={fieldErrors.occupation_status} required options={[
                    { value: 'EMPLOYED', label: 'Employed' },
                    { value: 'SELF_EMPLOYED', label: 'Self-employed' },
                    { value: 'BUSINESS_OWNER', label: 'Business owner' },
                    { value: 'STUDENT', label: 'Student' },
                    { value: 'UNEMPLOYED', label: 'Unemployed' },
                    { value: 'RETIRED', label: 'Retired' },
                    { value: 'HOMEMAKER', label: 'Homemaker' },
                    { value: 'OTHER', label: 'Other' },
                    { value: 'NOT_DISCLOSED', label: 'Not disclosed' },
                  ]} />
                  <FloatingInput label='Occupation' name='occupation' value={formData.occupation} onChange={handleChange} error={fieldErrors.occupation} />
                  {formData.occupation_status === 'EMPLOYED' && (
                    <FloatingInput label='Employer' name='employer' value={formData.employer} onChange={handleChange} error={fieldErrors.employer} required />
                  )}
                  {formData.occupation_status === 'BUSINESS_OWNER' && (
                    <FloatingInput label='Business Name' name='business_name' value={formData.business_name} onChange={handleChange} error={fieldErrors.business_name} required />
                  )}
                  <FloatingInput label='Communication or Accessibility Support (only if volunteered)' name='disability_or_accessibility_notes' value={formData.disability_or_accessibility_notes} onChange={handleChange} error={fieldErrors.disability_or_accessibility_notes} />
                </div>
              </section>

              {isMinorIndividual && (
                <section className='space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/20'>
                  <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                    Guardian or legal representative
                  </h3>
                  <p className='text-sm text-[color:var(--text-secondary)]'>
                    The date of birth shows this client is under 18, so guardian or legal-representative details are required.
                  </p>
                  {fieldErrors.guardian_contact && <p className='text-sm text-red-500'>{fieldErrors.guardian_contact}</p>}
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <FloatingInput label='Guardian Name' name='guardian_name' value={formData.guardian_name} onChange={handleChange} error={fieldErrors.guardian_name} required />
                    <FloatingInput label='Relationship' name='guardian_relationship' value={formData.guardian_relationship} onChange={handleChange} error={fieldErrors.guardian_relationship} />
                    <FloatingInput label='Guardian Phone' name='guardian_phone' value={formData.guardian_phone} onChange={handleChange} error={fieldErrors.guardian_phone} required={!formData.guardian_email} />
                    {isProspect && <FloatingInput label='Guardian Email' name='guardian_email' value={formData.guardian_email} onChange={handleChange} error={fieldErrors.guardian_email} required={!formData.guardian_phone} />}
                  </div>
                </section>
              )}

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  Optional next of kin
                </h3>
                <p className='text-sm text-[color:var(--text-secondary)]'>
                  Record only if the client voluntarily provides an emergency contact. This person does not receive case information or authority to give instructions.
                </p>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Full Name' name='next_of_kin_name' value={formData.next_of_kin_name} onChange={handleChange} error={fieldErrors.next_of_kin_name} />
                  <Select3D label='Relationship' name='next_of_kin_relationship' value={formData.next_of_kin_relationship} onChange={handleChange} error={fieldErrors.next_of_kin_relationship} options={nextOfKinRelationshipOptions} />
                  <FloatingInput label='Phone' name='next_of_kin_phone' value={formData.next_of_kin_phone} onChange={handleChange} error={fieldErrors.next_of_kin_phone} />
                  {isProspect && <FloatingInput label='Email' name='next_of_kin_email' value={formData.next_of_kin_email} onChange={handleChange} error={fieldErrors.next_of_kin_email} />}
                </div>
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  Initial client due diligence
                </h3>
                <p className='text-sm text-[color:var(--text-secondary)]'>
                  This creates the initial risk record. Identity verification and any required screening must still be completed before regulated work or client-money activity proceeds.
                </p>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <Select3D label='PEP Screening Status' name='pep_status' value={formData.pep_status} onChange={handleChange} error={fieldErrors.pep_status} options={[
                    { value: 'PENDING', label: 'Pending review' },
                    { value: 'NO_MATCH', label: 'No match found' },
                    { value: 'POTENTIAL_MATCH', label: 'Potential match' },
                    { value: 'CONFIRMED_MATCH', label: 'Confirmed PEP' },
                  ]} />
                  <Select3D label='Sanctions Screening Status' name='sanctions_screening_status' value={formData.sanctions_screening_status} onChange={handleChange} error={fieldErrors.sanctions_screening_status} options={[
                    { value: 'PENDING', label: 'Pending review' },
                    { value: 'NO_MATCH', label: 'No match found' },
                    { value: 'POTENTIAL_MATCH', label: 'Potential match' },
                    { value: 'CONFIRMED_MATCH', label: 'Confirmed match' },
                  ]} />
                  <Select3D label='Initial Risk Rating' name='risk_rating' value={formData.risk_rating} onChange={handleChange} error={fieldErrors.risk_rating} options={[
                    { value: 'NOT_ASSESSED', label: 'Not yet assessed' },
                    { value: 'LOW', label: 'Low' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HIGH', label: 'High' },
                  ]} />
                  <FloatingInput label='Source of Funds (when relevant)' name='source_of_funds' value={formData.source_of_funds} onChange={handleChange} error={fieldErrors.source_of_funds} />
                  <FloatingInput label='Source of Wealth (when relevant)' name='source_of_wealth' value={formData.source_of_wealth} onChange={handleChange} error={fieldErrors.source_of_wealth} />
                  {!['PENDING', 'NOT_CHECKED'].includes(formData.sanctions_screening_status) && (
                    <>
                      <FloatingInput label='Screening Date' name='screening_date' type='date' value={formData.screening_date} onChange={handleChange} error={fieldErrors.screening_date} required />
                      <FloatingInput label='Screening Method / Provider' name='screening_method' value={formData.screening_method} onChange={handleChange} error={fieldErrors.screening_method} />
                      <FloatingInput label='Screening Result' name='screening_result' value={formData.screening_result} onChange={handleChange} error={fieldErrors.screening_result} required />
                    </>
                  )}
                  {formData.risk_rating !== 'NOT_ASSESSED' && (
                    <FloatingInput label='Risk Assessment Reason' name='risk_assessment_reason' value={formData.risk_assessment_reason} onChange={handleChange} error={fieldErrors.risk_assessment_reason} required />
                  )}
                  {['POTENTIAL_MATCH', 'CONFIRMED_MATCH'].includes(formData.pep_status) && (
                    <FloatingInput label='PEP Details' name='pep_details' value={formData.pep_details} onChange={handleChange} error={fieldErrors.pep_details} required />
                  )}
                </div>
                <label className='flex items-start gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                  <input type='checkbox' name='enhanced_due_diligence_required' checked={formData.enhanced_due_diligence_required} onChange={handleChange} className='mt-1' />
                  <span className='text-sm'>Enhanced due diligence is required</span>
                </label>
                {formData.enhanced_due_diligence_required && (
                  <FloatingInput label='Enhanced Due Diligence Reason' name='enhanced_due_diligence_reason' value={formData.enhanced_due_diligence_reason} onChange={handleChange} error={fieldErrors.enhanced_due_diligence_reason} required />
                )}
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  Privacy notice
                </h3>
                <p className='text-sm text-[color:var(--text-secondary)]'>
                  The firm collects identity, contact, address and service-related information to provide legal services, meet legal obligations, protect legal claims and preserve advocate-client confidentiality. Access is limited to authorised firm users and records are retained according to firm and legal requirements. Clients may request access to and correction of their personal information.
                </p>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='rounded-xl border border-[color:var(--border)] p-4 text-sm'>
                    <span className='block text-[color:var(--text-secondary)]'>Notice version</span>
                    <span className='font-semibold'>{formData.privacy_notice_version}</span>
                  </div>
                  <Select3D label='Notice Delivery Method' name='privacy_notice_delivery_method' value={formData.privacy_notice_delivery_method} onChange={handleChange} error={fieldErrors.privacy_notice_delivery_method} required options={isProspect ? [
                    { value: 'PORTAL', label: 'Displayed in client portal' },
                  ] : [
                    { value: 'VERBAL', label: 'Read and explained verbally' },
                    { value: 'PAPER', label: 'Paper copy provided' },
                  ]} />
                  <Select3D label='Personal Data Source' name='personal_data_source' value={formData.personal_data_source} onChange={handleChange} error={fieldErrors.personal_data_source} required options={[
                    { value: 'CLIENT', label: 'Client' },
                    { value: 'AUTHORIZED_REPRESENTATIVE', label: 'Authorized representative' },
                    { value: 'OTHER', label: 'Other' },
                  ]} />
                  <FloatingInput label='Signature / Acknowledgement Reference' name='privacy_acknowledgement_reference' value={formData.privacy_acknowledgement_reference} onChange={handleChange} error={fieldErrors.privacy_acknowledgement_reference} required />
                  <Select3D label='Lawful Basis' name='privacy_lawful_basis' value={formData.privacy_lawful_basis} onChange={handleChange} error={fieldErrors.privacy_lawful_basis} required options={[
                    { value: 'CONTRACT_AND_LEGAL_OBLIGATION', label: 'Contract and legal obligation' },
                    { value: 'LEGAL_OBLIGATION', label: 'Legal obligation' },
                    { value: 'LEGAL_CLAIMS', label: 'Establishment, exercise or defence of legal claims' },
                    { value: 'LEGITIMATE_INTERESTS', label: 'Legitimate interests' },
                  ]} />
                  <FloatingInput label='Data Sharing Explanation' name='privacy_data_sharing_explanation' value={formData.privacy_data_sharing_explanation} onChange={handleChange} error={fieldErrors.privacy_data_sharing_explanation} />
                  <FloatingInput label='Retention Category' name='privacy_retention_category' value={formData.privacy_retention_category} onChange={handleChange} error={fieldErrors.privacy_retention_category} />
                </div>
                <label className='flex items-start gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                  <input type='checkbox' name='privacy_notice_acknowledged' checked={formData.privacy_notice_acknowledged} onChange={handleChange} className='mt-1' />
                  <span className='text-sm'>
                    I confirm that the notice was delivered using the method recorded above, the client had an opportunity to ask questions, and the client acknowledged receipt. This records notice—not consent as the only legal basis for processing.
                  </span>
                </label>
                {fieldErrors.privacy_notice_acknowledged && <p className='text-sm text-red-500'>{fieldErrors.privacy_notice_acknowledged}</p>}
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  Internal notes
                </h3>
                <FloatingInput label='Internal Notes' name='notes' value={formData.notes} onChange={handleChange} error={fieldErrors.notes} />
              </section>
            </>
          )}

          {isCompanyClient && (
            <>
              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  Company identity
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput
                    label='Company Name'
                    name='company_name'
                    value={formData.company_name}
                    onChange={handleChange}
                    error={fieldErrors.company_name}
                    required
                  />
                  <FloatingInput
                    label='Trading Name'
                    name='trading_name'
                    value={formData.trading_name}
                    onChange={handleChange}
                    error={fieldErrors.trading_name}
                  />
                  <FloatingInput
                    label='Registration Number'
                    name='registration_number'
                    value={formData.registration_number}
                    onChange={handleChange}
                    error={fieldErrors.registration_number}
                    required
                  />
                  <FloatingInput
                    label='KRA PIN'
                    name='kra_pin'
                    value={formData.kra_pin}
                    onChange={handleChange}
                    error={fieldErrors.kra_pin}
                  />
                  <Select3D
                    label='Company Type'
                    name='company_type'
                    value={formData.company_type}
                    onChange={handleChange}
                    options={[
                      { value: 'PRIVATE_LIMITED_COMPANY', label: 'Private Company Limited by Shares' },
                      { value: 'PUBLIC_LIMITED_COMPANY', label: 'Public Limited Company' },
                      { value: 'COMPANY_LIMITED_BY_GUARANTEE', label: 'Company Limited by Guarantee' },
                      { value: 'FOREIGN_COMPANY', label: 'Foreign Company' },
                      { value: 'UNLIMITED_COMPANY', label: 'Unlimited Company' },
                      { value: 'OTHER', label: 'Other' },
                    ]}
                  />
                  <FloatingInput
                    label='Incorporation Date'
                    name='incorporation_date'
                    type='date'
                    value={formData.incorporation_date}
                    onChange={handleChange}
                    error={fieldErrors.incorporation_date}
                  />
                  <FloatingInput
                    label='Country of Incorporation'
                    name='country_of_incorporation'
                    value={formData.country_of_incorporation}
                    onChange={handleChange}
                    error={fieldErrors.country_of_incorporation}
                  />
                  <FloatingInput label='Registration Authority' name='company_registration_authority' value={formData.company_registration_authority} onChange={handleChange} error={fieldErrors.company_registration_authority} required />
                  <FloatingInput label='Registration Document Reference' name='registration_document_reference' value={formData.registration_document_reference} onChange={handleChange} error={fieldErrors.registration_document_reference} required />
                  <Select3D label='Independent Verification Source' name='registration_verification_source' value={formData.registration_verification_source} onChange={handleChange} error={fieldErrors.registration_verification_source} options={[
                    { value: 'BRS_ECITIZEN', label: 'BRS / eCitizen search' },
                    { value: 'CERTIFIED_DOCUMENT', label: 'Certified registration document' },
                    { value: 'FOREIGN_OFFICIAL_REGISTER', label: 'Foreign official register' },
                  ]} />
                  <label className='flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                    <input type='checkbox' name='registration_verified' checked={formData.registration_verified} onChange={handleChange} />
                    <span>Registration and current status independently verified</span>
                  </label>
                  {fieldErrors.registration_verified && <p className='text-sm text-red-500'>{fieldErrors.registration_verified}</p>}
                  <Select3D
                    label='Company Status'
                    name='company_status'
                    value={formData.company_status}
                    onChange={handleChange}
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'DORMANT', label: 'Dormant' },
                      { value: 'UNDER_ADMINISTRATION', label: 'Under Administration' },
                      { value: 'IN_RECEIVERSHIP', label: 'In Receivership' },
                      { value: 'INSOLVENT', label: 'Insolvent' },
                      { value: 'LIQUIDATION', label: 'In Liquidation' },
                      { value: 'DISSOLVED', label: 'Dissolved' },
                      { value: 'STRUCK_OFF', label: 'Struck Off' },
                      { value: 'OTHER', label: 'Other' },
                    ]}
                  />
                </div>
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  Business information
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput
                    label='Industry'
                    name='industry'
                    value={formData.industry}
                    onChange={handleChange}
                    error={fieldErrors.industry}
                  />
                  <FloatingInput
                    label='Nature of Business'
                    name='nature_of_business'
                    value={formData.nature_of_business}
                    onChange={handleChange}
                    error={fieldErrors.nature_of_business}
                  />
                  <FloatingInput
                    label='Website'
                    name='website'
                    value={formData.website}
                    onChange={handleChange}
                    error={fieldErrors.website}
                  />
                  <FloatingInput
                    label='Number of Employees'
                    name='employee_count'
                    type='number'
                    min='0'
                    value={formData.employee_count}
                    onChange={handleChange}
                    error={fieldErrors.employee_count}
                  />
                  <label className='flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                    <input
                      type='checkbox'
                      name='beneficial_ownership_declared'
                      checked={formData.beneficial_ownership_declared}
                      onChange={handleChange}
                    />
                    <span>Beneficial ownership declared</span>
                  </label>
                  <label className='flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                    <input
                      type='checkbox'
                      name='annual_returns_up_to_date'
                      checked={formData.annual_returns_up_to_date}
                      onChange={handleChange}
                    />
                    <span>Annual returns up to date</span>
                  </label>
                  <FloatingInput
                    label='Compliance Notes'
                    name='compliance_notes'
                    value={formData.compliance_notes}
                    onChange={handleChange}
                    error={fieldErrors.compliance_notes}
                    className='md:col-span-2'
                  />
                </div>
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>Director or controlling officer</h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Full Legal Name' name='director_full_legal_name' value={formData.director_full_legal_name} onChange={handleChange} error={fieldErrors.director_full_legal_name} required />
                  <FloatingInput label='National ID / Passport' name='director_identifier' value={formData.director_identifier} onChange={handleChange} error={fieldErrors.director_identifier} required />
                  <FloatingInput label='Nationality' name='director_nationality' value={formData.director_nationality} onChange={handleChange} />
                  <FloatingInput label='Identity Verification Reference' name='director_verification_reference' value={formData.director_verification_reference} onChange={handleChange} error={fieldErrors.director_verification_reference} />
                </div>
                <div className='grid gap-3 md:grid-cols-2'>
                  <label className='flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                    <input type='checkbox' name='director_identity_verified' checked={formData.director_identity_verified} onChange={handleChange} />
                    <span>Director identity verified</span>
                  </label>
                  <label className='flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                    <input type='checkbox' name='director_authority_to_instruct' checked={formData.director_authority_to_instruct} onChange={handleChange} />
                    <span>Director has authority to instruct</span>
                  </label>
                </div>
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>Beneficial ownership</h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Beneficial Owner / Controlling Official' name='owner_full_legal_name' value={formData.owner_full_legal_name} onChange={handleChange} error={fieldErrors.owner_full_legal_name} required />
                  <FloatingInput label='National ID / Passport' name='owner_identifier' value={formData.owner_identifier} onChange={handleChange} error={fieldErrors.owner_identifier} required />
                  <FloatingInput label='Nationality' name='owner_nationality' value={formData.owner_nationality} onChange={handleChange} />
                  <FloatingInput label='Ownership %' name='owner_ownership_percentage' type='number' min='0' max='100' value={formData.owner_ownership_percentage} onChange={handleChange} />
                  <FloatingInput label='Voting Rights %' name='owner_voting_percentage' type='number' min='0' max='100' value={formData.owner_voting_percentage} onChange={handleChange} />
                  <Select3D label='Control Method' name='owner_control_method' value={formData.owner_control_method} onChange={handleChange} options={[
                    { value: 'SHAREHOLDING', label: 'Shareholding' },
                    { value: 'VOTING_RIGHTS', label: 'Voting rights' },
                    { value: 'OTHER_CONTROL', label: 'Control through other means' },
                    { value: 'SENIOR_MANAGING_OFFICIAL', label: 'Senior managing official' },
                  ]} />
                  <FloatingInput label='Ownership Evidence Reference' name='owner_evidence_reference' value={formData.owner_evidence_reference} onChange={handleChange} error={fieldErrors.owner_evidence_reference} required />
                </div>
                <div className='grid gap-3 md:grid-cols-2'>
                  <label className='flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                    <input type='checkbox' name='owner_identity_verified' checked={formData.owner_identity_verified} onChange={handleChange} />
                    <span>Beneficial-owner identity verified</span>
                  </label>
                  <label className='flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                    <input type='checkbox' name='beneficial_ownership_verified' checked={formData.beneficial_ownership_verified} onChange={handleChange} />
                    <span>Beneficial ownership evidence verified</span>
                  </label>
                </div>
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  Company contact details
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {isProspect && (
                    <FloatingInput
                      label='Company Email'
                      name='email'
                      value={formData.email}
                      onChange={handleChange}
                      error={fieldErrors.email}
                      required
                    />
                  )}
                  <FloatingInput
                    label='Company Phone Number'
                    name='phone_number'
                    value={formData.phone_number}
                    onChange={handleChange}
                    error={fieldErrors.phone_number}
                    required={isProspect && !formData.contact_phone_number}
                  />
                  <Select3D label='Authority Type' name='representative_authority_type' value={formData.representative_authority_type} onChange={handleChange} options={[
                    { value: 'BOARD_RESOLUTION', label: 'Board resolution' },
                    { value: 'POWER_OF_ATTORNEY', label: 'Power of attorney' },
                    { value: 'CONSTITUTIONAL_AUTHORITY', label: 'Constitutional / office authority' },
                    { value: 'OTHER', label: 'Other written authority' },
                  ]} />
                  <FloatingInput label='Authority Document Reference' name='representative_authority_reference' value={formData.representative_authority_reference} onChange={handleChange} error={fieldErrors.representative_authority_reference} required />
                  <label className='flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                    <input type='checkbox' name='representative_authority_verified' checked={formData.representative_authority_verified} onChange={handleChange} />
                    <span>Representative authority verified</span>
                  </label>
                  {fieldErrors.representative_authority_verified && <p className='text-sm text-red-500'>{fieldErrors.representative_authority_verified}</p>}
                </div>
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>Legal-service purpose and risk</h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput label='Purpose and Nature of Relationship' name='company_purpose_and_nature' value={formData.company_purpose_and_nature} onChange={handleChange} error={fieldErrors.company_purpose_and_nature} required />
                  <Select3D label='Company PEP Status' name='company_pep_status' value={formData.company_pep_status} onChange={handleChange} options={[
                    { value: 'PENDING', label: 'Pending' }, { value: 'NO_MATCH', label: 'No match' }, { value: 'POTENTIAL_MATCH', label: 'Potential match' }, { value: 'CONFIRMED_MATCH', label: 'Confirmed match' },
                  ]} />
                  <Select3D label='Sanctions Status' name='company_sanctions_status' value={formData.company_sanctions_status} onChange={handleChange} options={[
                    { value: 'PENDING', label: 'Pending' }, { value: 'NO_MATCH', label: 'No match' }, { value: 'POTENTIAL_MATCH', label: 'Potential match' }, { value: 'CONFIRMED_MATCH', label: 'Confirmed match' },
                  ]} />
                  <Select3D label='Risk Rating' name='company_risk_rating' value={formData.company_risk_rating} onChange={handleChange} options={[
                    { value: 'NOT_ASSESSED', label: 'Not assessed' }, { value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HIGH', label: 'High' },
                  ]} />
                  <FloatingInput label='Source of Funds (when relevant)' name='company_source_of_funds' value={formData.company_source_of_funds} onChange={handleChange} />
                  <FloatingInput label='Source of Wealth (when relevant)' name='company_source_of_wealth' value={formData.company_source_of_wealth} onChange={handleChange} />
                </div>
                <label className='flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                  <input type='checkbox' name='company_edd_required' checked={formData.company_edd_required} onChange={handleChange} />
                  <span>Enhanced due diligence required</span>
                </label>
                {formData.company_edd_required && <FloatingInput label='EDD Reason' name='company_edd_reason' value={formData.company_edd_reason} onChange={handleChange} required />}
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>Privacy and instructions</h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='rounded-xl border border-[color:var(--border)] p-4 text-sm'>Notice version: <strong>{formData.company_privacy_notice_version}</strong></div>
                  <Select3D label='Personal Data Source' name='company_personal_data_source' value={formData.company_personal_data_source} onChange={handleChange} options={[
                    { value: 'ENTITY', label: 'Entity' }, { value: 'AUTHORISED_REPRESENTATIVE', label: 'Authorised representative' }, { value: 'PUBLIC_REGISTER', label: 'Public register' },
                  ]} />
                </div>
                <label className='flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                  <input type='checkbox' name='company_privacy_notice_acknowledged' checked={formData.company_privacy_notice_acknowledged} onChange={handleChange} />
                  <span>Authorised representative received and acknowledged the privacy notice</span>
                </label>
                {fieldErrors.company_privacy_notice_acknowledged && <p className='text-sm text-red-500'>{fieldErrors.company_privacy_notice_acknowledged}</p>}
                <label className='flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-4'>
                  <input type='checkbox' name='client_instructions_confirmed' checked={formData.client_instructions_confirmed} onChange={handleChange} />
                  <span>Company instructions have been confirmed by the authorised representative</span>
                </label>
                {fieldErrors.client_instructions_confirmed && <p className='text-sm text-red-500'>{fieldErrors.client_instructions_confirmed}</p>}
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  {isProspect ? 'Authorised portal contact' : 'Authorised representative'}
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput
                    label='Full Name'
                    name='contact_full_name'
                    value={formData.contact_full_name}
                    onChange={handleChange}
                    error={fieldErrors.contact_full_name}
                    required={isProspect}
                  />
                  <FloatingInput
                    label='Role or Designation'
                    name='contact_role_or_designation'
                    value={formData.contact_role_or_designation}
                    onChange={handleChange}
                    error={fieldErrors.contact_role_or_designation}
                  />
                  {isProspect && (
                    <FloatingInput
                      label='Email'
                      name='contact_email'
                      value={formData.contact_email}
                      onChange={handleChange}
                      error={fieldErrors.contact_email}
                    />
                  )}
                  <FloatingInput
                    label='Phone Number'
                    name='contact_phone_number'
                    value={formData.contact_phone_number}
                    onChange={handleChange}
                    error={fieldErrors.contact_phone_number}
                    required={isProspect && !formData.phone_number}
                  />
                  <FloatingInput
                    label='National ID Number'
                    name='contact_national_id_number'
                    value={formData.contact_national_id_number}
                    onChange={handleChange}
                    error={fieldErrors.contact_national_id_number}
                  />
                </div>
              </section>

              <section className='space-y-4'>
                <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
                  Portal access
                </h3>
                <Select3D
                  label='Access Type'
                  name='access_type'
                  value={selectedEntityAccessType}
                  onChange={(event) => {
                    const accessType = event.target.value;
                    setSelectedEntityAccessType(accessType);
                    if (accessType === 'ASSISTED') {
                      setFormData((current) => ({
                        ...current,
                        email: '',
                        contact_email: '',
                        contact_person_email: '',
                      }));
                    }
                    setGeneralError('');
                  }}
                  options={[
                    { value: 'ASSISTED', label: 'Firm-managed client' },
                    { value: 'PORTAL_ENABLED', label: 'Client portal access' },
                  ]}
                />
                {isProspect && (
                  <div className='rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100'>
                    The authorised portal contact&apos;s email will be used for
                    login. A temporary password will be generated after creation.
                  </div>
                )}
              </section>
            </>
          )}

		          {!isIndividual && isCompanyClient && (
		            <h3 className='text-lg font-semibold text-[color:var(--text-primary)]'>
		              Registered office
		            </h3>
		          )}

          {!isIndividual && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput label='Country' name='country' value={formData.country} onChange={handleChange} error={fieldErrors.country} />
              <FloatingInput label='County' name='county' value={formData.county} onChange={handleChange} error={fieldErrors.county} />
              <FloatingInput label='City' name='city' value={formData.city} onChange={handleChange} error={fieldErrors.city} />
              <FloatingInput label='Street' name='street' value={formData.street} onChange={handleChange} error={fieldErrors.street} />
              <FloatingInput label='Postal Code' name='postal_code' value={formData.postal_code} onChange={handleChange} error={fieldErrors.postal_code} />
              <FloatingInput label='Full Address' name='full_address' value={formData.full_address} onChange={handleChange} error={fieldErrors.full_address} required={isCompanyClient || isProspect} />
            </div>
          )}

          <div className='flex gap-3 pt-4'>
            <Button3D
              type='button'
              variant='secondary'
              onClick={() =>
                navigate(isSecretaryCreate ? '/secretary/clients' : '/admin/clients')
              }
            >
              Cancel
            </Button3D>

            <Button3D type='submit' variant='primary' disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Client'}
            </Button3D>
          </div>
        </form>
      </Card>
      )}
    </div>
  );
}

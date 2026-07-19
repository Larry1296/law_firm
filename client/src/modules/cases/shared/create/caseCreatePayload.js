export const CASE_CREATE_CONTROLLED_FIELDS = [
  'status',
  'matter_status',
  'court_stage',
  'outcome_status',
  'enforcement_status',
  'appeal_status',
  'case_number',
  'internal_matter_number',
  'jurisdiction_verified',
  'jurisdiction_verified_by',
  'jurisdiction_verified_at',
  'filed_by',
  'created_by',
  'approved_by',
  'approved_at',
  'cts_reference',
];

const UNIVERSAL_FIELDS = [
  'client_id',
  'entry_route',
  'title',
  'description',
  'practice_area',
  'matter_nature',
  'forum',
  'case_type',
  'procedure_type',
  'procedure_track',
  'priority',
  'date_instructions_received',
  'urgency_level',
  'urgency_reason',
  'limitation_date',
  'internal_deadline',
  'next_court_date',
  'next_action',
  'client_party_role',
  'assigned_lawyer_membership_id',
  'assigned_secretary_membership_id',
];

const COURT_FIELDS = [
  'official_court_case_number',
  'filing_date',
  'court_type',
  'court_level',
  'court_name',
  'court_station',
  'registry',
  'court_division',
  'courtroom',
  'judicial_officer',
  'court_location',
  'efiling_reference',
  'payment_reference',
  'jurisdiction_notes',
  'next_court_date',
  'next_action',
];

const COURT_ALIASES = {
  court_division: 'division',
};

const TRIBUNAL_FIELDS = [
  'tribunal_name',
  'tribunal_reference',
  'filing_date',
  'registry_or_location',
  'panel_or_adjudicator',
  'next_date',
  'next_action',
];

const ARBITRATION_FIELDS = [
  'arbitration_reference',
  'arbitration_agreement',
  'arbitration_institution',
  'arbitration_seat',
  'arbitration_rules',
  'arbitrator',
  'commencement_date',
  'next_date',
  'next_action',
];

const ARBITRATION_ALIASES = {
  arbitration_institution: 'institution',
  arbitration_seat: 'seat',
  arbitration_rules: 'rules',
};

const NON_CONTENTIOUS_FIELDS = [
  'instruction_type',
  'deliverable',
  'target_completion_date',
  'counterparty',
  'transaction_value',
  'scope_of_work',
];

const LAND_FIELDS = [
  'property_description',
  'title_number',
  'parcel_number',
  'land_reference_number',
  'property_county',
  'location',
  'registered_owner',
  'property_value',
  'nature_of_land_interest',
  'possession_status',
  'boundary_dispute',
  'environment_issue',
  'orders_sought',
];

const LAND_ALIASES = {
  property_county: 'county',
  property_value: 'estimated_property_value',
};

const SUCCESSION_FIELDS = [
  'deceased_full_name',
  'date_of_death',
  'place_of_death',
  'testate_status',
  'will_date',
  'estate_value',
  'known_liabilities',
  'estimated_net_estate_value',
  'disputed_asset_value',
  'grant_type',
  'proposed_administrator',
];

const SUCCESSION_ALIASES = {
  estate_value: 'estimated_gross_estate_value',
};

const INSURANCE_FIELDS = [
  'insurer',
  'policy_number',
  'policy_type',
  'insured_party',
  'insurance_claim_number',
  'date_of_loss',
  'cause_of_loss',
  'amount_claimed',
  'amount_admitted',
  'amount_paid',
  'outstanding_amount',
  'policy_limit',
  'repudiation_date',
  'repudiation_reason',
];

const INSURANCE_ALIASES = {
  insurance_claim_number: 'claim_number',
};

const EMPLOYMENT_FIELDS = [
  'employer',
  'employee',
  'employment_start_date',
  'termination_date',
  'monthly_salary',
  'employment_status',
  'nature_of_complaint',
  'dismissal_type',
  'disciplinary_process',
  'labour_officer_reference',
];

const CRIMINAL_FIELDS = [
  'accused_person',
  'charge',
  'statutory_provision',
  'plea',
  'arrest_date',
  'police_station',
  'ob_number',
  'bond_bail_status',
  'bond_amount',
  'custody_status',
  'prosecution_agency',
];

const MONETARY_FIELDS = [
  'monetary_relief_type',
  'currency',
  'claim_amount',
  'special_damages',
  'general_damages_status',
  'general_damages_estimate',
  'interest_claimed',
  'interest_rate',
  'interest_basis',
  'costs_claimed',
  'amount_already_paid',
  'outstanding_amount',
  'estimated_matter_value',
  'amount_to_be_assessed',
  'property_value',
  'mesne_profits',
  'rent_arrears',
  'damages',
  'estate_value',
  'known_liabilities',
  'estimated_net_estate_value',
  'disputed_asset_value',
  'amount_claimed',
  'amount_admitted',
  'amount_paid',
  'policy_limit',
  'general_damages',
  'salary_arrears',
  'notice_pay',
  'leave_pay',
  'service_or_severance_pay',
  'compensation_months',
  'other_contractual_benefits',
  'future_medical_expenses',
  'loss_of_earnings',
  'loss_of_earning_capacity',
];

const MONETARY_ALIASES = {
  monetary_relief_type: 'relief_type',
  claim_amount: 'principal_amount',
  estate_value: 'gross_estate_value',
  known_liabilities: 'liabilities',
  estimated_net_estate_value: 'net_estate_value',
  amount_paid: 'amount_already_paid',
};

const CONFLICT_FIELDS = [
  'conflict_record_status',
  'conflict_effective_date',
  'conflict_result_summary',
  'conflict_reason',
  'conflict_notes',
];

const CONFLICT_ALIASES = {
  conflict_record_status: 'status',
  conflict_effective_date: 'effective_date',
  conflict_result_summary: 'result_summary',
  conflict_reason: 'reason',
  conflict_notes: 'notes',
};

const isEmpty = (value) => value === '' || value === null || value === undefined;

const trimSpaces = (value) => String(value).trim().replace(/\s+/g, ' ');

const normalizeValue = (key, value) => {
  if (typeof value !== 'string') return value;
  const trimmed = trimSpaces(value);
  if (key === 'currency') return trimmed.toUpperCase();
  return trimmed;
};

const assignIfPresent = (target, key, value) => {
  const normalized = normalizeValue(key, value);
  if (!isEmpty(normalized)) target[key] = normalized;
};

const pickSection = (source, fields, aliases = {}) => {
  const section = {};
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      assignIfPresent(section, aliases[field] || field, source[field]);
    }
  });
  return section;
};

const removeControlled = (payload, path = '') => {
  CASE_CREATE_CONTROLLED_FIELDS.forEach((field) => {
    if (!(path === 'conflict_record' && field === 'status')) {
      delete payload[field];
    }
  });
  Object.entries(payload).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      removeControlled(value, key);
    }
  });
  return payload;
};

const normalizeParty = (party = {}) => {
  const normalized = {};
  [
    'party_type',
    'role',
    'party_role',
    'is_client',
    'is_adverse',
    'linked_client',
    'linked_contact',
    'individual_name',
    'organization_name',
    'name',
    'identifier',
    'email',
    'phone',
    'address',
    'representation_status',
    'advocate_name',
    'advocate_firm',
    'notes',
    'display_order',
  ].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(party, field)) {
      assignIfPresent(normalized, field, party[field]);
    }
  });
  return normalized;
};

export const sanitizeCaseCreatePayload = (data = {}) => removeControlled({ ...data });

export const buildCaseCreatePayload = (formData = {}, context = {}) => {
  const data = { ...formData, ...context };
  const route = data.entry_route || 'EXISTING_FILED_COURT_CASE';
  const forum = data.forum || 'COURT';
  const payload = {};

  UNIVERSAL_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      assignIfPresent(payload, field, data[field]);
    }
  });
  payload.procedure_type = payload.procedure_type || payload.procedure_track;

  if (forum === 'COURT' || route === 'EXISTING_FILED_COURT_CASE' || route === 'NEW_INSTRUCTION') {
    const courtProceeding = pickSection(data, COURT_FIELDS, COURT_ALIASES);
    if (route === 'NEW_INSTRUCTION') {
      delete courtProceeding.official_court_case_number;
      delete courtProceeding.filing_date;
      delete courtProceeding.efiling_reference;
      delete courtProceeding.payment_reference;
      delete courtProceeding.courtroom;
      delete courtProceeding.judicial_officer;
    }
    if (Object.keys(courtProceeding).length) payload.court_proceeding = courtProceeding;
  }

  if (forum === 'TRIBUNAL' || route === 'EXISTING_TRIBUNAL_MATTER') {
    const tribunal = pickSection(data, TRIBUNAL_FIELDS);
    if (Object.keys(tribunal).length) payload.tribunal_proceeding = tribunal;
  }

  if (forum === 'ARBITRATION' || route === 'EXISTING_ARBITRATION') {
    const arbitration = pickSection(data, ARBITRATION_FIELDS, ARBITRATION_ALIASES);
    if (Object.keys(arbitration).length) payload.arbitration_proceeding = arbitration;
  }

  if (forum === 'NO_FORMAL_FORUM' || route === 'NON_CONTENTIOUS_MATTER') {
    const details = pickSection(data, NON_CONTENTIOUS_FIELDS);
    if (Object.keys(details).length) payload.non_contentious_details = details;
  }

  const landDetails = pickSection(data, LAND_FIELDS, LAND_ALIASES);
  if (data.practice_area === 'LAND_ENVIRONMENT' && Object.keys(landDetails).length) {
    payload.land_details = landDetails;
  }

  const successionDetails = pickSection(data, SUCCESSION_FIELDS, SUCCESSION_ALIASES);
  if (data.practice_area === 'SUCCESSION_PROBATE' && Object.keys(successionDetails).length) {
    payload.succession_details = successionDetails;
  }

  const insuranceDetails = pickSection(data, INSURANCE_FIELDS, INSURANCE_ALIASES);
  if (data.practice_area === 'INSURANCE' && Object.keys(insuranceDetails).length) {
    payload.insurance_details = insuranceDetails;
  }

  const employmentDetails = pickSection(data, EMPLOYMENT_FIELDS);
  if (data.practice_area === 'EMPLOYMENT_LABOUR' && Object.keys(employmentDetails).length) {
    payload.employment_details = employmentDetails;
  }

  const criminalDetails = pickSection(data, CRIMINAL_FIELDS);
  if (data.practice_area === 'CRIMINAL_LITIGATION' && Object.keys(criminalDetails).length) {
    payload.criminal_details = criminalDetails;
  }

  const monetaryRelief = pickSection(data, MONETARY_FIELDS, MONETARY_ALIASES);
  if (monetaryRelief.relief_type) {
    if (monetaryRelief.relief_type === 'NO_MONETARY_RELIEF') {
      delete monetaryRelief.principal_amount;
    }
    payload.monetary_relief = monetaryRelief;
  }

  const conflictRecord = pickSection(data, CONFLICT_FIELDS, CONFLICT_ALIASES);
  if (Object.keys(conflictRecord).length) payload.conflict_record = conflictRecord;

  const parties = Array.isArray(data.parties)
    ? data.parties.map(normalizeParty).filter((party) => Object.keys(party).length)
    : [];
  const defendantName = data.defendant ? trimSpaces(data.defendant) : '';
  const hasDefendantParty = defendantName && parties.some((party) =>
    [party.name, party.organization_name, party.individual_name]
      .filter(Boolean)
      .some((name) => trimSpaces(name).toLowerCase() === defendantName.toLowerCase()),
  );

  if (defendantName && !hasDefendantParty) {
    parties.push({
      party_type: 'COMPANY',
      role: 'DEFENDANT',
      organization_name: defendantName,
      name: defendantName,
      is_adverse: true,
    });
  }
  if (parties.length) payload.parties = parties;

  return removeControlled(payload);
};

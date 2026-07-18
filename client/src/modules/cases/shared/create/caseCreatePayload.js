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

export const FRONTEND_ONLY_FIELDS = [
  'entry_route',
  'practice_area',
  'matter_nature',
  'forum',
  'date_instructions_received',
  'limitation_date',
  'urgency_level',
  'urgency_reason',
  'internal_notes',
  'tribunal_name',
  'tribunal_reference',
  'arbitration_institution',
  'arbitration_reference',
  'arbitration_seat',
  'arbitration_rules',
  'property_description',
  'title_number',
  'parcel_number',
  'land_reference_number',
  'property_county',
  'property_value',
  'deceased_full_name',
  'date_of_death',
  'estate_value',
  'insurer',
  'policy_number',
  'insurance_claim_number',
  'date_of_loss',
  'amount_claimed',
  'amount_admitted',
  'amount_paid',
  'employer',
  'employee',
  'monthly_salary',
  'termination_date',
  'charge',
  'plea',
  'police_station',
  'ob_number',
  'bond_bail_status',
  'monetary_relief_type',
  'interest_claimed',
  'outstanding_amount',
  'estimated_matter_value',
  'conflict_record_status',
];

const BACKEND_CREATE_FIELDS = [
  'client_id',
  'assigned_lawyer_membership_id',
  'assigned_secretary_membership_id',
  'official_court_case_number',
  'filing_date',
  'efiling_reference',
  'payment_reference',
  'assessment_reference',
  'court_fee_amount',
  'payment_date',
  'title',
  'description',
  'case_type',
  'procedure_track',
  'court_type',
  'court_division',
  'priority',
  'court_name',
  'court_station',
  'registry',
  'courtroom',
  'judicial_officer',
  'court_location',
  'claim_amount',
  'currency',
  'court_level',
  'jurisdiction_notes',
  'next_court_date',
  'next_action',
  'plaintiff',
  'defendant',
  'client_party_role',
];

const isEmpty = (value) => value === '' || value === null || value === undefined;

const cleanValue = (key, value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (key === 'currency') {
    return trimmed.toUpperCase();
  }
  return trimmed;
};

export const sanitizeCaseCreatePayload = (data = {}) => {
  const payload = {};

  BACKEND_CREATE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      const value = cleanValue(field, data[field]);
      if (!isEmpty(value)) {
        payload[field] = value;
      }
    }
  });

  CASE_CREATE_CONTROLLED_FIELDS.forEach((field) => {
    delete payload[field];
  });

  return payload;
};

export const buildCaseCreatePayload = (formData = {}, context = {}) => {
  const data = { ...formData, ...context };
  const route = data.entry_route || 'EXISTING_FILED_COURT_CASE';

  if (route !== 'EXISTING_FILED_COURT_CASE') {
    delete data.official_court_case_number;
    delete data.filing_date;
    delete data.efiling_reference;
    delete data.payment_reference;
    delete data.courtroom;
    delete data.judicial_officer;
    delete data.next_court_date;
  }

  if (data.monetary_relief_type === 'NO_MONETARY_RELIEF' || data.monetary_relief_type === 'TO_BE_ASSESSED') {
    delete data.claim_amount;
  }

  FRONTEND_ONLY_FIELDS.forEach((field) => {
    delete data[field];
  });

  return sanitizeCaseCreatePayload(data);
};

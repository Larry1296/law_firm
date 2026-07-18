import { ENTRY_ROUTES } from './caseCreateOptions.js';

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

const addError = (errors, field, message) => {
  if (!errors[field]) errors[field] = message;
};

export const getEntryRouteLabel = (entryRoute) =>
  ENTRY_ROUTES.find((route) => route.value === entryRoute)?.label || entryRoute;

export const validateCaseCreateForm = (formData = {}, context = {}) => {
  const errors = {};
  const warnings = [];
  const entryRoute = formData.entry_route || 'EXISTING_FILED_COURT_CASE';
  const forum = formData.forum || 'COURT';

  if (!context.client_id && !formData.client_id) {
    addError(errors, 'client_id', 'Select the client or party represented by the firm.');
  }
  if (isBlank(formData.title)) {
    addError(errors, 'title', 'Matter title is required.');
  }
  if (isBlank(formData.case_type)) {
    addError(errors, 'case_type', 'Select the matter category supported by the backend.');
  }
  if (isBlank(formData.priority)) {
    addError(errors, 'priority', 'Select the matter priority.');
  }
  if (isBlank(formData.client_party_role)) {
    addError(errors, 'client_party_role', 'Select the represented client role.');
  }

  if (entryRoute === 'EXISTING_FILED_COURT_CASE') {
    if (isBlank(formData.official_court_case_number)) {
      addError(errors, 'official_court_case_number', 'Official court case number is required for an existing filed court case.');
    }
    if (isBlank(formData.filing_date)) {
      addError(errors, 'filing_date', 'Date filed is required for an existing filed court case.');
    }
    if (isBlank(formData.efiling_reference)) {
      addError(errors, 'efiling_reference', 'eFiling reference is required for an existing filed court case.');
    }
    if (isBlank(formData.court_type)) {
      addError(errors, 'court_type', 'Court type is required for a court proceeding.');
    }
    if (isBlank(formData.court_station) && isBlank(formData.court_name)) {
      addError(errors, 'court_station', 'Court station or court identification is required.');
    }
    if (isBlank(formData.defendant) && formData.matter_nature !== 'NON_CONTENTIOUS') {
      addError(errors, 'defendant', 'Record at least one adverse or opposing party for this proceeding.');
    }
  }

  if (entryRoute === 'NEW_INSTRUCTION') {
    if (formData.official_court_case_number || formData.filing_date || formData.efiling_reference) {
      warnings.push('Court filing fields will be omitted because this is a new unfiled instruction.');
    }
  }

  if (forum === 'COURT' && isBlank(formData.court_type)) {
    addError(errors, 'court_type', 'Court type is required when the forum is court.');
  }
  if (forum === 'TRIBUNAL' && isBlank(formData.tribunal_name)) {
    addError(errors, 'tribunal_name', 'Tribunal name is required for a tribunal matter.');
  }
  if (forum === 'ARBITRATION' && isBlank(formData.arbitration_institution)) {
    addError(errors, 'arbitration_institution', 'Arbitration institution or administering body is required.');
  }

  if (
    !isBlank(formData.filing_date) &&
    !isBlank(formData.next_court_date) &&
    new Date(formData.next_court_date) < new Date(formData.filing_date)
  ) {
    addError(errors, 'next_court_date', 'Next court date cannot be earlier than the filing date.');
  }

  if (
    formData.monetary_relief_type === 'QUANTIFIED' &&
    isBlank(formData.claim_amount)
  ) {
    addError(errors, 'claim_amount', 'Enter the quantified monetary claim amount.');
  }
  if (!isBlank(formData.claim_amount) && Number(formData.claim_amount) < 0) {
    addError(errors, 'claim_amount', 'Monetary amounts cannot be negative.');
  }

  if (entryRoute === 'EXISTING_FILED_COURT_CASE' && formData.conflict_record_status === 'REQUIRES_VERIFICATION') {
    warnings.push('This filed case will be registered with conflict-record verification still pending.');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

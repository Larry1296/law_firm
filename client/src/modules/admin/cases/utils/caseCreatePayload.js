export const CASE_CREATE_WORKFLOW_CONTROLLED_FIELDS = [
  'status',
  'matter_status',
  'court_stage',
  'outcome_status',
  'enforcement_status',
  'appeal_status',
  'case_number',
  'jurisdiction_verified',
  'jurisdiction_verified_by',
  'jurisdiction_verified_at',
  'filed_by',
  'cts_reference',
];

export const sanitizeCaseCreatePayload = (data = {}) => {
  const payload = { ...data };

  CASE_CREATE_WORKFLOW_CONTROLLED_FIELDS.forEach((field) => {
    delete payload[field];
  });

  return payload;
};

export const buildCaseCreatePayload = (formData = {}, context = {}) => {
  return sanitizeCaseCreatePayload({
    ...formData,
    ...context,
  });
};

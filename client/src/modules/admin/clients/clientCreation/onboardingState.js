export const initialOnboardingState = {
  client: { client_type: '', full_name: '', access_type: 'ASSISTED', email: '', phone_number: '', date_of_birth: '', sectors: [] },
  legal_profile: {}, representatives: [], contacts: [], addresses: [], beneficial_owners: [],
  due_diligence: { identity_verification_status: 'NOT_STARTED', pep_status: 'NOT_CHECKED', sanctions_screening_status: 'NOT_CHECKED', risk_rating: 'NOT_ASSESSED', acting_for_self: true },
  privacy: { lawful_basis: 'CONTRACTUAL_NECESSITY', privacy_notice_version: '2026.1', privacy_notice_delivered: false, acknowledged: false },
  regulatory_profiles: {},
};

export function onboardingStateFromSearch(search = '') {
  // Legacy chooser query parameters are intentionally ignored. Creation is
  // always configured explicitly on the canonical page.
  void search;
  return { ...initialOnboardingState, client: { ...initialOnboardingState.client } };
}

export function onboardingReducer(state, action) {
  if (action.type === 'SET_SECTION') return { ...state, [action.section]: { ...state[action.section], ...action.value } };
  if (action.type === 'SET_LIST') return { ...state, [action.section]: action.value };
  if (action.type === 'SET_EDUCATION') return { ...state, regulatory_profiles: { ...state.regulatory_profiles, education: { ...(state.regulatory_profiles.education || {}), ...action.value } } };
  if (action.type === 'SET_ACCESS_TYPE') return { ...state, client: { ...state.client, access_type: action.value }, representatives: state.representatives.map((rep) => ({ ...rep, is_portal_contact: false })) };
  if (action.type === 'SET_CLIENT_TYPE') {
    if (state.client.client_type === action.value) return state;
    const { full_name, email, phone_number, access_type, alternative_names } = state.client;
    return { ...state, client: { ...initialOnboardingState.client, full_name, email, phone_number, access_type, alternative_names, client_type: action.value }, legal_profile: {}, representatives: [], beneficial_owners: [], regulatory_profiles: {}, due_diligence: { ...initialOnboardingState.due_diligence } };
  }
  if (action.type === 'LOAD') return action.value;
  return state;
}

const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean).filter((item) => item !== undefined);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]).filter(([, v]) => v !== undefined));
  return value === '' ? undefined : value;
};

export const buildOnboardingPayload = (state) => clean({
  ...state,
  client: { ...state.client, lifecycle_status: 'PROSPECTIVE' },
});

// Only minimal identity fields can leave the initial creation page.
export function buildProspectivePayload(state, metadata) {
  const client = state.client;
  const kind = client.client_type;
  const keys = metadata.prospective_profiles[kind]?.fields.map(({ key }) => key) || [];
  return clean({
    full_name: client.full_name, client_type: kind, access_type: client.access_type,
    email: client.email, phone_number: client.phone_number, alternative_names: client.alternative_names,
    acting_for_self: state.due_diligence.acting_for_self,
    legal_profile: Object.fromEntries(keys.filter((key) => state.legal_profile[key] !== undefined).map((key) => [key, state.legal_profile[key]])),
    representative: state.representatives[0] || undefined,
    ...(kind === 'OTHER_REQUIRES_REVIEW' ? { provisional_legal_description: client.provisional_legal_description, classification_review_reason: client.classification_review_reason, classification_evidence_reference: client.classification_evidence_reference } : {}),
    privacy: state.privacy,
  });
}

export const initialOnboardingState = {
  client: { client_type: '', full_name: '', access_type: 'ASSISTED', email: '', phone_number: '', date_of_birth: '', sectors: [] },
  legal_profile: {}, representatives: [], contacts: [], addresses: [], beneficial_owners: [],
  due_diligence: { identity_verification_status: 'NOT_STARTED', pep_status: 'NOT_CHECKED', sanctions_screening_status: 'NOT_CHECKED', risk_rating: 'NOT_ASSESSED', acting_for_self: true },
  privacy: { lawful_basis: 'CONTRACTUAL_NECESSITY', privacy_notice_version: '2026.1', privacy_notice_delivered: false, acknowledged: false },
  regulatory_profiles: {},
};

export function onboardingReducer(state, action) {
  if (action.type === 'SET_SECTION') return { ...state, [action.section]: { ...state[action.section], ...action.value } };
  if (action.type === 'SET_LIST') return { ...state, [action.section]: action.value };
  if (action.type === 'SET_EDUCATION') return { ...state, regulatory_profiles: { ...state.regulatory_profiles, education: { ...(state.regulatory_profiles.education || {}), ...action.value } } };
  if (action.type === 'RESET_TYPE') return { ...initialOnboardingState, client: { ...initialOnboardingState.client, client_type: action.value } };
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

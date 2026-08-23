import { describe, expect, it } from 'vitest';
import { buildOnboardingPayload, initialOnboardingState, onboardingReducer, onboardingStateFromSearch } from './onboardingState';

describe('client onboarding payload', () => {
  it('preserves the company and staff-assisted choices from the chooser', () => {
    const state = onboardingStateFromSearch('?type=company&mode=assisted');
    expect(state.client.client_type).toBe('COMPANY');
    expect(state.client.access_type).toBe('ASSISTED');
  });

  it('preserves portal access selected in the chooser', () => {
    const state = onboardingStateFromSearch('?type=company&mode=portal');
    expect(state.client.client_type).toBe('COMPANY');
    expect(state.client.access_type).toBe('PORTAL_ENABLED');
  });

  it('keeps legal type and education overlay separate and excludes blank values', () => {
    let state = onboardingReducer(initialOnboardingState, { type: 'RESET_TYPE', value: 'COMPANY' });
    state = onboardingReducer(state, { type: 'SET_SECTION', section: 'client', value: { full_name: 'Greenfields Education Limited', sectors: ['EDUCATION'] } });
    state = onboardingReducer(state, { type: 'SET_EDUCATION', value: { education_regime: 'BASIC_EDUCATION', institution_official_name: 'Greenfields Academy', ownership: 'PRIVATE', operator_legal_name: 'Greenfields Education Limited', education_levels: ['PRIMARY', 'JUNIOR_SCHOOL'], curricula: [{ framework: 'KENYA_CBE_CBC' }] } });
    const payload = buildOnboardingPayload(state);
    expect(payload.client.client_type).toBe('COMPANY');
    expect(payload.regulatory_profiles.education.institution_official_name).toBe('Greenfields Academy');
    expect(payload.client.client_type).not.toBe('EDUCATIONAL_INSTITUTION');
    expect(payload.client.email).toBeUndefined();
  });

  it('clears stale profile state when legal type changes', () => {
    const withProfile = { ...initialOnboardingState, legal_profile: { company_name: 'Old Ltd' } };
    const changed = onboardingReducer(withProfile, { type: 'RESET_TYPE', value: 'TRUST' });
    expect(changed.legal_profile).toEqual({});
  });
});

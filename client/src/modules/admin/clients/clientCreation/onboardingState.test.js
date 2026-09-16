import { describe, expect, it } from 'vitest';
import { buildOnboardingPayload, initialOnboardingState, onboardingReducer, onboardingStateFromSearch } from './onboardingState';

describe('client onboarding payload', () => {
  it('starts with neutral defaults for legacy chooser links', () => {
    const state = onboardingStateFromSearch('?type=company&mode=assisted');
    expect(state.client.client_type).toBe('');
    expect(state.client.access_type).toBe('ASSISTED');
  });

  it('does not depend on legacy portal query parameters', () => {
    const state = onboardingStateFromSearch('?type=company&mode=portal');
    expect(state.client.client_type).toBe('');
    expect(state.client.access_type).toBe('ASSISTED');
  });

  it('keeps legal type and education overlay separate and excludes blank values', () => {
    let state = onboardingReducer(initialOnboardingState, { type: 'SET_CLIENT_TYPE', value: 'COMPANY' });
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
    const changed = onboardingReducer(withProfile, { type: 'SET_CLIENT_TYPE', value: 'TRUST' });
    expect(changed.legal_profile).toEqual({});
  });
});

  it('preserves portal access and shared identity while clearing category-specific data', () => {
    let state = onboardingStateFromSearch();
    state = onboardingReducer(state, { type: 'SET_ACCESS_TYPE', value: 'PORTAL_ENABLED' });
    state = onboardingReducer(state, { type: 'SET_CLIENT_TYPE', value: 'COMPANY' });
    state = onboardingReducer(state, { type: 'SET_SECTION', section: 'client', value: { full_name: 'Shared name', email: 'safe@example.test', phone_number: '123' } });
    state = onboardingReducer(state, { type: 'SET_SECTION', section: 'legal_profile', value: { company_name: 'Old company', registration_number: 'OLD' } });
    state = onboardingReducer(state, { type: 'SET_CLIENT_TYPE', value: 'INDIVIDUAL' });
    expect(state.client).toMatchObject({ access_type: 'PORTAL_ENABLED', full_name: 'Shared name', email: 'safe@example.test', phone_number: '123' });
    expect(state.legal_profile).toEqual({});
    expect(state.representatives).toEqual([]);
  });

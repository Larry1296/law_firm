import { useEffect, useReducer, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import LegalIdentityStep from '../clientCreation/LegalIdentityStep';
import RegulatoryProfileStep from '../clientCreation/RegulatoryProfileStep';
import RepresentativesStep from '../clientCreation/RepresentativesStep';
import ContactsAddressesStep from '../clientCreation/ContactsAddressesStep';
import DueDiligenceStep from '../clientCreation/DueDiligenceStep';
import PrivacyStep from '../clientCreation/PrivacyStep';
import { initialOnboardingState, onboardingReducer, buildOnboardingPayload } from '../clientCreation/onboardingState';
import { prospectiveClientService as service, creationError } from '@/modules/clients/shared/prospectiveClientService';

export default function CompleteClientOnboardingPage() {
  const { id } = useParams();
  const location = useLocation();
  const workspace = location.pathname.startsWith('/secretary') ? 'secretary' : 'admin';
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(onboardingReducer, initialOnboardingState);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([service.metadata(workspace), service.detail(workspace, id)]).then(([meta, client]) => {
      if (!active) return;
      dispatch({ type: 'LOAD', value: {
        ...initialOnboardingState, client: { ...initialOnboardingState.client, ...client, sectors: client.sector_profiles?.map((item) => item.sector) || [] },
        legal_profile: client.type_profile || {}, representatives: client.representatives || [], contacts: client.contacts || [], addresses: client.addresses || [],
        beneficial_owners: client.beneficial_owners || [], due_diligence: client.due_diligence || initialOnboardingState.due_diligence,
        privacy: client.privacy || initialOnboardingState.privacy, regulatory_profiles: client.education_profile ? { education: client.education_profile } : {},
      } });
      setMetadata(meta);
    }).catch((e) => { if (active) setError(creationError(e)); });
    return () => { active = false; };
  }, [workspace, id]);
  const setObject = (section, value) => dispatch({ type: 'SET_SECTION', section, value });
  const setList = (section, value) => dispatch({ type: 'SET_LIST', section, value });
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await service.complete(workspace, id, buildOnboardingPayload(state)); navigate(`/${workspace}/clients/${id}`); }
    catch (e) { setError(creationError(e)); }
    finally { setSaving(false); }
  };
  return <main className='mx-auto max-w-5xl space-y-5 p-4 md:p-8'>
    <h1 className='text-2xl font-bold'>Complete onboarding / KYC</h1>
    <p>For an existing prospective client after conflict clearance. Saving evidence does not accept instructions or open a matter.</p>
    {error && <p role='alert' className='rounded bg-red-50 p-3 text-red-800'>{error}</p>}
    {!metadata ? <p>Loading onboarding record…</p> : <form className='space-y-5' onSubmit={submit}>
      <LegalIdentityStep state={state} metadata={metadata} lockAccess setClient={(v) => setObject('client', v)} setProfile={(v) => setObject('legal_profile', v)} />
      <RegulatoryProfileStep state={state} metadata={metadata} setClient={(v) => setObject('client', v)} setEducation={(value) => dispatch({ type: 'SET_EDUCATION', value })} />
      <RepresentativesStep state={state} metadata={metadata} setList={(v) => setList('representatives', v)} />
      <ContactsAddressesStep state={state} setSection={setList} />
      <DueDiligenceStep state={state} metadata={metadata} setCDD={(v) => setObject('due_diligence', v)} setOwners={(v) => setList('beneficial_owners', v)} />
      <PrivacyStep state={state} metadata={metadata} setPrivacy={(v) => setObject('privacy', v)} />
      <button type='submit' disabled={saving} className='rounded bg-blue-600 px-5 py-3 text-white'>{saving ? 'Saving…' : 'Save onboarding / KYC evidence'}</button>
    </form>}
  </main>;
}

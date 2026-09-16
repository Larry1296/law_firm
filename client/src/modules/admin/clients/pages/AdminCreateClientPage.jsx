import { useEffect, useReducer, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Field, SelectField, StepPanel } from '../clientCreation/Fields';
import { buildProspectivePayload, onboardingReducer, onboardingStateFromSearch } from '../clientCreation/onboardingState';
import { prospectiveClientService as service, creationError } from '@/modules/clients/shared/prospectiveClientService';

const ACCESS_OPTIONS = [
  { value: 'ASSISTED', id: 'FIRM_MANAGED', label: 'Firm-managed — no portal login' },
  { value: 'PORTAL_ENABLED', id: 'PORTAL_ENABLED', label: 'Portal-enabled — controlled client dashboard access' },
];

export default function AdminCreateClientPage() {
  const location = useLocation();
  const workspace = location.pathname.startsWith('/secretary') ? 'secretary' : 'admin';
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(onboardingReducer, location.search, onboardingStateFromSearch);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  useEffect(() => {
    let active = true;
    service.metadata(workspace).then((data) => { if (active) setMetadata(data); }).catch((e) => { if (active) setError(creationError(e)); });
    return () => { active = false; };
  }, [workspace]);
  const setObject = (section, value) => dispatch({ type: 'SET_SECTION', section, value });
  const client = state.client;
  const kind = client.client_type;
  const portal = client.access_type === 'PORTAL_ENABLED';
  const rep = state.representatives[0];
  const setRep = (value) => dispatch({ type: 'SET_LIST', section: 'representatives', value: value === null ? [] : [{ ...rep, ...value }] });
  const category = metadata?.legal_client_types.find(({ value }) => value === kind);
  const schema = metadata?.prospective_profiles[kind];
  const requiredRep = kind && !['INDIVIDUAL', 'SOLE_PROPRIETORSHIP', 'OTHER_REQUIRES_REVIEW'].includes(kind);
  const showRep = requiredRep || (portal && kind !== 'INDIVIDUAL') || (kind === 'INDIVIDUAL' && !state.due_diligence.acting_for_self) || Boolean(rep);
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!metadata?.intake_privacy) return setError('An approved active firm intake-privacy configuration is required.');
    if (!state.privacy.privacy_notice_delivered) return setError('Confirm delivery of the privacy notice.');
    if (showRep && (!rep?.full_legal_name || !rep?.role_title || !rep?.representative_category)) return setError('Record the representative name and capacity.');
    if (portal && kind !== 'INDIVIDUAL' && (!rep?.is_portal_contact || !rep?.email)) return setError('Select an authorised portal contact and enter their email.');
    setSaving(true);
    try { setCreated((await service.create(workspace, buildProspectivePayload(state, metadata))).client); }
    catch (e) { setError(creationError(e)); }
    finally { setSaving(false); }
  };
  if (created) return <main className='mx-auto max-w-4xl space-y-5 p-4 md:p-8'>
    <h1 className='text-2xl font-bold'>Prospective client created</h1>
    <dl className='grid gap-4 rounded-xl border p-5 sm:grid-cols-2'>{[
      ['Prospective-client reference', created.kyc_drawer_reference || created.id], ['Legal name', created.full_name],
      ['Legal client category', category?.label], ['Access type', ACCESS_OPTIONS.find((item) => item.value === created.access_type)?.label],
      ['Lifecycle', 'Prospective'], ['Portal status', created.access_type === 'ASSISTED' ? 'No login account or invitation' : 'Pending — invitation not sent'],
      ['Compliance status', 'Not started / pending'],
    ].map(([label, value]) => <div key={label}><dt className='text-sm'>{label}</dt><dd className='break-words font-semibold'>{value}</dd></div>)}</dl>
    <p>No matter has been opened. Portal access does not mean the firm has accepted instructions.</p>
    <div className='flex flex-wrap gap-3'>
      <button className='rounded-lg bg-blue-600 px-4 py-3 text-white' onClick={() => navigate(`/${workspace}/clients/${created.id}/conflict-checks/new`)}>Record proposed matter / Start conflict check</button>
      <button className='rounded-lg border px-4 py-3' onClick={() => navigate(`/${workspace}/clients/${created.id}`)}>View prospective client</button>
      <button className='rounded-lg border px-4 py-3' onClick={() => navigate(`/${workspace}/clients`)}>Return to clients</button>
    </div>
  </main>;
  return <main className='mx-auto max-w-4xl space-y-5 p-4 md:p-8'>
    <header><h1 className='text-2xl font-bold'>Create prospective client</h1><p>Save an internal identity for proposed-matter conflict screening. Complete onboarding / KYC after conflict clearance.</p></header>
    {error && <p role='alert' className='rounded-lg bg-red-50 p-3 text-red-800'>{error}</p>}
    {!metadata ? <p>Loading client categories…</p> : <form onSubmit={submit} className='space-y-5'>
      <StepPanel title='Client setup'>
        <fieldset><legend className='mb-2 font-semibold'>Access type</legend><div className='grid gap-3 sm:grid-cols-2'>{ACCESS_OPTIONS.map((option) => <label key={option.id} className='flex items-start gap-3 rounded-lg border p-4'>
          <input type='radio' name='access_type' value={option.id} checked={client.access_type === option.value} onChange={() => dispatch({ type: 'SET_ACCESS_TYPE', value: option.value })} />{option.label}
        </label>)}</div></fieldset>
        <SelectField label='Legal client category' required value={kind} options={metadata.legal_client_types} onChange={(value) => dispatch({ type: 'SET_CLIENT_TYPE', value })} />
        {category && <p>{category.description}</p>}
      </StepPanel>
      {schema && <>
        <StepPanel title='Preliminary identity' description='All details remain unverified. Optional fields may be completed later.'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field label={kind === 'INDIVIDUAL' ? 'Full legal name' : 'Legal / registered name'} required value={client.full_name} onChange={(full_name) => setObject('client', { full_name })} />
            <Field label='Alternative names' value={client.alternative_names} onChange={(alternative_names) => setObject('client', { alternative_names })} />
            <Field label='Safe email' type='email' required={portal && kind === 'INDIVIDUAL'} value={client.email} onChange={(email) => setObject('client', { email })} />
            <Field label='Safe telephone' type='tel' value={client.phone_number} onChange={(phone_number) => setObject('client', { phone_number })} />
            {schema.fields.map(({ key, label, required, options }) => options ? <SelectField key={key} label={label} required={required} options={options} value={state.legal_profile[key]} onChange={(value) => setObject('legal_profile', { [key]: value })} /> : <Field key={key} label={label} required={required} value={state.legal_profile[key]} onChange={(value) => setObject('legal_profile', { [key]: value })} />)}
            {kind === 'LIMITED_LIABILITY_PARTNERSHIP' && <p>Partnership type: Limited Liability Partnership</p>}
            {kind === 'ESTATE' && <p>Grant status: Not yet verified</p>}
            {kind === 'OTHER_REQUIRES_REVIEW' && <>{[['provisional_legal_description', 'Provisional legal description', true], ['classification_review_reason', 'Reason classification remains unresolved', true], ['classification_evidence_reference', 'Supporting classification reference (if available)', false]].map(([key, label, required]) => <Field key={key} label={label} required={required} value={client[key]} onChange={(value) => setObject('client', { [key]: value })} />)}</>}
          </div>
          {kind === 'INDIVIDUAL' && <SelectField label='Acting personally or through a representative' value={state.due_diligence.acting_for_self ? 'SELF' : 'REPRESENTATIVE'} options={[{ value: 'SELF', label: 'Personally' }, { value: 'REPRESENTATIVE', label: 'Through a representative' }]} onChange={(value) => { setObject('due_diligence', { acting_for_self: value === 'SELF' }); setRep(null); }} />}
          {!showRep && ['SOLE_PROPRIETORSHIP', 'OTHER_REQUIRES_REVIEW'].includes(kind) && <button type='button' className='underline' onClick={() => setRep({})}>Add representative / contact</button>}
        </StepPanel>
        {showRep && <StepPanel title='Preliminary representative' description='Record the stated capacity. Authority has not been verified.'><div className='grid gap-4 sm:grid-cols-2'>
          <Field label='Representative name' required value={rep?.full_legal_name} onChange={(full_legal_name) => setRep({ full_legal_name })} />
          <SelectField label='Representative capacity' required value={rep?.representative_category} options={metadata.representative_categories.filter(({ value }) => metadata.prospective_representative_types[kind].includes(value))} onChange={(representative_category) => setRep({ representative_category })} />
          <Field label='Role / capacity description' required value={rep?.role_title} onChange={(role_title) => setRep({ role_title })} />
          <Field label='Representative email' type='email' required={portal && kind !== 'INDIVIDUAL'} value={rep?.email} onChange={(email) => setRep({ email })} />
          <Field label='Representative telephone' type='tel' value={rep?.telephone} onChange={(telephone) => setRep({ telephone })} />
          {portal && kind !== 'INDIVIDUAL' && <Field type='checkbox' label='Use this authorised portal contact' required value={rep?.is_portal_contact} onChange={(is_portal_contact) => setRep({ is_portal_contact })} />}
        </div></StepPanel>}
        <StepPanel title='Privacy notice delivery'><div className='grid gap-4 sm:grid-cols-2'>
          {!metadata.intake_privacy && <p role='alert'>An approved active firm intake-privacy configuration is required before creation.</p>}
          <label className='block text-sm'><span className='mb-1 block font-medium'>Lawful basis</span><input className='w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2' readOnly value={metadata.intake_privacy?.lawful_basis_label || ''} /></label>
          <label className='block text-sm'><span className='mb-1 block font-medium'>Privacy notice version</span><input className='w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2' readOnly value={metadata.intake_privacy?.policy_version || ''} /></label>
          <SelectField label='Delivery method' required options={['PAPER', 'EMAIL', 'SMS', 'VERBAL', 'PORTAL'].map(value => ({value, label: value}))} value={state.privacy.delivery_method} onChange={(delivery_method) => setObject('privacy', { delivery_method })} />
          <p>Acknowledgement is optional and is not consent. The delivering staff member and time are recorded automatically.</p>
          <Field label='Privacy notice delivered' type='checkbox' required value={state.privacy.privacy_notice_delivered} onChange={(privacy_notice_delivered) => setObject('privacy', { privacy_notice_delivered })} />
          <Field label='Acknowledged where appropriate' type='checkbox' value={state.privacy.acknowledged} onChange={(acknowledged) => setObject('privacy', { acknowledged })} />
          {state.privacy.acknowledged && <Field label='Acknowledgement reference' value={state.privacy.acknowledgement_reference} onChange={(acknowledgement_reference) => setObject('privacy', { acknowledgement_reference })} />}
        </div></StepPanel>
        <p>{portal ? 'Portal-enabled records intended access only. Invitation becomes available after conflict clearance and firm acceptance.' : 'No login account or invitation will be created.'} Compliance checks remain not started. No matter will be opened.</p>
        <button type='submit' disabled={saving || !metadata.intake_privacy} className='w-full rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50 sm:w-auto'>{saving ? 'Creating…' : 'Create prospective client'}</button>
      </>}
    </form>}
  </main>;
}

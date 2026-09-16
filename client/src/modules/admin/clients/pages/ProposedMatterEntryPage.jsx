import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Field, SelectField, StepPanel } from '../clientCreation/Fields';
import { prospectiveClientService as service, creationError } from '@/modules/clients/shared/prospectiveClientService';

const newParty = () => ({ name: '', party_type: 'PERSON', role: 'PROPOSED_ADVERSE_PARTY', identification_reference: '', relationship_to_party: '' });
export default function ProposedMatterEntryPage() {
  const { id } = useParams();
  const location = useLocation();
  const workspace = location.pathname.startsWith('/secretary') ? 'secretary' : 'admin';
  const navigate = useNavigate();
  const [options, setOptions] = useState(null);
  const [clientId, setClientId] = useState(id || '');
  const [form, setForm] = useState({ proposed_matter_title: '', proposed_instructions: '', responsible_lawyer_id: '', no_adverse_party_currently_known: false, no_adverse_party_explanation: '' });
  const [parties, setParties] = useState([newParty()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  useEffect(() => {
    let active = true;
    service.options(workspace).then((value) => { if (active) setOptions(value); }).catch((e) => { if (active) setError(creationError(e)); });
    return () => { active = false; };
  }, [workspace]);
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const updateParty = (index, key, value) => setParties((previous) => previous.map((party, position) => position === index ? { ...party, [key]: value } : party));
  const submit = async (event) => {
    event.preventDefault(); setError(''); setSaving(true);
    try { setCreated(await service.proposedMatter(workspace, { client_id: clientId, proposed_matter: { ...form, parties: parties.filter((party) => party.name.trim()) } })); }
    catch (e) { setError(creationError(e)); }
    finally { setSaving(false); }
  };
  if (created) return <main className='mx-auto max-w-4xl space-y-4 p-4 md:p-8'><h1 className='text-2xl font-bold'>Proposed matter recorded</h1><p>Reference: {created.conflict_check.reference_number}</p><p>Ready for conflict screening by the responsible advocate. No conflict decision, acceptance or matter opening has occurred.</p><button className='rounded border px-4 py-2' onClick={() => navigate(`/${workspace}/clients/${created.client_id}`)}>View prospective client</button></main>;
  return <main className='mx-auto max-w-4xl space-y-5 p-4 md:p-8'>
    <h1 className='text-2xl font-bold'>Record proposed matter / Start conflict check</h1>
    <p>Record broad proposed instructions and party identities only. Do not include detailed confidential facts, evidence or strategy before clearance.</p>
    {error && <p role='alert' className='rounded bg-red-50 p-3 text-red-800'>{error}</p>}
    {!options ? <p>Loading firm clients and advocates…</p> : <form className='space-y-5' onSubmit={submit}>
      <StepPanel title='Client / prospective client'>
        <SelectField label='Select existing client / prospect' required value={clientId} onChange={setClientId} options={options.clients} />
        <Link className='inline-block rounded border px-4 py-2' to={`/${workspace}/clients/create`}>Create prospective client</Link>
      </StepPanel>
      <StepPanel title='Proposed instructions'>
        <div className='grid gap-4 sm:grid-cols-2'>
          <Field label='Proposed matter working title' required value={form.proposed_matter_title} onChange={(v) => update('proposed_matter_title', v)} />
          <SelectField label='Responsible advocate' required value={form.responsible_lawyer_id} onChange={(v) => update('responsible_lawyer_id', v)} options={options.advocates} />
        </div>
        <Field label='Broad proposed instructions' required value={form.proposed_instructions} onChange={(v) => update('proposed_instructions', v)} />
      </StepPanel>
      <StepPanel title='Adverse and related parties'>
        {parties.map((party, index) => <fieldset key={index} className='grid gap-3 rounded-lg border p-4 sm:grid-cols-2'><legend>Party {index + 1}</legend>
          <Field label={`Party ${index + 1} name`} required={!form.no_adverse_party_currently_known} value={party.name} onChange={(v) => updateParty(index, 'name', v)} />
          <SelectField label={`Party ${index + 1} role`} value={party.role} onChange={(v) => updateParty(index, 'role', v)} options={[{ value: 'PROPOSED_ADVERSE_PARTY', label: 'Proposed adverse party' }, { value: 'RELATED_ENTITY', label: 'Related entity' }, { value: 'OTHER', label: 'Other related party' }]} />
          <SelectField label={`Party ${index + 1} type`} value={party.party_type} onChange={(v) => updateParty(index, 'party_type', v)} options={[{ value: 'PERSON', label: 'Person' }, { value: 'ORGANISATION', label: 'Entity' }]} />
          <Field label={`Party ${index + 1} identifier (if known)`} value={party.identification_reference} onChange={(v) => updateParty(index, 'identification_reference', v)} />
          <Field label={`Party ${index + 1} relationship`} value={party.relationship_to_party} onChange={(v) => updateParty(index, 'relationship_to_party', v)} />
          <button type='button' className='text-left underline' onClick={() => setParties((value) => value.filter((_, i) => i !== index))}>Remove party {index + 1}</button>
        </fieldset>)}
        <button type='button' className='rounded border px-4 py-2' onClick={() => setParties((value) => [...value, newParty()])}>Add party</button>
        <Field type='checkbox' label='No adverse party currently known' value={form.no_adverse_party_currently_known} onChange={(v) => update('no_adverse_party_currently_known', v)} />
        {form.no_adverse_party_currently_known && <Field label='Explain why no adverse party is currently known' required value={form.no_adverse_party_explanation} onChange={(v) => update('no_adverse_party_explanation', v)} />}
      </StepPanel>
      <button type='submit' disabled={saving} className='rounded bg-blue-600 px-5 py-3 text-white'>{saving ? 'Saving…' : 'Record proposed matter / Start conflict check'}</button>
    </form>}
  </main>;
}

import { useEffect, useState } from 'react';
import { intakePrivacyService as service } from '../services/intakePrivacyService';
import { creationError } from '@/modules/clients/shared/prospectiveClientService';

const emptyDraft = { policy_version: '', notice_text: '', lawful_basis: '', effective_date: '' };
const control = 'w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-[color:var(--text-primary)]';
const timestamp = (value) => value ? new Date(value).toLocaleString() : '—';

export default function AdminSettingsPage() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    service.list().then(result => { if (active) setData(result); }).catch(e => { if (active) setError(creationError(e)); });
    return () => { active = false; };
  }, []);
  const run = async (operation, success) => {
    setBusy(true); setError(''); setMessage('');
    try {
      await operation();
      setData(await service.list());
      setMessage(success);
    } catch (e) { setError(creationError(e)); }
    finally { setBusy(false); }
  };
  const create = event => {
    event.preventDefault();
    run(async () => { await service.create(draft); setDraft(emptyDraft); }, 'Draft version created. Review it below before approving and activating.');
  };
  const field = (name, label, type = 'text') => <label className='block space-y-1'>
    <span>{label} *</span><input className={control} type={type} required maxLength={name === 'policy_version' ? 50 : undefined} value={draft[name]} onChange={e => setDraft({ ...draft, [name]: e.target.value })} />
  </label>;
  return <main className='mx-auto max-w-4xl space-y-6 p-4 text-[color:var(--text-primary)] md:p-8'>
    <header><h1 className='text-2xl font-bold'>Intake Privacy Configuration</h1>
      <p>Manage the privacy notice used when creating prospective clients. Activated versions are preserved; changes require a new version.</p></header>
    {error && <p role='alert' className='rounded-lg bg-red-50 p-3 text-red-800'>{error}</p>}
    {message && <p role='status' className='rounded-lg bg-green-50 p-3 text-green-900'>{message}</p>}
    {!data && !error && <p>Loading privacy configurations…</p>}
    {data && <>
      {!data.results.some(config => config.status === 'ACTIVE') && <p className='rounded-lg bg-amber-50 p-3 text-amber-900'>No active approved configuration. Prospective-client creation is blocked until a version is approved and activated.</p>}
      <form onSubmit={create} className='space-y-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5'>
        <h2 className='text-xl font-semibold'>Create a new version</h2>
        <fieldset disabled={busy} className='space-y-4'>
          <div className='grid gap-4 sm:grid-cols-2'>{field('policy_version', 'Policy version')}{field('effective_date', 'Effective date', 'date')}</div>
          <label className='block space-y-1'><span>Lawful basis *</span><select required className={control} value={draft.lawful_basis} onChange={e => setDraft({ ...draft, lawful_basis: e.target.value })}>
            <option value=''>Select…</option>{data.lawful_bases.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select></label>
          <label className='block space-y-1'><span>Privacy notice text *</span><textarea required rows={7} className={control} value={draft.notice_text} onChange={e => setDraft({ ...draft, notice_text: e.target.value })} /></label>
          <button className='rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50' type='submit'>Create draft</button>
        </fieldset>
      </form>
      <section className='space-y-4'><h2 className='text-xl font-semibold'>Version history</h2>
        <p>Approval and activation happen together, on or after the effective date. Activating a replacement automatically retires the current version.</p>
        {!data.results.length && <p>No versions yet.</p>}
        {data.results.map(config => <article key={config.id} className='space-y-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5'>
          <h3 className='text-lg font-semibold'>{config.policy_version} — {config.status}</h3>
          <p>{config.lawful_basis_label} · Effective {config.effective_date}</p>
          <details><summary className='cursor-pointer'>Privacy notice text</summary><p className='mt-2 whitespace-pre-wrap break-words'>{config.notice_text || 'Notice text was not stored for this legacy version.'}</p></details>
          <dl className='space-y-1 text-sm'>
            {[['Approved', config.approved_at, config.approved_by_name], ['Activated', config.activated_at, config.activated_by_name], ['Retired', config.retired_at, config.retired_by_name]].map(([label, at, by]) => <div key={label}><dt className='inline font-medium'>{label}: </dt><dd className='inline'>{timestamp(at)}{by ? ` · ${by}` : ''}</dd></div>)}
          </dl>
          {config.status === 'DRAFT' && <button disabled={busy} className='rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50' onClick={() => run(() => service.activate(config.id), `Version ${config.policy_version} approved and activated.`)}>Approve and activate {config.policy_version}</button>}
          {config.status === 'ACTIVE' && <><p className='text-sm'>Retiring without a replacement blocks new prospective-client creation.</p><button disabled={busy} className='rounded-lg border border-[color:var(--border)] px-4 py-2 disabled:opacity-50' onClick={() => run(() => service.retire(config.id), `Version ${config.policy_version} retired.`)}>Retire {config.policy_version}</button></>}
        </article>)}
      </section>
    </>}
  </main>;
}

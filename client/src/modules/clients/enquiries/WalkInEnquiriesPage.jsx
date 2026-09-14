import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/TextArea';
import DataTable from '@/components/ui/DataTable';
import service from './walkInEnquiryService';
import { emptyEnquiry, enquiryPayload, validateEnquiry } from './enquiryForm';
import WalkInFields from './WalkInFields';
import { IntakePrivacyConfiguration, IntakePrivacyNotice } from './IntakePrivacy';

const dateText = (value) => new Intl.DateTimeFormat('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const columns = [
  { key: 'reference', label: 'Reference' },
  { key: 'received_at', label: 'Date/time received (Nairobi)', render: dateText },
  { key: 'visitor_name', label: 'Visitor name' },
  { key: 'service_category', label: 'Broad service category' },
  { key: 'urgency_label', label: 'Urgency' },
  { key: 'status_label', label: 'Status' },
  { key: 'received_by_name', label: 'Received by' },
];
const sortRows = (rows) => rows.sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at) || Date.parse(b.created_at) - Date.parse(a.created_at));

export default function WalkInEnquiriesPage({ workspace = 'admin' }) {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyEnquiry);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [privacy, setPrivacy] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [method, setMethod] = useState('SCREEN');
  const [configuring, setConfiguring] = useState(false);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [correcting, setCorrecting] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([service.list(workspace), service.notice(workspace)]).then(([rows, notice]) => {
      if (active) { setEnquiries(rows); setPrivacy(notice); }
    }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load the enquiry register.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace]);

  const update = (name, value) => setForm((previous) => ({ ...previous, [name]: value,
    ...(name === 'enquiry_for' ? { authority_status: value === 'SELF' ? 'NOT_REQUIRED' : 'PENDING' } : {}),
  }));
  const failure = (err, fallback) => {
    setErrors(err.response?.data?.errors || {});
    setError(err.response?.data?.message || fallback);
  };
  const start = async () => {
    setSaving(true); setError(''); setErrors({}); setSuccess('');
    try {
      const latest = await service.notice(workspace); setPrivacy(latest);
      if (latest.ready) { setForm(emptyEnquiry()); setReceipt(null); setMethod('SCREEN'); setSelected(null); setCorrecting(false); setOpen(true); }
    } catch (err) { failure(err, 'Unable to load the current notice.'); }
    finally { setSaving(false); }
  };
  const deliver = async () => {
    setSaving(true); setError('');
    try { setReceipt(await service.deliver(workspace, { version: privacy.notice.version, method, acknowledged: form.privacy_acknowledged })); }
    catch (err) { failure(err, 'Unable to record notice delivery.'); }
    finally { setSaving(false); }
  };
  const showHistory = async (row) => {
    setSaving(true); setError(''); setOpen(false); setCorrecting(false); setSelected(null);
    try { setHistory(await service.history(workspace, row.id)); setSelected(row); }
    catch (err) { failure(err, 'Unable to load enquiry history.'); }
    finally { setSaving(false); }
  };
  const beginCorrection = () => {
    const values = emptyEnquiry();
    Object.keys(values).forEach((key) => { if (selected[key] != null) values[key] = selected[key]; });
    values.related_party_names = (selected.related_party_names || []).join('\n');
    values.override_received_time = false; values.received_at = ''; values.received_at_reason = '';
    // Older records are not silently assigned beneficiary or authority facts.
    values.enquiry_for = selected.enquiry_for || ''; values.authority_status = selected.authority_status || '';
    setForm(values); setReason(''); setErrors({}); setCorrecting(true); setOpen(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    const validation = validateEnquiry(form, correcting);
    if (correcting && !reason.trim()) validation.reason = 'A correction reason is required.';
    if (!correcting && !receipt) validation.notice_receipt = 'Record privacy notice delivery first.';
    setErrors(validation); setError(''); setSuccess('');
    if (Object.keys(validation).length) return;
    setSaving(true);
    try {
      const payload = enquiryPayload(form);
      let enquiry;
      if (correcting) {
        delete payload.privacy_acknowledged;
        if (!payload.received_at) delete payload.received_at_reason;
        const changes = Object.fromEntries(Object.entries(payload).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(selected[key] ?? '')));
        enquiry = await service.correct(workspace, selected.id, { revision: selected.revision, reason: reason.trim(), changes });
        setSelected(enquiry); setHistory(await service.history(workspace, enquiry.id));
      } else enquiry = await service.create(workspace, { ...payload, notice_receipt: receipt.id });
      setEnquiries((rows) => sortRows([enquiry, ...rows.filter((row) => row.id !== enquiry.id)]));
      setSuccess(`${enquiry.reference} — ${correcting ? 'Correction recorded' : enquiry.status_label}`);
      setForm(emptyEnquiry()); setReceipt(null); setOpen(false); setCorrecting(false);
    } catch (err) { failure(err, 'Unable to record the enquiry. Please try again.'); }
    finally { setSaving(false); }
  };
  const renewNotice = async () => {
    setSaving(true); setError(''); setErrors({});
    try {
      const current = await service.notice(workspace); setPrivacy(current); setReceipt(null);
      update('privacy_acknowledged', false);
      if (!current.ready) setOpen(false);
    } catch (err) { failure(err, 'Unable to reload the notice.'); }
    finally { setSaving(false); }
  };
  const reloadCorrection = async () => {
    setSaving(true); setError(''); setErrors({});
    try {
      const rows = await service.list(workspace); setEnquiries(rows);
      const current = rows.find((row) => row.id === selected.id);
      if (!current) throw new Error('Record unavailable');
      setSelected(current); setHistory(await service.history(workspace, current.id));
      setOpen(false); setCorrecting(false);
      setSuccess('Latest enquiry loaded. Review its history before reapplying your correction.');
    } catch (err) { failure(err, 'Unable to reload the enquiry.'); }
    finally { setSaving(false); }
  };
  const saveConfig = async (values) => {
    setSaving(true); setError('');
    try { await service.configure(workspace, values); setPrivacy(await service.notice(workspace)); setConfiguring(false); }
    catch (err) { failure(err, 'Unable to save privacy configuration.'); }
    finally { setSaving(false); }
  };

  return <main className='mx-auto min-w-0 w-full max-w-7xl space-y-6 p-4 text-text-primary-light dark:text-text-primary-dark md:p-8 [overflow-wrap:anywhere]'>
    <header className='flex flex-wrap items-start justify-between gap-4'>
      <div><h1 className='text-2xl font-bold'>Walk-in Enquiries</h1><p className='mt-2 text-sm'>Step 1: Record minimal visitor and enquiry details for preliminary review.</p></div>
      {!open && <Button disabled={loading || saving || !privacy?.ready} onClick={start}>New walk-in enquiry</Button>}
    </header>
    <Card className='border-amber-400 p-5'><p>Recording an enquiry does not mean that the firm has accepted instructions or created an advocate–client engagement. Do not record a detailed confidential narrative or upload documents at this stage.</p></Card>
    {privacy && !privacy.ready && <div role='alert' className='rounded-lg border border-amber-500 p-4'>New enquiries are blocked until {workspace === 'secretary' ? 'the firm administrator completes' : 'you complete'} the privacy-notice configuration. Missing: {privacy.missing_fields.join(', ')}.</div>}
    {workspace === 'admin' && privacy && !open && !configuring && <Button variant='secondary' onClick={() => setConfiguring(true)}>Configure intake privacy notice</Button>}
    {configuring && <IntakePrivacyConfiguration initial={privacy?.configuration} save={saveConfig} close={() => setConfiguring(false)} busy={saving} />}
    {success && <div role='status' className='rounded-lg bg-green-50 p-4 text-green-900 dark:bg-green-950 dark:text-green-200'>{success}</div>}
    {error && <div role='alert' className='rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200'>{error}</div>}
    {selected && !open && <Card className='min-w-0 space-y-4 p-5'>
      <h2 className='text-xl font-semibold'>Enquiry details and correction history — {selected.reference}</h2>
      <dl className='grid min-w-0 gap-3 sm:grid-cols-2'>
        {['visitor_name', 'safe_contact', 'enquiry_for', 'prospective_person_name', 'organisation_name', 'visitor_capacity', 'authority_status', 'description', 'received_at_reason', 'notice_version', 'notice_delivery_method'].map((key) => <div key={key} className='min-w-0'><dt className='text-sm font-semibold'>{key.replaceAll('_', ' ')}</dt><dd className='whitespace-pre-wrap'>{selected[key] || 'Not recorded'}</dd></div>)}
      </dl>
      <p>Notice delivered: {selected.notice_delivered_at ? dateText(selected.notice_delivered_at) : 'Not recorded — legacy enquiry; no retrospective acknowledgement inferred'}.</p>
      {selected.notice_snapshot?.sections && <details><summary className='cursor-pointer font-semibold'>Notice as delivered</summary>{selected.notice_snapshot.sections.map((part) => <div key={part.title} className='mt-3'><h3 className='font-semibold'>{part.title}</h3><p>{part.text}</p></div>)}</details>}
      {history.length === 0 ? <p>No corrections recorded.</p> : history.map((entry) => <section key={entry.id} className='space-y-2 rounded-xl border p-4'>
        <h3 className='font-semibold'>Revision {entry.revision} · {entry.actor_name} · {dateText(entry.recorded_at)} (Nairobi)</h3><p>Reason: {entry.reason}</p>
        {Object.keys(entry.replacement_values).map((key) => <div key={key} className='grid min-w-0 gap-2 sm:grid-cols-2'><p><strong>{key.replaceAll('_', ' ')} — previous:</strong> {JSON.stringify(entry.previous_values[key])}</p><p><strong>Replacement:</strong> {JSON.stringify(entry.replacement_values[key])}</p></div>)}
      </section>)}
      <div className='flex flex-wrap gap-3'>{workspace === 'admin' && <Button onClick={beginCorrection}>Correct this enquiry</Button>}<Button variant='secondary' onClick={() => setSelected(null)}>Close details</Button></div>
    </Card>}
    {errors.revision && <div role='alert' className='space-y-3 rounded-xl border border-amber-500 p-4'><p>{errors.revision} Your correction has not been saved. Reload and review the latest record before reapplying it.</p><Button disabled={saving} onClick={reloadCorrection}>Reload latest enquiry</Button></div>}
    {open && <Card className='min-w-0 space-y-5 p-5 md:p-7'>
      <h2 className='text-xl font-semibold'>{correcting ? `Correct enquiry — ${selected.reference}` : 'New walk-in enquiry'}</h2>
      {!correcting && <IntakePrivacyNotice notice={privacy.notice} receipt={receipt} acknowledged={form.privacy_acknowledged} setAcknowledged={(value) => update('privacy_acknowledged', value)} method={method} setMethod={setMethod} deliver={deliver} busy={saving} />}
      {(correcting || receipt) && <form onSubmit={submit} noValidate>
        <fieldset disabled={saving} className='min-w-0 space-y-5'>
          <WalkInFields form={form} update={update} errors={errors} correcting={correcting} />
          {correcting && <div><Textarea label='Correction reason' aria-label='Correction reason' value={reason} onChange={setReason} maxLength={500} required /><p className='text-sm'>Previous and replacement values, reason, actor and time remain in restricted history.</p>{errors.reason && <p className='text-red-700'>{errors.reason}</p>}</div>}
          {(errors.notice_receipt || errors.privacy_notice) && <div role='alert' className='space-y-3'><p>{errors.notice_receipt || errors.privacy_notice}</p><Button type='button' onClick={renewNotice} disabled={saving}>Reload privacy notice</Button></div>}
          <div className='flex flex-wrap gap-4'><Button type='submit' disabled={saving} loading={saving} loadingText='Recording…'>{correcting ? 'Record correction' : 'Record enquiry'}</Button></div>
        </fieldset>
      </form>}
      <Button type='button' variant='secondary' onClick={() => { setOpen(false); setCorrecting(false); setErrors({}); }} disabled={saving}>Cancel</Button>
    </Card>}
    <DataTable fitToContainer desktopBreakpoint='xl' columns={columns} data={enquiries} loading={loading} emptyMessage='No walk-in enquiries recorded yet.' actions={(row) => <button type='button' disabled={saving} onClick={() => showHistory(row)} className='rounded-lg px-2 py-2 text-sm font-semibold underline focus-visible:ring-2'>View details</button>} />
  </main>;
}

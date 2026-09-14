import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Inputs';
import Textarea from '@/components/ui/TextArea';

const privacyFields = {
  policy_version: 'Policy version', lawful_basis_explanation: 'Lawful basis rationale, including representatives and third-party names',
  mandatory_legal_requirement: 'Any law requiring collection, or state that none applies',
  recipients: 'Recipient identities/categories, processors and sharing safeguards',
  retention: 'Retention period, trigger and lawful exceptions', privacy_contact: 'Privacy contact name or role and contact details',
  transfers: 'Overseas transfers, destinations and safeguards, or explicit no-transfer statement',
  safeguards: 'Actual technical and organisational security safeguards',
};

export function IntakePrivacyConfiguration({ initial, save, close, busy }) {
  const [values, setValues] = useState(initial || { lawful_basis: 'LEGITIMATE_INTERESTS' });
  return <Card className='min-w-0 p-5'>
    <h2 className='mb-4 text-xl font-semibold'>Firm intake privacy configuration</h2>
    <p className='mb-4 text-sm'>The firm owner must supply approved policy facts. Controller name, email, telephone and physical address come from the current firm profile. Each update requires a new policy version. Consent-based processing is not supported by this capture form.</p>
    <form onSubmit={(event) => { event.preventDefault(); save(values); }} className='space-y-4'>
      <fieldset disabled={busy} className='grid min-w-0 gap-4 md:grid-cols-2'>
        <div className='min-w-0'><label htmlFor='lawful-basis'>Approved lawful basis</label>
          <select id='lawful-basis' className='mt-2 w-full min-w-0 rounded-lg border bg-white p-3 dark:bg-slate-900' value={values.lawful_basis} onChange={(event) => setValues({ ...values, lawful_basis: event.target.value })}>
            <option value='LEGITIMATE_INTERESTS'>Legitimate interests — section 30(1)(b)(vii)</option>
            <option value='PRE_CONTRACT'>Pre-contract steps — section 30(1)(b)(i)</option>
          </select>
        </div>
        {Object.entries(privacyFields).map(([name, label]) => name === 'policy_version'
          ? <Input key={name} label={label} value={values[name] || ''} onChange={(event) => setValues({ ...values, [name]: event.target.value })} required maxLength={80} format='none' />
          : <Textarea key={name} label={label} aria-label={label} value={values[name] || ''} onChange={(value) => setValues({ ...values, [name]: value })} required maxLength={4000} />)}
      </fieldset>
      <div className='flex flex-wrap gap-3'><Button type='submit' disabled={busy}>Save approved notice configuration</Button><Button type='button' variant='secondary' onClick={close}>Cancel configuration</Button></div>
    </form>
  </Card>;
}

export function IntakePrivacyNotice({ notice, receipt, acknowledged, setAcknowledged, method, setMethod, deliver, busy }) {
  return <section aria-label='Intake privacy notice' className='min-w-0 space-y-4 rounded-xl border border-border-light p-4 [overflow-wrap:anywhere] dark:border-border-dark'>
    <h3 className='text-lg font-semibold'>Intake privacy notice — Kenya Data Protection Act</h3>
    <p className='text-sm'>Version: {notice.version}</p>
    {notice.sections.map((section) => <div key={section.title}><h4 className='font-semibold'>{section.title}</h4><p className='mt-1 whitespace-pre-wrap text-sm'>{section.text}</p></div>)}
    {receipt ? <p className='text-sm'>Notice delivery recorded: {receipt.method} · {new Intl.DateTimeFormat('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(receipt.delivered_at))} (Nairobi). Acknowledgement is not consent.</p>
      : <div className='space-y-4'>
        <label className='block' htmlFor='notice-method'>How was the notice provided?</label>
        <select id='notice-method' value={method} onChange={(event) => setMethod(event.target.value)} className='w-full min-w-0 rounded-lg border bg-white p-3 dark:bg-slate-900'>
          <option value='SCREEN'>Displayed to visitor</option><option value='READ_ALOUD'>Read and explained to visitor</option><option value='PAPER'>Printed notice provided to visitor</option>
        </select>
        <label className='flex items-start gap-3'><input type='checkbox' checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className='mt-1 h-5 w-5 shrink-0' />The visitor acknowledges receipt of this privacy notice. This is not consent.</label>
        <Button type='button' disabled={!acknowledged || busy} onClick={deliver}>Confirm notice delivery and continue</Button>
      </div>}
  </section>;
}

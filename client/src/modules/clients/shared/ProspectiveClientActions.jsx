import { useState } from 'react';
import { Link } from 'react-router-dom';
import { prospectiveClientService as service, creationError } from './prospectiveClientService';

export default function ProspectiveClientActions({ client, workspace }) {
  const [invited, setInvited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (client.lifecycle_status !== 'PROSPECTIVE') return null;
  const cleared = client.proposed_matters?.some((item) => item.status === 'CLEARED');
  const accepted = client.proposed_matters?.some((item) => item.status === 'CLEARED' && item.acceptance_decision === 'ACCEPTED');
  const invite = async () => {
    setBusy(true); setError('');
    try { await service.invite(workspace, client.id); setInvited(true); }
    catch (e) { setError(creationError(e)); }
    finally { setBusy(false); }
  };
  return <section className='space-y-3 rounded-xl border p-4'>
    <div className='flex flex-wrap gap-3'>
      <Link className='rounded bg-blue-600 px-4 py-2 text-white' to={`/${workspace}/clients/${client.id}/conflict-checks/new`}>Record proposed matter / Start conflict check</Link>
      {cleared && <Link className='rounded border px-4 py-2' to={`/${workspace}/clients/${client.id}/complete-onboarding`}>Complete onboarding / KYC</Link>}
      {accepted && client.portal_status === 'PORTAL_ENABLED_PENDING' && !invited && <button className='rounded border px-4 py-2' disabled={busy} onClick={invite}>{busy ? 'Sending…' : 'Send portal invitation'}</button>}
    </div>
    {!cleared && <p className='text-sm'>Complete onboarding / KYC becomes available after conflict clearance.</p>}
    {invited && <p role='status'>Portal invitation sent. The client remains prospective.</p>}
    {error && <p role='alert'>{error}</p>}
  </section>;
}

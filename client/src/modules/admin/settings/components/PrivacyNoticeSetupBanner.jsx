import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { withCriticalAction } from '@/core/utils/confirmationContext';
import { confirmAction } from '@/core/utils/themedSwal';
import { creationError } from '@/modules/clients/shared/prospectiveClientService';
import { intakePrivacyService as service } from '../services/intakePrivacyService';

// A firm cannot record its first client until the owner has approved a privacy
// notice (Data Protection Act, 2019). This offers a prefilled standard notice to
// read and approve; nothing is approved without the owner seeing the text.
// `active` comes from the dashboard; the notice itself is loaded (and the viewing
// audited) only when the owner opens it.
export default function PrivacyNoticeSetupBanner({ active }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { data, error: loadError } = useQuery({ queryKey: ['intake-privacy-configs'], queryFn: service.list, enabled: open && active === false });

  if (active !== false) return null;
  const notice = data?.standard_notice;
  const basis = data?.lawful_bases.find((item) => item.value === notice?.lawful_basis)?.label || notice?.lawful_basis;

  const approve = async () => {
    const confirmation = await confirmAction({
      title: `Approve privacy notice ${notice.policy_version}?`,
      text: 'Every new client will be given this notice from today. You can replace it later with a new version in Settings.',
      confirmText: 'Approve notice',
    });
    if (!confirmation) return;
    setBusy(true); setError('');
    try {
      const draft = await service.create(notice);
      await withCriticalAction({ confirmation }, () => service.activate(draft.id));
      await queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    } catch (e) {
      if (!e?.isActionCancelled) setError(creationError(e));
    } finally { setBusy(false); }
  };

  return (
    <section className='mx-4 mb-6 rounded-xl border border-red-300 bg-red-50 p-5 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100 md:mx-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-lg font-semibold'>Before your first client: approve your privacy notice</h2>
          <p className='text-sm'>The law requires you to tell each client how you use their personal data. Nobody can record a client until a notice is approved.</p>
        </div>
        {!open && <button type='button' className='w-fit shrink-0 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800' onClick={() => setOpen(true)}>Read the notice</button>}
      </div>
      {open && !notice && <p className='mt-4 text-sm'>{loadError ? creationError(loadError) : 'Loading the notice…'}</p>}
      {open && notice && <div className='mt-4 space-y-3'>
        <p className='text-sm'>Version {notice.policy_version} · {basis} · From {notice.effective_date}</p>
        <p className='whitespace-pre-wrap break-words rounded-lg border border-red-200 bg-white p-4 text-sm text-gray-900 dark:border-red-900 dark:bg-gray-950 dark:text-gray-100'>{notice.notice_text}</p>
        {error && <p role='alert' className='text-sm font-semibold'>{error}</p>}
        <div className='flex flex-wrap items-center gap-3'>
          <button type='button' disabled={busy} className='rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-50' onClick={approve}>{busy ? 'Approving…' : 'Approve this notice'}</button>
          <Link to='/admin/settings' className='text-sm font-semibold underline'>Write your own in Settings</Link>
        </div>
      </div>}
    </section>
  );
}

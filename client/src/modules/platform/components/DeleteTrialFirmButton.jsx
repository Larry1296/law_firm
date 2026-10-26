import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import platformService from '../services/platformService';
import { Button, ErrorNotice } from './ui';

export default function DeleteTrialFirmButton({ firm, onDeleted }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!firm.can_delete_trial) return null;
  const remove = async () => {
    const answer = await Swal.fire({
      icon: 'warning', titleText: `Permanently delete ${firm.name}?`,
      text: 'This removes the firm, its records, uploads and accounts used only by this firm. This cannot be undone.',
      input: 'text', inputLabel: 'Type the exact firm name to confirm',
      inputValidator: (value) => value === firm.name ? undefined : 'Enter the exact firm name.',
      showCancelButton: true, confirmButtonText: 'Permanently delete firm',
      confirmButtonColor: '#dc2626',
    });
    if (!answer.isConfirmed) return;
    setBusy(true); setError('');
    try {
      const result = await platformService.deleteTrialFirm(firm.id, answer.value, { confirmation: answer.confirmation });
      queryClient.removeQueries({ queryKey: ['platform', 'firm', firm.id], exact: true });
      queryClient.invalidateQueries({ queryKey: ['platform'] });
      onDeleted?.();
      await Swal.fire({
        icon: result.file_cleanup_pending ? 'warning' : 'success', title: 'Firm deleted',
        text: result.file_cleanup_pending
          ? 'The firm and its accounts are removed. Some stored files await cleanup; the platform operator must retry pending file removals.'
          : 'The trial firm and its data have been permanently removed.',
      });
    } catch (err) { if (err?.isActionCancelled) return;  setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  };
  return <div onClick={(event) => event.stopPropagation()}>
    <Button variant='danger' disabled={busy} onClick={remove}><Trash2 size={14} />{busy ? 'Deleting…' : 'Delete trial firm'}</Button>
    {error && <ErrorNotice>{error}</ErrorNotice>}
  </div>;
}

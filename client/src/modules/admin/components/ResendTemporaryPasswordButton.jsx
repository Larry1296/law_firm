import { useMutation } from '@tanstack/react-query';
import axios from '@/core/api/axios';
import Button3D from '@/components/ui/Button3D';
import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { withConfirmation } from '@/core/utils/confirmationContext';

export default function ResendTemporaryPasswordButton({ email, clientId, disabled = false }) {
  const mutation = useMutation({
    mutationFn: async ({ confirmation } = {}) => (await axios.post('/admin/staff/temporary-password/',
      withConfirmation({ confirmation }, clientId ? { client_id: clientId } : { email }))).data,
    onSuccess: (result) => {
      const box = document.createElement('div');
      const detail = document.createElement('p');
      detail.textContent = result.detail;
      const account = document.createElement('p');
      account.textContent = `Sign-in email: ${result.email}`;
      const label = document.createElement('label');
      label.textContent = 'Temporary password';
      const password = document.createElement('input');
      password.className = 'form-control mt-2';
      password.readOnly = true;
      password.value = result.temp_password;
      password.addEventListener('click', () => password.select());
      label.append(password);
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'btn btn-secondary mt-3';
      copy.textContent = 'Copy password';
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(result.temp_password);
          copy.textContent = 'Copied';
        } catch {
          password.focus();
          password.select();
          copy.textContent = 'Select and copy the password above';
        }
      });
      const hint = document.createElement('p');
      hint.className = 'mt-3 text-sm';
      hint.textContent = 'Copy this password before closing. It is shown here only once. The account holder must change it at sign-in.';
      box.append(detail, account, label, copy, hint);
      Swal.fire({ icon: 'success', title: 'Temporary password ready', html: box, confirmButtonText: 'Done' });
    },
    onError: (error) => { if (error?.isActionCancelled) return; return Swal.fire({ icon: 'error', title: 'Password was not sent', text: getApiErrorMessage(error) }); },
  });
  const resend = async () => {
    const result = await Swal.fire({
      icon: 'warning', titleText: 'Send a temporary password?',
      text: 'This replaces the selected account’s password. Check the account before continuing.',
      showCancelButton: true, confirmButtonText: 'Send temporary password',
    });
    if (result.isConfirmed) mutation.mutate({ confirmation: result.confirmation });
  };
  return <Button3D type='button' className='mt-3' disabled={disabled || mutation.isPending} onClick={resend}>
    {mutation.isPending ? 'Sending…' : 'Resend temporary password'}
  </Button3D>;
}

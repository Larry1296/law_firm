import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus, Trash2 } from 'lucide-react';

import Brand from '@/components/ui/Brand';
import useAuth from '@/core/hooks/useAuth';
import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import adminFirmService from '@/modules/admin/firm/services/adminFirmService';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
// Formats the server can read; SVG cannot be squared and resized.
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

/** The firm's logo, as every sidebar shows it, with controls to change or remove it. */
export default function FirmLogoField() {
  const { user, updateFirm } = useAuth();
  const inputRef = useRef(null);
  const hasLogo = Boolean(user?.firm?.logo_url);

  const onDone = (title) => (firm) => {
    updateFirm(firm);
    Swal.fire({ icon: 'success', title, timer: 1600, showConfirmButton: false });
  };
  const onError = (error) => Swal.fire({
    icon: 'error',
    title: 'Logo not saved',
    text: getApiErrorMessage(error, 'Could not save the logo right now.'),
  });

  const upload = useMutation({ mutationFn: adminFirmService.uploadLogo, onSuccess: onDone('Logo updated'), onError });
  const remove = useMutation({ mutationFn: adminFirmService.removeLogo, onSuccess: onDone('Logo removed'), onError });
  const busy = upload.isPending || remove.isPending;

  const choose = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      onError({ message: 'Choose a PNG, JPG, WebP or GIF image.' });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      onError({ message: 'The logo must be 2 MB or smaller.' });
      return;
    }
    upload.mutate(file);
  };

  const confirmRemove = async () => {

    remove.mutate();
  };

  return (
    <div className='flex flex-col gap-5 sm:flex-row sm:items-center'>
      <div className='w-24 shrink-0'>
        <Brand size='h-24 w-24' showText={false} />
      </div>
      <div className='space-y-3'>
        <div>
          <h2 className='text-xl font-bold'>Firm logo</h2>
          <p className='text-sm text-[color:var(--text-muted)]'>
            Any shape works. It is trimmed and squared automatically, so it fits every place it appears at the same size.
            PNG, JPG, WebP or GIF, up to 2 MB.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <input ref={inputRef} type='file' accept={ACCEPTED_TYPES.join(',')} className='sr-only' onChange={choose} aria-label='Upload firm logo' />
          <button type='button' onClick={() => inputRef.current?.click()} disabled={busy} className='inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60 dark:bg-sky-600'>
            <ImagePlus size={16} aria-hidden='true' /> {upload.isPending ? 'Uploading…' : hasLogo ? 'Change logo' : 'Upload logo'}
          </button>
          {hasLogo && (
            <button type='button' onClick={confirmRemove} disabled={busy} className='inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold disabled:opacity-60'>
              <Trash2 size={16} aria-hidden='true' /> {remove.isPending ? 'Removing…' : 'Remove'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

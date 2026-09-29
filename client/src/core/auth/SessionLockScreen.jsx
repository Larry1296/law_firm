import { useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { LockKeyhole } from 'lucide-react';
import { QueryClientContext } from '@tanstack/react-query';

import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

/**
 * Covers every signed-in page once the session has expired on an idle
 * screen. The page underneath is fully hidden so client and case details
 * cannot be read off an unattended computer.
 */
export default function SessionLockScreen({ user, onUnlock, onSignOut }) {
  const queryClient = useContext(QueryClientContext);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [unlocking, setUnlocking] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setUnlocking(true);
    setError(null);
    try {
      await onUnlock(password);
      setPassword('');
      // Anything that failed while the screen was locked loads again.
      queryClient?.invalidateQueries();
    } catch (err) {
      setError(err.response ? getApiErrorMessage(err, 'Could not unlock.') : err.message);
    } finally {
      setUnlocking(false);
    }
  };

  return createPortal(
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='session-lock-title'
      className='fixed inset-0 z-[10000] grid place-items-center overflow-y-auto bg-[color:var(--bg)] px-4 py-10'
    >
      <form onSubmit={handleSubmit} className='form-card form-card--narrow'>
        <span className='form-eyebrow inline-flex items-center gap-2'>
          <LockKeyhole size={14} aria-hidden='true' /> Session locked
        </span>
        <h1 id='session-lock-title' className='form-title'>Welcome back</h1>
        <p className='form-lead'>
          Your session expired while this screen was unattended. Enter your password to carry on where you left off.
        </p>
        {error && <p role='alert' className='form-alert'>{error}</p>}

        <div className='rounded-xl border border-[color:var(--border)] px-4 py-3 text-sm'>
          <p className='font-semibold'>{user.full_name}</p>
          <p className='text-[color:var(--text-muted)]'>{user.email}</p>
        </div>

        <FloatingInput
          label='Password'
          name='session-lock-password'
          type='password'
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete='current-password'
          autoFocus
          required
        />

        <Button3D type='submit' className='w-full' disabled={unlocking || !password}>
          {unlocking ? 'Unlocking…' : 'Unlock'}
        </Button3D>
        <Button3D variant='outlineLight' className='w-full' onClick={onSignOut}>
          Sign out
        </Button3D>
      </form>
    </div>,
    document.body,
  );
}

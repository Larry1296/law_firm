import { useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LockKeyhole } from 'lucide-react';
import { QueryClientContext } from '@tanstack/react-query';

import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

export const UNLOCK_PIN_LENGTH = 6;

/**
 * Covers every signed-in page when its session token expires or the user locks
 * the workspace. The page underneath keeps its state but is fully hidden, so
 * client and case details cannot be read off the screen until the user unlocks.
 * Users with an unlock PIN unlock the moment the last digit is typed.
 */
export default function SessionLockScreen({ user, onUnlock, onSignOut }) {
  const queryClient = useContext(QueryClientContext);
  const [usePin, setUsePin] = useState(!!user.has_unlock_pin);
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const pinInput = useRef(null);

  const attemptUnlock = async (credentials) => {
    setUnlocking(true);
    setError(null);
    try {
      await onUnlock(credentials);
      setPassword('');
      // Anything that failed while the screen was locked loads again.
      queryClient?.invalidateQueries();
    } catch (err) { if (err?.isActionCancelled) return;
      setError(err.response ? getApiErrorMessage(err, 'Could not unlock.') : err.message);
      setPin('');
      pinInput.current?.focus();
    } finally {
      setUnlocking(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    attemptUnlock({ password });
  };

  const handlePinChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, UNLOCK_PIN_LENGTH);
    setPin(digits);
    if (digits.length === UNLOCK_PIN_LENGTH && !unlocking) attemptUnlock({ pin: digits });
  };

  const switchTo = (pinMode) => {
    setUsePin(pinMode);
    setError(null);
    setPin('');
    setPassword('');
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
          <LockKeyhole size={14} aria-hidden='true' /> Workspace locked
        </span>
        <h1 id='session-lock-title' className='form-title'>Welcome back</h1>
        <p className='form-lead'>
          {usePin
            ? 'Enter your 6-digit PIN to carry on where you left off; nothing on this page is lost.'
            : 'Enter your password to carry on where you left off; nothing on this page is lost.'}
        </p>
        {error && <p role='alert' className='form-alert'>{error}</p>}

        <div className='rounded-xl border border-[color:var(--border)] px-4 py-3 text-sm'>
          <p className='font-semibold'>{user.full_name}</p>
          <p className='text-[color:var(--text-muted)]'>{user.email}</p>
        </div>

        {usePin ? (
          <label className='block'>
            <span className='sr-only'>Unlock PIN</span>
            <input
              ref={pinInput}
              type='password'
              inputMode='numeric'
              pattern='[0-9]*'
              autoComplete='off'
              maxLength={UNLOCK_PIN_LENGTH}
              value={pin}
              onChange={handlePinChange}
              disabled={unlocking}
              autoFocus
              aria-label='Unlock PIN'
              className='sr-only'
            />
            {/* Six boxes that fill as digits are typed; clicking them focuses the hidden field. */}
            <span className='flex justify-center gap-2' aria-hidden='true' onClick={() => pinInput.current?.focus()}>
              {Array.from({ length: UNLOCK_PIN_LENGTH }, (_, index) => (
                <span
                  key={index}
                  className={`grid h-12 w-10 place-items-center rounded-lg border text-xl ${
                    index === pin.length ? 'border-[color:var(--brand-primary)]' : 'border-[color:var(--border)]'
                  }`}
                >
                  {index < pin.length ? '•' : ''}
                </span>
              ))}
            </span>
            {unlocking && <span className='mt-2 block text-center text-sm'>Unlocking…</span>}
          </label>
        ) : (
          <>
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
          </>
        )}

        {user.has_unlock_pin && (
          <button
            type='button'
            className='text-sm font-medium text-[color:var(--brand-primary)] hover:underline'
            onClick={() => switchTo(!usePin)}
          >
            {usePin ? 'Use my password instead' : 'Use my PIN instead'}
          </button>
        )}
        <Button3D variant='outlineLight' className='w-full' onClick={onSignOut}>
          Sign out
        </Button3D>
      </form>
    </div>,
    document.body,
  );
}

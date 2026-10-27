import { useContext, useState } from 'react';
import { KeyRound } from 'lucide-react';

import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import FloatingInput from '@/components/ui/FloatingInput';
import { UNLOCK_PIN_LENGTH } from '@/core/auth/SessionLockScreen';
import AuthContext from '@/core/store/AuthContext';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import Swal, { confirmAction } from '@/core/utils/themedSwal';
import authService from '@/modules/auth/service/authService';

const EMPTY_FORM = { current_password: '', pin: '', confirm_pin: '' };
const digitsOnly = (value) => value.replace(/\D/g, '').slice(0, UNLOCK_PIN_LENGTH);

/** Set, change or remove the 6-digit PIN that unlocks a locked workspace. */
export default function UnlockPinCard() {
  const { user, refreshUser } = useContext(AuthContext) || {};
  const hasPin = !!user?.has_unlock_pin;
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.pin !== form.confirm_pin) {
      setError('The two PINs do not match.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await authService.setUnlockPin({ current_password: form.current_password, pin: form.pin });
      setForm(EMPTY_FORM);
      await refreshUser();
      await Swal.fire({ icon: 'success', title: 'Unlock PIN saved', text: 'Your workspace now unlocks as soon as you type your PIN.' });
    } catch (err) { if (err?.isActionCancelled) return;
      setError(getApiErrorMessage(err, 'Could not save the PIN.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    const confirmed = await confirmAction({
      title: 'Remove your unlock PIN?',
      text: 'You will unlock your workspace with your password instead.',
      confirmText: 'Remove PIN',
      tone: 'warning',
    });
    if (!confirmed) return;
    try {
      await authService.removeUnlockPin();
      await refreshUser();
    } catch (err) { if (err?.isActionCancelled) return;
      setError(getApiErrorMessage(err, 'Could not remove the PIN.'));
    }
  };

  return (
    <Card className='p-6'>
      <div className='mb-2 flex items-center gap-2'>
        <KeyRound className='text-[color:var(--brand-primary)]' size={20} />
        <h3 className='font-semibold'>Unlock PIN</h3>
      </div>
      <p className='mb-4 text-sm text-[color:var(--text-muted)]'>
        {hasPin
          ? 'Your locked workspace opens as soon as you type your 6-digit PIN. Three wrong PINs sign you out and remove it.'
          : 'Set a 6-digit PIN to unlock your workspace quickly after it locks, without typing your full password.'}
      </p>
      {error && <p role='alert' className='form-alert mb-4'>{error}</p>}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <FloatingInput
          label='Current Password'
          name='unlock-pin-password'
          type='password'
          autoComplete='current-password'
          value={form.current_password}
          onChange={(event) => updateField('current_password', event.target.value)}
          required
        />
        <FloatingInput
          label={hasPin ? 'New PIN' : 'PIN'}
          name='unlock-pin'
          type='password'
          inputMode='numeric'
          autoComplete='off'
          value={form.pin}
          onChange={(event) => updateField('pin', digitsOnly(event.target.value))}
          required
        />
        <FloatingInput
          label='Confirm PIN'
          name='unlock-pin-confirm'
          type='password'
          inputMode='numeric'
          autoComplete='off'
          value={form.confirm_pin}
          onChange={(event) => updateField('confirm_pin', digitsOnly(event.target.value))}
          required
        />
        <div className='flex flex-wrap gap-3'>
          <Button3D
            type='submit'
            disabled={saving || form.pin.length !== UNLOCK_PIN_LENGTH || !form.current_password}
          >
            {saving ? 'Saving…' : hasPin ? 'Change PIN' : 'Set PIN'}
          </Button3D>
          {hasPin && (
            <Button3D type='button' variant='outlineLight' onClick={handleRemove}>
              Remove PIN
            </Button3D>
          )}
        </div>
      </form>
    </Card>
  );
}

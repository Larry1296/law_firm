import { LockKeyhole } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';

import useAuth from '@/modules/auth/hook/useAuth';

import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';
import AuthFormCard from '@/modules/auth/components/AuthFormCard';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const { resetPassword, loading, error } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLocalError(null);

    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await resetPassword({
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      navigate('/login');
    } catch (err) {
      console.error('Reset password failed:', err);
    }
  };

  return (
    <AuthFormCard
      showcase={{ icon: LockKeyhole, title: 'Set a new password', text: 'Choose a strong password to secure your account.' }}
      title='Set a new password'
      lead='Choose a strong password. You will sign in with it from now on.'
      backTo='/login'
      backLabel='Back to sign in'
      error={localError || error}
      onSubmit={handleSubmit}
    >
      <FloatingInput
        label='New password'
        name='new_password'
        type='password'
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        autoComplete='new-password'
        required
      />

      <FloatingInput
        label='Confirm password'
        name='confirm_password'
        type='password'
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete='new-password'
        required
      />

      <Button3D type='submit' className='w-full' disabled={loading}>
        {loading ? 'Saving…' : 'Save password'}
      </Button3D>
    </AuthFormCard>
  );
}
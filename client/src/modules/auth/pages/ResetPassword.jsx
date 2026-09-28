import { LockKeyhole, ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';

import useAuth from '@/modules/auth/hook/useAuth';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import PasswordInput from '@/components/ui/PasswordInput';
import AuthShowcase from '@/modules/auth/components/AuthShowcase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const { resetPassword, loading, error } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
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
    <div className='flex-1 flex flex-col lg:flex-row min-h-screen'>
      <AuthShowcase icon={LockKeyhole} title='Set a new password' text='Choose a strong password to secure your account.' />

      {/* RIGHT PANEL */}
      <div className='w-full lg:w-1/2 flex flex-col items-center justify-center px-6 pt-32 pb-12 min-h-screen bg-gray-50'>
        <Card className='w-full max-w-md p-8 my-auto'>
          <Link
            to='/login'
            className='flex items-center gap-2 text-sm text-blue-600 mb-6'
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>

          <h2 className='text-2xl font-bold mb-2'>Reset Password</h2>

          <p className='text-sm text-gray-500 mb-6'>
            Enter your new password below.
          </p>

          <form onSubmit={handleSubmit} className='space-y-5'>
            <PasswordInput
              placeholder='New Password'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type={show ? 'text' : 'password'}
            />

            <PasswordInput
              placeholder='Confirm Password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type={show ? 'text' : 'password'}
            />

            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={show}
                onChange={() => setShow(!show)}
              />
              Show password
            </label>

            {/* LOCAL ERROR */}
            {localError && (
              <p className='text-red-500 text-sm text-center'>{localError}</p>
            )}

            {/* API ERROR */}
            {error && (
              <p className='text-red-500 text-sm text-center'>{error}</p>
            )}

            <Button3D type='submit' className='w-full' disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button3D>
          </form>
        </Card>
      </div>
    </div>
  );
}
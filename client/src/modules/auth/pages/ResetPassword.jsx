import { motion } from 'framer-motion';
import { LockKeyhole, ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';

import useAuth from '@/modules/auth/hook/useAuth';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import PasswordInput from '@/components/ui/PasswordInput';

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
        password: newPassword,
        confirm_password: confirmPassword,
      });

      navigate('/login');
    } catch (err) {
      console.error('Reset password failed:', err);
    }
  };

  return (
    <div className='flex-1 flex flex-col lg:flex-row'>
      {/* LEFT PANEL */}
      <div className='hidden lg:flex lg:w-1/2 bg-blue-700 relative items-center justify-center p-10 overflow-hidden'>
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          className='absolute w-96 h-96 bg-blue-500/40 rounded-full blur-3xl'
        />

        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, -50, 0], y: [0, 40, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
          className='absolute w-96 h-96 bg-indigo-400/30 rounded-full blur-3xl'
        />

        <div className='relative text-center text-white max-w-md'>
          <LockKeyhole size={90} className='mx-auto mb-6' />

          <h1 className='text-4xl font-bold mb-4'>Set New Password</h1>

          <p className='text-blue-100'>
            Choose a strong password to secure your account.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className='w-full lg:w-1/2 flex items-center justify-center px-6 py-24 bg-gray-50'>
        <Card className='w-full max-w-md p-8'>
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

import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import useAuth from '@/modules/auth/hook/useAuth';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';
import AuthShowcase from '@/modules/auth/components/AuthShowcase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');

  const { forgotPassword, loading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await forgotPassword({ email });

      // optional success handling already in hook (SweetAlert)
      setEmail('');
    } catch (err) {
      console.error('Forgot password failed:', err);
    }
  };

  return (
    <div className='flex-1 flex flex-col lg:flex-row min-h-screen'>
      <AuthShowcase icon={Mail} title='Reset your password' text='Enter your email and we’ll send reset instructions securely.' />

      {/* RIGHT PANEL */}
      <div className='w-full lg:w-1/2 flex flex-col items-center justify-center px-6 pt-32 pb-12 min-h-screen bg-gray-50'>
        <Card className='w-full max-w-md p-8 my-auto'>
          {/* BACK LINK */}
          <Link
            to='/login'
            className='flex items-center gap-2 text-sm text-blue-600 mb-6'
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>

          <h2 className='text-2xl font-bold mb-2'>Forgot Password</h2>

          <p className='text-sm text-gray-500 mb-6'>
            No worries. We’ll send a reset link to your email.
          </p>

          <form onSubmit={handleSubmit} className='space-y-5'>
            <FloatingInput
              label='Email Address'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button3D type='submit' className='w-full' disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button3D>

            {error && (
              <p className='text-red-500 text-center text-sm'>{error}</p>
            )}
          </form>

          <p className='text-sm text-center mt-6 text-gray-600'>
            Remember your password?{' '}
            <Link to='/login' className='text-blue-600 font-bold'>
              Login
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
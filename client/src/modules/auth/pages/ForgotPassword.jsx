import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import useAuth from '@/modules/auth/hook/useAuth';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';

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
          <Mail size={90} className='mx-auto mb-6 text-white/90' />

          <h1 className='text-4xl font-bold mb-4'>Reset Your Password</h1>

          <p className='text-blue-100'>
            Enter your email and we’ll send reset instructions securely.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className='w-full lg:w-1/2 flex items-center justify-center px-6 py-24 bg-gray-50'>
        <Card className='w-full max-w-md p-8'>
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

import { Mail } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import useAuth from '@/modules/auth/hook/useAuth';

import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';
import AuthFormCard from '@/modules/auth/components/AuthFormCard';

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
    <AuthFormCard
      showcase={{ icon: Mail, title: 'Reset your password', text: 'Enter your email and we’ll send reset instructions securely.' }}
      title='Forgot password'
      lead='Enter your email and we will send you a link to set a new password.'
      backTo='/login'
      backLabel='Back to sign in'
      error={error}
      onSubmit={handleSubmit}
    >
      <FloatingInput
        label='Email address'
        name='email'
        type='email'
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete='email'
        required
      />

      <Button3D type='submit' className='w-full' disabled={loading}>
        {loading ? 'Sending…' : 'Send reset link'}
      </Button3D>

      <hr className='form-divider' />
      <p className='text-sm text-[color:var(--text-muted)]'>
        Remember your password? <Link to='/login' className='form-link'>Sign in</Link>
      </p>
    </AuthFormCard>
  );
}
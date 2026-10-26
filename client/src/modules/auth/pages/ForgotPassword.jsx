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
    } catch (err) { if (err?.isActionCancelled) return;
      console.error('Forgot password failed:', err);
    }
  };

  return (
    <AuthFormCard
      showcase={{ icon: Mail, title: 'Locked out? It happens', text: 'We email you a secure link to set a new password and get back to your firm’s workspace.' }}
      title='Forgot password'
      backTo='/login'
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
      <span className='text-sm text-[color:var(--text-muted)]'>Remember your password?</span>
      <Link to='/login' className='btn btn-secondary'>Sign in</Link>
    </AuthFormCard>
  );
}
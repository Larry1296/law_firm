import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import useAuth from '@/modules/auth/hook/useAuth';

import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';
import AuthFormCard from '@/modules/auth/components/AuthFormCard';

export default function RecoverAccount() {
  const { recoverAccount, loading, error } = useAuth();

  const [form, setForm] = useState({
    national_id: '',
    phone_number: '',
  });

  const [result, setResult] = useState(null);
  const [localError, setLocalError] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const cleanPayload = () => {
    const payload = {};

    const nid = form.national_id?.trim();
    const phone = form.phone_number?.trim();

    if (nid) payload.national_id = nid;
    if (phone) payload.phone_number = phone;

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLocalError(null);
    setResult(null);

    const payload = cleanPayload();

    if (!payload.phone_number && !payload.national_id) {
      setLocalError('Enter National ID or Phone Number');
      return;
    }

    try {
      const res = await recoverAccount(payload);

      // backend response shape safe access
      setResult((res?.data || res)?.detail);
    } catch (err) {
      console.error(
        'Recover account failed:',
        err.response?.data || err.message,
      );
    }
  };

  return (
    <AuthFormCard
      showcase={{ icon: ShieldCheck, title: 'Recover your account', text: 'Use your National ID or phone number to find your account.' }}
      title='Recover your account'
      lead='Forgot which email you use? Enter your National ID or phone number and we will email a reset link to the address on your account.'
      backTo='/login'
      backLabel='Back to sign in'
      error={localError || error}
      onSubmit={handleSubmit}
    >
      <FloatingInput
        label='National ID'
        name='national_id'
        value={form.national_id}
        onChange={handleChange}
        format='none'
      />

      <FloatingInput
        label='Phone number'
        name='phone_number'
        type='tel'
        value={form.phone_number}
        onChange={handleChange}
        format='none'
      />

      <Button3D type='submit' className='w-full' disabled={loading}>
        {loading ? 'Sending…' : 'Send reset link'}
      </Button3D>

      {result && <p role='status' className='form-success'>{result}</p>}
    </AuthFormCard>
  );
}
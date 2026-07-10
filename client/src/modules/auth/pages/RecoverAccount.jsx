import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

import useAuth from '@/modules/auth/hook/useAuth';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';

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
      setResult(res?.data || res);
    } catch (err) {
      console.error(
        'Recover account failed:',
        err.response?.data || err.message,
      );
    }
  };

  return (
    <div className='flex-1 flex flex-col lg:flex-row'>
      {/* LEFT */}
      <div className='hidden lg:flex lg:w-1/2 bg-blue-700 items-center justify-center p-10 relative overflow-hidden'>
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          className='absolute w-96 h-96 bg-blue-500/40 rounded-full blur-3xl'
        />

        <div className='relative text-center text-white max-w-md'>
          <ShieldCheck size={90} className='mx-auto mb-6' />
          <h1 className='text-4xl font-bold mb-4'>Recover Account</h1>
          <p className='text-blue-100'>
            Use National ID or Phone Number to find your account.
          </p>
        </div>
      </div>

      {/* RIGHT */}
      <div className='w-full lg:w-1/2 flex items-center justify-center px-6 py-24 bg-gray-50'>
        <Card className='w-full max-w-md p-8'>
          <Link
            to='/login'
            className='flex items-center gap-2 text-sm text-blue-600 mb-6'
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>

          <h2 className='text-2xl font-bold mb-2'>Account Recovery</h2>

          <p className='text-sm text-gray-500 mb-6'>
            Enter at least one identifier.
          </p>

          <form onSubmit={handleSubmit} className='space-y-5'>
            <FloatingInput
              label='National ID'
              name='national_id'
              value={form.national_id}
              onChange={handleChange}
            />

            <FloatingInput
              label='Phone Number'
              name='phone_number'
              value={form.phone_number}
              onChange={handleChange}
            />

            {localError && (
              <p className='text-red-500 text-sm text-center'>{localError}</p>
            )}

            {error && (
              <p className='text-red-500 text-sm text-center'>
                {error?.response?.data?.message || error}
              </p>
            )}

            <Button3D type='submit' className='w-full' disabled={loading}>
              {loading ? 'Searching...' : 'Find Account'}
            </Button3D>

            {result && (
              <div className='mt-4 p-3 bg-green-50 text-green-700 text-sm rounded text-center'>
                Account found:
                <br />
                <strong>{result.email_hint}</strong>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}

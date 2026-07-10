import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, ShieldCheck, ArrowLeft } from 'lucide-react';

import useAuth from '@/modules/auth/hook/useAuth';
import { normalizeKenyanPhone } from '@/utils/phoneNormalizer';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';

export default function Register() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    nationalId: '',
    phoneNumber: '',
    clientType: '',
    password: '',
    confirmPassword: '',
  });

  const [localError, setLocalError] = useState(null);

  const clientTypes = [
    { value: 'INDIVIDUAL', label: 'Individual' },
    { value: 'COMPANY', label: 'Company' },
    { value: 'ORGANIZATION', label: 'Organization' },
    { value: 'GOVERNMENT', label: 'Government Entity' },
    { value: 'GROUP', label: 'Group of Persons' },
    { value: 'ESTATE', label: 'Estate / Deceased Estate' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (form.password !== form.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (!form.phoneNumber) {
      setLocalError('Phone number is required');
      return;
    }

    if (!form.clientType) {
      setLocalError('Client type is required');
      return;
    }

    try {
      const payload = {
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        national_id: form.nationalId?.trim() || null,
        phone_number: normalizeKenyanPhone(form.phoneNumber),
        client_type: form.clientType,
        password: form.password,
      };

      const response = await register(payload);

      const user = response?.data?.user;

      if (!user) {
        throw new Error('Invalid registration response from server');
      }

      if (user.role === 'CLIENT') {
        navigate('/portal/dashboard');
      } else {
        navigate('/login');
      }
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  return (
    <div className='flex-1 flex flex-col lg:flex-row'>
      {/* LEFT PANEL */}
      <div className='hidden lg:flex lg:w-1/2 bg-blue-700 relative items-center justify-center p-10 overflow-hidden'>
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
          }}
          className='absolute w-96 h-96 bg-blue-500/40 rounded-full blur-3xl'
        />

        <div className='relative text-center text-white max-w-md'>
          <ShieldCheck size={90} className='mx-auto mb-6' />

          <h1 className='text-4xl font-bold mb-4'>Create Your Account</h1>

          <p className='text-blue-100'>
            Join LegalAssist and manage your legal matters securely.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className='w-full lg:w-1/2 flex items-center justify-center px-6 py-24 bg-gray-50'>
        <Card className='w-full max-w-md p-8'>
          <Link
            to='/'
            className='flex items-center gap-2 text-sm text-blue-600 mb-6'
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>

          <div className='flex items-center gap-2 mb-6'>
            <UserPlus className='text-blue-600' />
            <h2 className='text-2xl font-bold'>Register</h2>
          </div>

          <form onSubmit={handleRegister} className='space-y-5'>
            <FloatingInput
              label='Full Name / Entity Name'
              name='fullName'
              value={form.fullName}
              onChange={handleChange}
            />

            <select
              name='clientType'
              value={form.clientType}
              onChange={handleChange}
              required
              className='w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value='' className='text-gray-500'>
                Select Client Type
              </option>

              {clientTypes.map((type) => (
                <option
                  key={type.value}
                  value={type.value}
                  className='text-gray-900'
                >
                  {type.label}
                </option>
              ))}
            </select>

            <FloatingInput
              label='Email'
              name='email'
              type='email'
              value={form.email}
              onChange={handleChange}
            />

            <FloatingInput
              label='National ID'
              name='nationalId'
              value={form.nationalId}
              onChange={handleChange}
            />

            <FloatingInput
              label='Phone Number'
              name='phoneNumber'
              value={form.phoneNumber}
              onChange={handleChange}
            />

            <FloatingInput
              label='Password'
              name='password'
              type='password'
              value={form.password}
              onChange={handleChange}
            />

            <FloatingInput
              label='Confirm Password'
              name='confirmPassword'
              type='password'
              value={form.confirmPassword}
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
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button3D>

            <p className='text-sm text-center mt-6 text-gray-600'>
              Already have an account?{' '}
              <Link to='/login' className='text-blue-600 font-bold'>
                Login
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}

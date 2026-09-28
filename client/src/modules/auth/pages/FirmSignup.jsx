import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2 } from 'lucide-react';

import AuthContext from '@/core/store/AuthContext';
import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import subscriptionService from '@/modules/subscription/services/subscriptionService';
import { formatKes } from '@/modules/admin/subscription/utils/subscriptionFormatting';

const emptyFirm = {
  name: '',
  registration_number: '',
  email: '',
  phone_number: '',
  kra_pin: '',
  physical_address: '',
};

const emptyAdmin = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  national_id_number: '',
  admission_number: '',
  password: '',
  confirm_password: '',
};

export default function FirmSignup() {
  const navigate = useNavigate();
  const { login: authLogin } = useContext(AuthContext);
  const [firm, setFirm] = useState(emptyFirm);
  const [admin, setAdmin] = useState(emptyAdmin);
  const [planCode, setPlanCode] = useState('PRO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const plansQuery = useQuery({ queryKey: ['subscription', 'plans'], queryFn: subscriptionService.getPlans });
  const plans = plansQuery.data?.plans || [];
  const signupClosed = plansQuery.isSuccess && !plansQuery.data?.firm_signup_enabled;

  const firmField = (key) => (event) => setFirm((current) => ({ ...current, [key]: event.target.value }));
  const adminField = (key) => (event) => setAdmin((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await subscriptionService.registerFirm({ firm, admin, plan_code: planCode });
      const sessionUser = {
        ...data.user,
        firm_role: data.firm_role ?? data.user.firm_role ?? null,
        is_firm_owner: data.is_firm_owner ?? true,
      };
      flushSync(() => {
        authLogin({ user: sessionUser, access: data.access, refresh: data.refresh }, false);
      });
      navigate('/admin/subscription', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen flex-1 flex-col items-center bg-gray-50 px-4 pb-10 pt-32 dark:bg-[#0b1220] sm:px-6'>
      <Card className='w-full max-w-3xl p-6 sm:p-8'>
        <Link to='/login' className='mb-6 flex items-center gap-2 text-sm text-blue-600'>
          <ArrowLeft size={16} />
          Back to login
        </Link>

        <div className='mb-2 flex items-center gap-2'>
          <Building2 className='text-blue-600' />
          <h1 className='text-2xl font-bold'>Register your firm</h1>
        </div>
        <p className='mb-6 text-sm text-gray-600 dark:text-gray-300'>
          Start a 14-day free trial. No payment is needed until the trial ends; plans are paid by M-Pesa.
        </p>

        {signupClosed ? (
          <p role='status' className='rounded-lg border border-border-light p-4 text-sm dark:border-border-dark'>
            Online firm registration is not open yet. Contact the platform team to have your firm onboarded.
          </p>
        ) : (
        <form onSubmit={handleSubmit} className='space-y-8'>
          <fieldset className='space-y-3'>
            <legend className='mb-2 text-lg font-semibold'>Plan</legend>
            <div className='grid gap-3 sm:grid-cols-2'>
              {plans.map((plan) => (
                <label
                  key={plan.code}
                  className={`cursor-pointer rounded-xl border p-4 text-sm ${planCode === plan.code ? 'border-blue-500 ring-2 ring-blue-500' : 'border-border-light dark:border-border-dark'}`}
                >
                  <input
                    type='radio'
                    name='plan'
                    value={plan.code}
                    checked={planCode === plan.code}
                    onChange={() => setPlanCode(plan.code)}
                    className='sr-only'
                  />
                  <span className='block font-semibold'>{plan.name}</span>
                  <span className='block text-gray-600 dark:text-gray-300'>{formatKes(plan.monthly_price)} / month + VAT</span>
                  <span className='mt-1 block text-xs text-gray-500 dark:text-gray-400'>{plan.tagline}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className='grid gap-5 sm:grid-cols-2'>
            <legend className='mb-2 text-lg font-semibold'>Firm</legend>
            <FloatingInput label='Firm name' value={firm.name} onChange={firmField('name')} required />
            <FloatingInput label='Business registration number' value={firm.registration_number} onChange={firmField('registration_number')} format='none' required />
            <FloatingInput label='Firm email' type='email' value={firm.email} onChange={firmField('email')} required />
            <FloatingInput label='Firm phone' value={firm.phone_number} onChange={firmField('phone_number')} format='none' />
            <FloatingInput label='KRA PIN (optional)' value={firm.kra_pin} onChange={firmField('kra_pin')} format='none' />
            <FloatingInput label='Physical address' value={firm.physical_address} onChange={firmField('physical_address')} />
          </fieldset>

          <fieldset className='grid gap-5 sm:grid-cols-2'>
            <legend className='mb-2 text-lg font-semibold'>Managing partner</legend>
            <FloatingInput label='First name' value={admin.first_name} onChange={adminField('first_name')} required />
            <FloatingInput label='Last name' value={admin.last_name} onChange={adminField('last_name')} required />
            <FloatingInput label='Email' type='email' value={admin.email} onChange={adminField('email')} required />
            <FloatingInput label='Phone number' value={admin.phone_number} onChange={adminField('phone_number')} format='none' required />
            <FloatingInput label='National ID number' value={admin.national_id_number} onChange={adminField('national_id_number')} format='none' required />
            <FloatingInput label='Admission number (e.g. P.105/1234/15)' value={admin.admission_number} onChange={adminField('admission_number')} format='none' required />
            <FloatingInput label='Password' type='password' value={admin.password} onChange={adminField('password')} required />
            <FloatingInput label='Confirm password' type='password' value={admin.confirm_password} onChange={adminField('confirm_password')} required />
          </fieldset>

          {error && (
            <p role='alert' className='rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-100'>
              {error}
            </p>
          )}

          <Button3D type='submit' className='w-full' disabled={loading}>
            {loading ? 'Creating your firm…' : 'Start free trial'}
          </Button3D>
        </form>
        )}
      </Card>
    </div>
  );
}

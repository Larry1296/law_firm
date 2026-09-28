import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { useQuery } from '@tanstack/react-query';

import AuthContext from '@/core/store/AuthContext';
import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';
import AuthFormCard from '@/modules/auth/components/AuthFormCard';
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
    <AuthFormCard
      wide
      title='Register your firm'
      lead='Start a 14-day free trial. No payment is needed until the trial ends; plans are paid by M-Pesa.'
      backTo='/login'
      backLabel='Back to sign in'
      error={error}
      onSubmit={handleSubmit}
    >
      {signupClosed ? (
        <p role='status' className='form-success'>
          Online firm registration is not open yet. Contact the platform team to have your firm onboarded.
        </p>
      ) : (
        <>
          <fieldset className='grid gap-3'>
            <legend className='mb-2 text-base font-semibold'>Plan</legend>
            <div className='grid gap-3 sm:grid-cols-2'>
              {plans.map((plan) => (
                <label
                  key={plan.code}
                  className={`cursor-pointer rounded-[9px] border p-4 text-sm ${planCode === plan.code ? 'border-[color:var(--form-primary)] bg-[color:var(--form-primary-soft)]' : 'border-[color:var(--border)]'}`}
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
                  <span className='block text-[color:var(--text-muted)]'>{formatKes(plan.monthly_price)} / month + VAT</span>
                  <span className='form-hint mt-1 block'>{plan.tagline}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <hr className='form-divider' />

          <fieldset className='grid gap-4 sm:grid-cols-2'>
            <legend className='mb-2 text-base font-semibold'>Firm</legend>
            <FloatingInput label='Firm name' value={firm.name} onChange={firmField('name')} required />
            <FloatingInput label='Business registration number' value={firm.registration_number} onChange={firmField('registration_number')} format='none' required />
            <FloatingInput label='Firm email' type='email' value={firm.email} onChange={firmField('email')} required />
            <FloatingInput label='Firm phone' type='tel' value={firm.phone_number} onChange={firmField('phone_number')} format='none' />
            <FloatingInput label='KRA PIN (optional)' value={firm.kra_pin} onChange={firmField('kra_pin')} format='none' />
            <FloatingInput label='Physical address' value={firm.physical_address} onChange={firmField('physical_address')} />
          </fieldset>

          <hr className='form-divider' />

          <fieldset className='grid gap-4 sm:grid-cols-2'>
            <legend className='mb-2 text-base font-semibold'>Managing partner</legend>
            <FloatingInput label='First name' value={admin.first_name} onChange={adminField('first_name')} required />
            <FloatingInput label='Last name' value={admin.last_name} onChange={adminField('last_name')} required />
            <FloatingInput label='Email' type='email' value={admin.email} onChange={adminField('email')} required />
            <FloatingInput label='Phone number' type='tel' value={admin.phone_number} onChange={adminField('phone_number')} format='none' required />
            <FloatingInput label='National ID number' value={admin.national_id_number} onChange={adminField('national_id_number')} format='none' required />
            <FloatingInput label='Admission number (e.g. P.105/1234/15)' value={admin.admission_number} onChange={adminField('admission_number')} format='none' required />
            <FloatingInput label='Password' type='password' value={admin.password} onChange={adminField('password')} autoComplete='new-password' required />
            <FloatingInput label='Confirm password' type='password' value={admin.confirm_password} onChange={adminField('confirm_password')} autoComplete='new-password' required />
          </fieldset>

          <Button3D type='submit' className='w-full' disabled={loading}>
            {loading ? 'Creating your firm…' : 'Start free trial'}
          </Button3D>
        </>
      )}
    </AuthFormCard>
  );
}

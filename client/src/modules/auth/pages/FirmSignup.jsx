import { useContext, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';

import AuthContext from '@/core/store/AuthContext';
import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';
import AuthFormCard from '@/modules/auth/components/AuthFormCard';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import subscriptionService from '@/modules/subscription/services/subscriptionService';
import PlanOptions from '@/modules/subscription/components/PlanOptions';

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
  // The pricing section links here with the plan the visitor picked.
  const [searchParams] = useSearchParams();
  const [planCode, setPlanCode] = useState(() => searchParams.get('plan') || 'PRO');
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
    } catch (err) { if (err?.isActionCancelled) return;
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormCard
      wide
      showcase={{ icon: Building2, title: 'Bring your firm to Sheria Master', text: 'Start a 14-day free trial. No payment is needed until it ends; plans are paid by M-Pesa.' }}
      title='Register your firm'
      backTo='/'
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
            <PlanOptions plans={plans} value={planCode} onChange={setPlanCode} includedInEveryPlan={plansQuery.data?.included_in_every_plan} />
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

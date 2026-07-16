import { useState } from 'react';

import { saveAuthSession } from '@/core/utils/authStorage';
import { useNavigate, Link } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, ArrowLeft } from 'lucide-react';

import authService from '@/modules/auth/service/authService';
import { useContext } from 'react';
import AuthContext from '@/core/store/AuthContext';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';
import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { persistThemeForUser } from '@/core/utils/themeIdentity';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [error, setError] = useState(null);

  const { login: authLogin } = useContext(AuthContext);

  const navigate = useNavigate();

  const navigateByRole = (sessionUser) => {
  const role = sessionUser.role;
  const sessionFirmRole = sessionUser.firm_role;

  console.log('User role from server:', role); // ← For debugging

  if (role === 'ADMIN') {
      return navigate('/admin/dashboard', { replace: true });
    }

    if (role === 'OFFICIAL_CLIENT') {
      return navigate('/client/dashboard', { replace: true });
    }

    if (role === 'PROSPECT') {
      return navigate('/portal/dashboard', { replace: true });
    }

    if (role === 'STAFF') {
      if (sessionFirmRole === 'LAWYER') return navigate('/lawyer/dashboard', { replace: true });
      if (sessionFirmRole === 'SECRETARY') return navigate('/secretary/dashboard', { replace: true });
      if (sessionFirmRole === 'ACCOUNTANT') return navigate('/accountant/dashboard', { replace: true });
      if (sessionFirmRole === 'HR') return navigate('/hr/dashboard', { replace: true });
      if (sessionFirmRole === 'IT') return navigate('/it/dashboard', { replace: true });
      return navigate('/', { replace: true });
    }

    return navigate('/', { replace: true });
  };

  const getDashboardThemeRole = (sessionUser) => {
    if (sessionUser.role === 'ADMIN') return 'admin';
    if (['OFFICIAL_CLIENT', 'PROSPECT'].includes(sessionUser.role)) {
      return 'client';
    }

    if (sessionUser.role === 'STAFF') {
      return String(sessionUser.firm_role || '').toLowerCase();
    }

    return 'public';
  };

  const persistLoginThemeForDashboard = (sessionUser) => {
    const currentTheme = document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';

    persistThemeForUser({
      role: getDashboardThemeRole(sessionUser),
      user: sessionUser,
      theme: currentTheme,
    });
  };

  const promptPasswordChoice = async ({ sessionUser, access, refresh }) => {
    const canPrompt =
      ['ADMIN', 'STAFF', 'PROSPECT'].includes(sessionUser.role) &&
      sessionUser.must_change_password;

    if (!canPrompt) {
      return sessionUser;
    }

    const result = await Swal.fire({
      icon: 'info',
      title: 'Change temporary password?',
      text: 'You are signed in with a temporary password. You can change it now or keep it for the moment.',
      showDenyButton: true,
      confirmButtonText: 'Change now',
      denyButtonText: 'Keep it',
      allowOutsideClick: false,
    });

    if (!result.isConfirmed) {
      return sessionUser;
    }

    const passwordResult = await Swal.fire({
      title: 'Set new password',
      html: `
        <input id="new-password" type="password" class="swal2-input" placeholder="New password" autocomplete="new-password" />
        <input id="confirm-password" type="password" class="swal2-input" placeholder="Confirm password" autocomplete="new-password" />
      `,
      confirmButtonText: 'Update password',
      showCancelButton: true,
      focusConfirm: false,
      preConfirm: async () => {
        const newPassword = document.getElementById('new-password')?.value || '';
        const confirmPassword =
          document.getElementById('confirm-password')?.value || '';

        if (!newPassword || !confirmPassword) {
          Swal.showValidationMessage('Enter and confirm your new password.');
          return false;
        }

        if (newPassword !== confirmPassword) {
          Swal.showValidationMessage('The passwords do not match.');
          return false;
        }

        try {
          if (sessionUser.role === 'STAFF') {
            await authService.changeStaffPassword(sessionUser.firm_role, {
              current_password: password,
              new_password: newPassword,
              confirm_password: confirmPassword,
            });
          } else {
            await authService.changePassword({
              current_password: password,
              new_password: newPassword,
              confirm_password: confirmPassword,
            });
          }
          return true;
        } catch (err) {
          const message = getApiErrorMessage(
            err,
            'Could not update password.',
          );
          Swal.showValidationMessage(message);
          return false;
        }
      },
    });

    if (!passwordResult.isConfirmed) {
      return sessionUser;
    }

    const updatedUser = {
      ...sessionUser,
      must_change_password: false,
    };

    saveAuthSession({ user: updatedUser, access, refresh }, rememberMe);
    authLogin({ user: updatedUser, access, refresh }, rememberMe);

    await Swal.fire({
      icon: 'success',
      title: 'Password updated',
      text: 'Your new password is ready to use.',
      timer: 1500,
      showConfirmButton: false,
    });

    return updatedUser;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await authService.login({ email, password });

      if (!data) throw new Error('Invalid login response');

      const {
        user,
        access,
        refresh,
        firm_role: firmRole,
        is_firm_owner: isFirmOwner,
      } = data;

      if (!user || !access || !refresh) {
        throw new Error('Invalid login response from server');
      }

      const sessionUser = {
        ...user,
        firm_role: firmRole ?? user.firm_role ?? null,
        is_firm_owner: isFirmOwner ?? user.is_firm_owner ?? false,
      };

      persistLoginThemeForDashboard(sessionUser);

      /* =====================================================
         AUTH CONTEXT UPDATE + STORAGE
      ===================================================== */
      flushSync(() => {
        authLogin({ user: sessionUser, access, refresh }, rememberMe);
      });

      /* =====================================================
         FIRST-TIME PASSWORD CHOICE
      ===================================================== */
      const finalUser = await promptPasswordChoice({
        sessionUser,
        access,
        refresh,
      });

      /* =====================================================
         ROLE ROUTING
      ===================================================== */
      setOpeningDashboard(true);
      return navigateByRole(finalUser);
    } catch (err) {
      console.error('Login failed:', err);
      setError(getApiErrorMessage(err, 'Login failed'));
    } finally {
      if (!openingDashboard) {
        setLoading(false);
      }
    }
  };

  return (
    <div className='flex-1 flex flex-col lg:flex-row'>
      {/* LEFT PANEL */}
      <div className='hidden lg:flex lg:w-1/2 bg-[color:var(--brand-primary)] dark:bg-blue-950 relative items-center justify-center p-10 overflow-hidden'>
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          className='absolute w-96 h-96 bg-blue-500/40 rounded-full blur-3xl'
        />

        <div className='relative text-center text-white max-w-md'>
          <ShieldCheck size={90} className='mx-auto mb-6' />
          <h1 className='text-4xl font-bold mb-4'>Secure Legal Access</h1>
          <p className='text-blue-100'>
            Login to manage cases, documents, and communication securely.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className='w-full lg:w-1/2 flex items-center justify-center px-6 py-24 bg-gray-50 dark:bg-[#0b1220]'>
        <Card className='w-full max-w-md p-8'>
          <Link
            to='/'
            className='flex items-center gap-2 text-sm text-blue-600 mb-6'
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>

          <div className='flex items-center gap-2 mb-6'>
            <Lock className='text-blue-600' />
            <h2 className='text-2xl font-bold'>Login</h2>
          </div>

          <form onSubmit={handleLogin} className='space-y-5'>
            <FloatingInput
              label='Email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <FloatingInput
              label='Password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* =====================================================
               REMEMBER ME (NOW FUNCTIONAL)
            ===================================================== */}
            <div className='flex justify-between text-sm'>
              <label className='flex items-center gap-2 text-gray-800 dark:text-gray-200'>
                <input
                  type='checkbox'
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                />
                Remember me
              </label>

              <div className='flex flex-col items-end gap-1'>
                {/* NORMAL PASSWORD RESET FLOW */}
                <Link
                  to='/forgot-password'
                  className='text-blue-700 hover:underline'
                >
                  Forgot password?
                </Link>

                {/* ACCOUNT RECOVERY FLOW (NEW) */}
                <Link
                  to='/recover-account'
                  className='text-gray-600 hover:text-blue-700 dark:text-gray-300 dark:hover:text-blue-300 text-xs'
                >
                  Can’t access your email?
                </Link>
              </div>
            </div>

            <Button3D type='submit' className='w-full' disabled={loading}>
              {openingDashboard
                ? 'Opening dashboard...'
                : loading
                  ? 'Signing in...'
                  : 'Login'}
            </Button3D>

            {/* ERROR */}
            {error && (
              <p className='text-red-500 dark:text-red-300 text-center text-sm'>
                {error}
              </p>
            )}

            <p className='text-sm text-center mt-6 text-gray-600 dark:text-gray-300'>
              Don’t have an account?{' '}
              <Link to='/register' className='text-blue-600 font-bold'>
                Create account
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}

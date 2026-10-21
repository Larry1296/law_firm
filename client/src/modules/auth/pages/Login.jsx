import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { clearAuthSession, saveAuthSession } from '@/core/utils/authStorage';
import { useNavigate, Link } from 'react-router-dom';
import { flushSync } from 'react-dom';

import authService from '@/modules/auth/service/authService';
import { useContext } from 'react';
import AuthContext from '@/core/store/AuthContext';

import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';
import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { getClientDashboardPath, getEffectiveRole } from '@/core/utils/effectiveRole';
import AuthFormCard from '@/modules/auth/components/AuthFormCard';

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
    const effectiveRole = getEffectiveRole(sessionUser, sessionUser.firm_role);

    if (effectiveRole === 'PLATFORM_ADMIN') {
      return navigate('/platform/overview', { replace: true });
    }

    if (effectiveRole === 'ADMIN') {
      return navigate('/admin/dashboard', { replace: true });
    }

    if (effectiveRole === 'OFFICIAL_CLIENT') {
      return navigate(getClientDashboardPath(sessionUser), { replace: true });
    }

    if (effectiveRole === 'PROSPECT') {
      return navigate('/portal/dashboard', { replace: true });
    }

    if (effectiveRole === 'LAWYER') return navigate('/lawyer/dashboard', { replace: true });
    if (effectiveRole === 'SECRETARY') return navigate('/secretary/dashboard', { replace: true });
    if (effectiveRole === 'ACCOUNTANT') return navigate('/accountant/dashboard', { replace: true });
    if (effectiveRole === 'HR') return navigate('/hr/dashboard', { replace: true });
    if (effectiveRole === 'IT') return navigate('/it/dashboard', { replace: true });

    return navigate('/', { replace: true });
  };

  // The server refuses work until a temporary password is replaced, so the change is not optional.
  const requirePasswordChange = async ({ sessionUser, access, refresh }) => {
    const mustChange =
      sessionUser.role !== 'ADMIN' && sessionUser.must_change_password;

    if (!mustChange) {
      return sessionUser;
    }

    const passwordResult = await Swal.fire({
      title: 'Set your own password',
      html: `
        <p class="swal2-html-container" style="margin:0 0 0.5rem">You signed in with a temporary password. Choose your own password to continue.</p>
        <input id="new-password" type="password" class="swal2-input" placeholder="New password" autocomplete="new-password" />
        <input id="confirm-password" type="password" class="swal2-input" placeholder="Confirm password" autocomplete="new-password" />
      `,
      confirmButtonText: 'Update password',
      allowOutsideClick: false,
      allowEscapeKey: false,
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
      clearAuthSession();
      throw new Error('Set your own password to finish signing in.');
    }

    const updatedUser = {
      ...sessionUser,
      must_change_password: false,
    };

    saveAuthSession({ user: updatedUser, access, refresh }, rememberMe);

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

      // A firm administrator with no firm (such as a Django createsuperuser
      // account) would open a dashboard whose every request is refused and be
      // sent straight back here, so stop and say why instead.
      if (sessionUser.role === 'ADMIN' && !(data.firm?.id || user.firm?.id)) {
        throw new Error(
          'This account is a firm administrator but is not attached to a law firm. '
          + 'Sign in with a platform administrator account to open the platform console, '
          + 'or register a firm with this account as its owner.',
        );
      }

      /* =====================================================
         AUTH CONTEXT UPDATE + STORAGE
      ===================================================== */
      // The password-change API needs the token, but publishing the session to
      // context now would redirect away from this form and load the dashboard.
      saveAuthSession({ user: sessionUser, access, refresh }, rememberMe);

      /* =====================================================
         FIRST-TIME PASSWORD CHOICE
      ===================================================== */
      const finalUser = await requirePasswordChange({
        sessionUser,
        access,
        refresh,
      });
      flushSync(() => {
        authLogin({ user: finalUser, access, refresh }, rememberMe);
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
    <AuthFormCard
      showcase={{ icon: ShieldCheck, title: 'Your firm, one sign-in away', text: 'Firm owners, advocates, staff and clients all sign in here and land in their own firm’s workspace.' }}
      title='Welcome back'
      error={error}
      onSubmit={handleLogin}
    >
      <FloatingInput
        label='Email'
        name='email'
        type='email'
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete='username'
        required
      />

      <FloatingInput
        label='Password'
        name='password'
        type='password'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete='current-password'
        required
      />

      <label className='flex items-start gap-2 text-sm text-[color:var(--text-primary)]'>
        <input
          type='checkbox'
          className='mt-1'
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          aria-describedby='remember-me-help'
        />
        <span>
          Remember me
          <span id='remember-me-help' className='form-hint block'>
            Stay signed in after the browser closes. Leave unchecked on a shared device.
          </span>
        </span>
      </label>

      <Button3D type='submit' className='w-full' disabled={loading}>
        {openingDashboard ? 'Opening dashboard…' : loading ? 'Signing in…' : 'Sign in'}
      </Button3D>

      <div className='flex flex-wrap justify-between gap-2 text-sm'>
        <Link to='/forgot-password' className='form-link'>Forgot password?</Link>
        <Link to='/recover-account' className='form-link'>Can’t access your email?</Link>
      </div>

      <hr className='form-divider' />
      <span className='text-sm text-[color:var(--text-muted)]'>New law firm?</span>
      <Link to='/register-firm' className='btn btn-secondary'>Register your firm</Link>
    </AuthFormCard>
  );
}

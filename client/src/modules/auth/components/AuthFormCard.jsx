import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import AuthShowcase from '@/modules/auth/components/AuthShowcase';

/**
 * The card every sign-in, sign-up and password page uses. With `showcase`
 * ({ icon, title, text }) the courtroom carousel fills the left half on desktop.
 */
export default function AuthFormCard({
  eyebrow = 'Sheria Master',
  title,
  lead,
  backTo = '/',
  backLabel = 'Back',
  error,
  onSubmit,
  wide = false,
  showcase,
  children,
}) {
  const card = (
    <form onSubmit={onSubmit} className={`form-card ${wide ? '' : 'form-card--narrow'}`}>
      <Link to={backTo} className='auth-back'>
        <ArrowLeft size={16} aria-hidden='true' /> {backLabel}
      </Link>
      <span className='form-eyebrow'>{eyebrow}</span>
      <h1 className='form-title'>{title}</h1>
      {lead && <p className='form-lead'>{lead}</p>}
      {error && <p role='alert' className='form-alert'>{error}</p>}
      {children}
    </form>
  );

  if (!showcase) return <div className='auth-page'>{card}</div>;

  return (
    <div className='flex min-h-screen w-full flex-1 flex-col lg:flex-row'>
      <AuthShowcase {...showcase} />
      <div className='auth-page lg:w-1/2'>{card}</div>
    </div>
  );
}

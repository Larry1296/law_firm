import BackButton from '@/components/ui/BackButton';
import BrandMark from '@/components/ui/BrandMark';
import AuthShowcase from '@/modules/auth/components/AuthShowcase';

/**
 * The card every sign-in, sign-up and password page uses. With `showcase`
 * ({ icon, title, text }) the courtroom carousel fills the left half on desktop.
 * Back returns to the previous page, or to `backTo` when the page was opened directly.
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
      <BackButton fallback={backTo} label={backLabel} />
      <BrandMark />
      {eyebrow !== 'Sheria Master' && <span className='form-eyebrow'>{eyebrow}</span>}
      <h1 className='form-title'>{title}</h1>
      {lead && <p className='form-lead'>{lead}</p>}
      {error && <p role='alert' className='form-alert'>{error}</p>}
      {children}
    </form>
  );

  if (!showcase) return <div className='auth-page'>{card}</div>;

  // The form comes first in the markup, so it is first for keyboard and screen-reader
  // users; row-reverse draws the showcase on the left on desktop.
  return (
    <div className='flex min-h-screen w-full flex-1 flex-col lg:flex-row-reverse'>
      <div className='auth-page auth-form-side lg:w-1/2'>{card}</div>
      <AuthShowcase {...showcase} />
    </div>
  );
}

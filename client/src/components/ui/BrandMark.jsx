import logo from '@/assets/images/logo.png';

/** The Sheria Master logo and name, so a public page shows whose it is. */
export default function BrandMark({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={logo} alt='' className='h-9 w-9 shrink-0 object-contain' />
      <span className='text-base font-extrabold tracking-wide text-[color:var(--text-primary)]'>Sheria Master</span>
    </span>
  );
}

import { useContext, useState } from 'react';

import logo from '@/assets/images/logo.png';
import AuthContext from '@/core/store/AuthContext';
import { apiAssetUrl } from '@/core/utils/apiAssetUrl';

const initials = (name) =>
  name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word) && !['and', 'of', 'the'].includes(word.toLowerCase()))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

/**
 * Signed-in members of a firm see their own firm's name and logo; everyone
 * else sees the Sheria Master brand.
 */
export default function Brand({
  size = 'h-12 w-12',
  textSize = 'text-lg',
  showText = true,
}) {
  const auth = useContext(AuthContext);
  const firm = auth?.user?.firm;
  const [logoFailed, setLogoFailed] = useState(false);

  if (firm?.name) {
    const firmLogo = firm.logo_url && !logoFailed ? apiAssetUrl(firm.logo_url) : null;
    return (
      <div className='flex w-full flex-col items-center justify-center text-center'>
        {firmLogo ? (
          <img src={firmLogo} alt={`${firm.name} logo`} onError={() => setLogoFailed(true)} className={`${size} aspect-square shrink-0 rounded-2xl bg-[color:var(--surface)] object-cover ring-1 ring-[color:var(--border)]`} />
        ) : (
          <span aria-hidden='true' className={`${size} flex items-center justify-center rounded-2xl bg-brand-accent text-3xl font-extrabold text-[#1a1203]`}>
            {initials(firm.name) || firm.name[0]}
          </span>
        )}
        {showText && (
          <>
            <span className={`mt-1 line-clamp-2 font-extrabold leading-tight ${textSize} text-yellow-600`}>{firm.name}</span>
            <span className='text-[10px] font-medium uppercase tracking-wider opacity-70'>on Sheria Master</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className='flex w-full flex-col items-center justify-center text-center'>
      <img src={logo} alt='Sheria Master logo' className={`${size} rounded-2xl object-cover`} />
      {showText && <span className={`font-extrabold ${textSize} text-yellow-600`}>Sheria Master</span>}
    </div>
  );
}

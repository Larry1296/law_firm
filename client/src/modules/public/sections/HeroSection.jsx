import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';

import courtroom from '@/assets/images/court-room.png';
import courtroomModern from '@/assets/images/court-room-modern.png';
import courtroomAppellate from '@/assets/images/court-room-appellate.png';
import courtroomContemporary from '@/assets/images/court-room-contemporary.png';

const BACKGROUNDS = [courtroom, courtroomModern, courtroomAppellate, courtroomContemporary];

export default function HeroSection({ startingPrice }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const interval = window.setInterval(() => setActive((current) => (current + 1) % BACKGROUNDS.length), 6000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className='relative isolate flex min-h-[92vh] items-center overflow-hidden bg-[#050816]'>
      {BACKGROUNDS.map((src, index) => (
        <img
          key={src}
          src={src}
          alt=''
          aria-hidden='true'
          className={`absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-1000 ${index === active ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div className='absolute inset-0 -z-10 bg-gradient-to-r from-[#050816]/95 via-[#050816]/80 to-[#050816]/40' />

      <div className='mx-auto w-full max-w-7xl px-4 pb-16 pt-36 sm:px-6 lg:px-8'>
        <div className='max-w-2xl'>
          <p className='inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur'>
            <ShieldCheck size={14} aria-hidden='true' /> Built for Kenyan law firms
          </p>
          <h1 className='mt-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl'>
            Run your whole practice from one secure workspace
          </h1>
          <p className='mt-6 text-lg leading-relaxed text-slate-200'>
            Matters, court diary and virtual courts, client accounts, documents and M-Pesa billing.
            Each firm gets its own private workspace for its advocates, staff and clients.
          </p>
          <div className='mt-10 flex flex-wrap gap-3'>
            <Link
              to='/register-firm'
              className='inline-flex items-center gap-2 rounded-xl bg-brand-accent px-6 py-3 text-base font-bold text-[#1a1203] shadow-lg transition hover:bg-[#cf9d35] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]'
            >
              Register your firm <ArrowRight size={18} aria-hidden='true' />
            </Link>
            <Link
              to='/login'
              className='inline-flex items-center rounded-xl border border-white/40 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white'
            >
              Sign in
            </Link>
          </div>
          {startingPrice && (
            <p className='mt-6 text-sm text-slate-300'>Plans from {startingPrice} a month. No setup fee.</p>
          )}
        </div>
      </div>
    </section>
  );
}

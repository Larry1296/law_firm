import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';

import courtroom from '@/assets/images/court-room.png';
import courtroomAppellate from '@/assets/images/court-room-appellate.png';
import courtroomContemporary from '@/assets/images/court-room-contemporary.png';
import courtroomModern from '@/assets/images/court-room-modern.png';

const SLIDE_MS = 7000;

// Quotations checked word for word against the Constitution of Kenya, 2010.
const SLIDES = [
  {
    image: courtroom,
    quote: 'The State shall ensure access to justice for all persons.',
    source: 'Constitution of Kenya, Article 48',
    pan: { from: { scale: 1.05, x: '-2%' }, to: { scale: 1.16, x: '2%' } },
  },
  {
    image: courtroomAppellate,
    quote: 'Every person is equal before the law and has the right to equal protection and equal benefit of the law.',
    source: 'Constitution of Kenya, Article 27(1)',
    pan: { from: { scale: 1.16, y: '2%' }, to: { scale: 1.05, y: '-2%' } },
  },
  {
    image: courtroomModern,
    quote: 'Justice shall be done to all, irrespective of status.',
    source: 'Constitution of Kenya, Article 159(2)(a)',
    pan: { from: { scale: 1.05, x: '2%' }, to: { scale: 1.16, x: '-2%' } },
  },
  {
    image: courtroomContemporary,
    quote: 'Every person has the right to have any dispute that can be resolved by the application of law decided in a fair and public hearing.',
    source: 'Constitution of Kenya, Article 50(1)',
    pan: { from: { scale: 1.12, y: '-2%' }, to: { scale: 1.04, y: '2%' } },
  },
];

/**
 * The image side of the auth pages: a slow, cross-fading carousel of
 * courtrooms, each paired with a line from the Constitution, behind the
 * page's own heading.
 */
export default function AuthShowcase({ icon: Icon, title, text }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const playing = !paused && !reduceMotion;

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [active, playing]);

  const slide = SLIDES[active];

  return (
    <div className='relative isolate hidden overflow-hidden bg-[#050b18] lg:flex lg:w-1/2 lg:flex-col'>
      {/* Images: cross-fade, with a slow pan and zoom while each is shown. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={active}
          className='absolute inset-0 -z-20'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 1.6, ease: 'easeInOut' }}
        >
          <motion.img
            src={slide.image}
            alt=''
            aria-hidden='true'
            className='h-full w-full object-cover'
            initial={reduceMotion ? false : slide.pan.from}
            animate={reduceMotion ? { scale: 1.02 } : slide.pan.to}
            transition={{ duration: (SLIDE_MS + 1600) / 1000, ease: 'linear' }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Legibility: navy wash, deeper at the bottom where the quotation sits. */}
      <div className='absolute inset-0 -z-10 bg-gradient-to-b from-[#050b18]/80 via-[#0b2140]/55 to-[#050b18]/95' />
      <div className='absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(184,138,43,0.22),transparent_55%)]' />

      <div className='flex flex-1 flex-col justify-between px-12 pb-10 pt-32 text-white xl:px-16'>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className='max-w-lg'
        >
          {Icon && (
            <span className='mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md'>
              <Icon size={28} aria-hidden='true' />
            </span>
          )}
          <h1 className='text-4xl font-bold leading-tight xl:text-5xl'>{title}</h1>
          {text && <p className='mt-4 text-lg leading-relaxed text-slate-200'>{text}</p>}
        </motion.div>

        <div className='max-w-lg'>
          <figure className='min-h-[9.5rem]' aria-live={playing ? 'off' : 'polite'}>
            <AnimatePresence mode='wait' initial={false}>
              <motion.div
                key={active}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <span aria-hidden='true' className='block font-serif text-5xl leading-none text-brand-accent'>&ldquo;</span>
                <blockquote className='font-serif text-xl italic leading-relaxed text-white xl:text-2xl'>{slide.quote}</blockquote>
                <figcaption className='mt-3 text-sm font-semibold uppercase tracking-wider text-brand-accent'>{slide.source}</figcaption>
              </motion.div>
            </AnimatePresence>
          </figure>

          <div className='mt-8 flex items-center gap-4'>
            <div className='flex flex-1 gap-2' role='group' aria-label='Choose a slide'>
              {SLIDES.map((item, index) => (
                <button
                  key={item.source}
                  type='button'
                  onClick={() => setActive(index)}
                  aria-label={`Show slide ${index + 1} of ${SLIDES.length}`}
                  aria-current={index === active ? 'true' : undefined}
                  className='group relative h-6 flex-1 focus:outline-none'
                >
                  <span className='absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25 group-hover:bg-white/40 group-focus-visible:ring-2 group-focus-visible:ring-brand-accent'>
                    {index < active && <span className='absolute inset-0 bg-white/80' />}
                    {index === active && (
                      <motion.span
                        key={`${active}-${playing}`}
                        className='absolute inset-y-0 left-0 bg-white'
                        initial={{ width: playing ? '0%' : '100%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: playing ? SLIDE_MS / 1000 : 0, ease: 'linear' }}
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
            {!reduceMotion && (
              <button
                type='button'
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
                className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-md transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent'
              >
                {paused ? <Play size={15} aria-hidden='true' /> : <Pause size={15} aria-hidden='true' />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

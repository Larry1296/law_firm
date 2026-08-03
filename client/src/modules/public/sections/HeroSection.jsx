import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Button3D from '@/components/ui/Button3D';

import courtroom from '@/assets/images/court-room.png';
import courtroomModern from '@/assets/images/court-room-modern.png';
import courtroomAppellate from '@/assets/images/court-room-appellate.png';
import courtroomContemporary from '@/assets/images/court-room-contemporary.png';

const heroBackgrounds = [
  { src: courtroom, alt: 'Traditional courtroom interior' },
  { src: courtroomModern, alt: 'Modern mahogany courtroom interior' },
  { src: courtroomAppellate, alt: 'Appellate courtroom interior' },
  { src: courtroomContemporary, alt: 'Contemporary high court interior' },
];

export default function HeroSection() {
  const [activeBackground, setActiveBackground] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveBackground((current) => (current + 1) % heroBackgrounds.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className='relative w-full min-h-screen overflow-hidden bg-[#050816] flex items-center justify-center py-0'>
      {/* Background Glow */}
      <div className='absolute inset-0 bg-gradient-to-br from-blue-950/40 via-black to-indigo-950/30' />

      {/* Floating Ambient Lights */}
      <motion.div
        animate={{
          x: [0, 40, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className='absolute top-[-120px] left-[-100px] w-[400px] h-[400px] rounded-full bg-blue-500/20 blur-3xl'
      />

      <motion.div
        animate={{
          x: [0, -50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className='absolute bottom-[-150px] right-[-100px] w-[450px] h-[450px] rounded-full bg-indigo-500/20 blur-3xl'
      />

      {/* Main Hero Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1 }}
        className='relative w-full min-h-screen overflow-hidden'
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Image Container */}
        <div className='relative w-full h-screen overflow-hidden bg-black'>
          {/* Five-second background carousel */}
          {heroBackgrounds.map((background, index) => (
            <motion.img
              key={background.src}
              src={background.src}
              alt={index === 0 ? background.alt : ''}
              aria-hidden={index !== activeBackground}
              initial={false}
              animate={{
                opacity: index === activeBackground ? 1 : 0,
                scale: index === activeBackground ? 1 : 1.025,
              }}
              transition={{
                opacity: { duration: 1.25 },
                scale: { duration: 5, ease: 'linear' },
              }}
              className='absolute inset-0 h-full w-full object-cover'
            />
          ))}

          {/* Hero Content */}
          <div className='relative z-10 flex min-h-screen w-full items-center justify-center px-3 sm:px-4 lg:px-6 xl:px-8'>
            <div className='w-full max-w-6xl text-center'>
              {/* Small Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className='hero-kicker-3d mb-6 inline-flex items-center gap-2 rounded-full border border-white/40 bg-black/35 px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm'
              >
                Modern Legal Management Platform
              </motion.div>

              {/* Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                className='hero-heading-3d text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight text-white'
              >
                Simplify
                <span className='block text-white'>
                  Legal Operations
                </span>
              </motion.h1>

              {/* Paragraph */}
              <motion.p
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 1 }}
                className='hero-copy-3d mx-auto mt-8 max-w-2xl text-base font-semibold leading-relaxed text-white sm:text-lg md:text-xl'
              >
                Manage cases, clients, compliance, and legal workflows
                seamlessly in one secure and intelligent platform designed for
                modern law firms.
              </motion.p>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 1 }}
                className='mt-12 flex flex-wrap justify-center gap-5'
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link to='/login'>
                    <Button3D size='lg' variant='darkAccent'>
                      Member Login
                    </Button3D>
                  </Link>
                </motion.div>
              </motion.div>

              <div className='mt-10 flex items-center justify-center gap-2' aria-label='Hero background selector'>
                {heroBackgrounds.map((background, index) => (
                  <button
                    key={background.src}
                    type='button'
                    onClick={() => setActiveBackground(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${index === activeBackground ? 'w-8 bg-white' : 'w-3 bg-white/45 hover:bg-white/75'}`}
                    aria-label={`Show background ${index + 1}`}
                    aria-current={index === activeBackground ? 'true' : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

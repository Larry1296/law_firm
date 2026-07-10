import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Button3D from '@/components/ui/Button3D';

import courtroom from '@/assets/images/court-room.png';

export default function HeroSection() {
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
          {/* Background Image */}
          <motion.img
            src={courtroom}
            alt='Courtroom'
            animate={{
              scale: [1, 1.06, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className='absolute inset-0 w-full h-full object-cover'
          />

          {/* Dark Overlay */}
          <div className='absolute inset-0 bg-black/65' />

          {/* Cinematic Gradient */}
          <div className='absolute inset-0 bg-gradient-to-br from-blue-950/40 via-black/20 to-indigo-950/50' />

          {/* Glass Shine */}
          <div className='absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent pointer-events-none' />

          {/* Floating Particles */}
          <div className='absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:32px_32px]' />

          {/* Hero Content */}
          <div className='relative z-10 flex items-center justify-center min-h-screen px-6'>
            <div className='text-center max-w-4xl'>
              {/* Small Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className='inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-sm text-blue-100 shadow-lg mb-6'
              >
                Modern Legal Management Platform
              </motion.div>

              {/* Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                className='text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight text-white'
              >
                Simplify
                <span className='block bg-gradient-to-r from-blue-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent'>
                  Legal Operations
                </span>
              </motion.h1>

              {/* Paragraph */}
              <motion.p
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 1 }}
                className='mt-8 text-base sm:text-lg md:text-xl text-gray-200 leading-relaxed max-w-2xl mx-auto'
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
                  <Link to='/register'>
                    <Button3D size='lg' variant='primary'>
                      Start Free
                    </Button3D>
                  </Link>
                </motion.div>

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
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

import { ShieldCheck, Scale, Gavel, Users, ArrowRight } from 'lucide-react';

import { motion } from 'framer-motion';

import SectionHeading from '@/components/ui/SectionHeading';
import Card from '@/components/ui/Card';

export default function AboutSection() {
  const items = [
    {
      icon: ShieldCheck,
      title: 'Trusted Expertise',
      description:
        'Years of experience handling complex legal matters with precision and confidentiality.',
    },
    {
      icon: Scale,
      title: 'Fair Representation',
      description:
        'Balanced legal counsel focused on protecting your rights and interests.',
    },
    {
      icon: Gavel,
      title: 'Strategic Advocacy',
      description:
        'Strong legal strategies designed to achieve successful outcomes efficiently.',
    },
    {
      icon: Users,
      title: 'Client Focused',
      description:
        'Every client receives personalized support and transparent communication.',
    },
  ];

  return (
    <section
      id='about'
      className='relative overflow-hidden bg-[#070B1A] py-24 px-6 lg:px-16'
    >
      {/* Background Glow */}
      <div className='absolute inset-0'>
        <div className='absolute top-[-120px] left-[-100px] w-[380px] h-[380px] rounded-full bg-blue-500/10 blur-3xl' />

        <div className='absolute bottom-[-140px] right-[-100px] w-[420px] h-[420px] rounded-full bg-indigo-500/10 blur-3xl' />
      </div>

      <div className='relative z-10'>
        {/* Heading */}
        <SectionHeading
          title='About Our Legal Practice'
          subtitle='We combine legal excellence with modern technology to deliver secure, intelligent, and client-focused legal solutions.'
          variant='dark'
        />

        {/* Feature Cards */}
        <div className='grid md:grid-cols-2 xl:grid-cols-4 gap-7 max-w-7xl mx-auto mt-16'>
          {items.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                }}
                viewport={{ once: true }}
                whileHover={{
                  y: -8,
                }}
                className='group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]'
              >
                {/* Glow */}
                <div className='absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10' />

                {/* Icon */}
                <div className='relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20'>
                  <Icon className='w-8 h-8 text-white' />
                </div>

                {/* Content */}
                <div className='relative mt-6'>
                  <h3 className='text-xl font-bold text-white'>{item.title}</h3>

                  <p className='mt-4 text-gray-300 leading-relaxed text-sm'>
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mission Section */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className='relative mt-24 max-w-7xl mx-auto overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]'
        >
          <div className='grid lg:grid-cols-2'>
            {/* Left */}
            <div className='p-10 lg:p-14'>
              <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-400/20 bg-blue-500/10 text-blue-200 text-sm'>
                Our Mission
              </div>

              <h3 className='mt-6 text-3xl md:text-4xl font-black text-white leading-tight'>
                Redefining Modern
                <span className='block bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent'>
                  Legal Services
                </span>
              </h3>

              <p className='mt-6 text-gray-300 leading-relaxed'>
                We leverage technology, strategic expertise, and client-centered
                practices to simplify legal operations while maintaining the
                highest standards of professionalism and confidentiality.
              </p>

              <p className='mt-4 text-gray-400 leading-relaxed'>
                Our approach ensures faster workflows, transparent
                communication, and efficient legal management for individuals,
                firms, and organizations.
              </p>

              <button className='mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg shadow-blue-500/20 hover:scale-105 transition'>
                Learn More
                <ArrowRight className='w-4 h-4' />
              </button>
            </div>

            {/* Right Quote Card */}
            <div className='relative flex items-center justify-center p-10 lg:p-14'>
              {/* Glow */}
              <div className='absolute w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-3xl' />

              <div className='relative w-full rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] backdrop-blur-xl p-10 shadow-[0_15px_60px_rgba(0,0,0,0.35)]'>
                <div className='text-6xl text-blue-400/30 font-black'>“</div>

                <p className='mt-2 text-xl md:text-2xl leading-relaxed text-white font-medium'>
                  Justice should be accessible, transparent, and efficient for
                  everyone.
                </p>

                <div className='mt-8 h-px bg-white/10' />

                <div className='mt-6'>
                  <p className='text-white font-semibold'>
                    Modern Legal Platform
                  </p>

                  <p className='text-sm text-gray-400 mt-1'>
                    Trusted Legal Excellence
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

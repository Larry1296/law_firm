// src/modules/public/HomePage.jsx
import HeroSection from '@/modules/public/sections/HeroSection';
import AboutSection from '@/modules/public/sections/AboutSection';
import ServicesSection from '@/modules/public/sections/ServicesSection';
import HowItWorks from '@/modules/public/sections/HowItWorks';
import FeaturesSection from '@/modules/public/sections/FeaturesSection';
import CTASection from '@/modules/public/sections/CTASection';
import Testimonials from '@/modules/public/sections/Testimonials';
import ContactSection from '@/modules/public/sections/ContactSection';

import FloatingAIChat from '@/components/ai/FloatingAIChat';

export default function HomePage() {
  return (
    <div className='public-home overflow-x-hidden bg-[color:var(--bg)] text-[color:var(--text-primary)]'>
      {/* AI Chat */}
      <FloatingAIChat />

      {/* Hero / Landing */}
      <section id='home' className='pt-0'>
        <HeroSection />
      </section>

      {/* About Section */}
      <section id='about' className='pt-0'>
        <AboutSection />
      </section>

      {/* Services / Offerings */}
      <section id='services' className='pt-0'>
        <ServicesSection />
      </section>

      {/* How It Works / Steps */}
      <section id='how-it-works' className='pt-0'>
        <HowItWorks />
      </section>

      {/* Features / Highlights */}
      <section id='features' className='pt-0'>
        <FeaturesSection />
      </section>

      {/* Call to Action */}
      <section id='cta' className='pt-0'>
        <CTASection />
      </section>

      {/* Testimonials */}
      <section id='testimonials' className='pt-0'>
        <Testimonials />
      </section>

      {/* Contact / Footer */}
      <section id='contact' className='pt-0'>
        <ContactSection />
      </section>
    </div>
  );
}

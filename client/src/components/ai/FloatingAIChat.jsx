import { useState, useRef, useEffect } from 'react';
import Button3D from '@/components/ui/Button3D';

const sectionPrompts = {
  home: 'Have any legal or firm-related question?',
  about: 'Want to learn more about our firm?',
  services: 'Need help choosing the right legal service?',
  'how-it-works': 'Want to understand how our process works?',
  features: 'Curious how our legal platform supports you?',
  cta: 'Ready to take the next step with us?',
  testimonials: 'Want to hear more from our clients?',
  contact: 'Need help reaching the right legal team?',
};

const sectionIds = Object.keys(sectionPrompts);

export default function FloatingAIChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [activeSection, setActiveSection] = useState('home');
  const chatRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (chatRef.current && !chatRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const updateActiveSection = () => {
      let currentSection = 'home';

      sectionIds.forEach((sectionId) => {
        const section = document.getElementById(sectionId);
        if (!section) return;

        const rect = section.getBoundingClientRect();

        if (rect.top <= window.innerHeight * 0.45 && rect.bottom >= 160) {
          currentSection = sectionId;
        }
      });

      setActiveSection(currentSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  const promptText = sectionPrompts[activeSection] || sectionPrompts.home;

  return (
    <div
      ref={chatRef}
      className='fixed bottom-6 right-6 z-[9999] flex flex-col items-end'
    >
      {/* Chat Panel */}
      {open && (
        <div
          className='
            w-[340px] sm:w-[380px]
            h-[420px]
            mb-3
            rounded-2xl
            shadow-strong
            border
            border-border-light dark:border-border-dark
            bg-surface-light dark:bg-surface-dark
            flex flex-col
            animate-fadeIn
            overflow-hidden
          '
        >
          {/* Header */}
          <div className='px-4 py-3 border-b border-border-light dark:border-border-dark'>
            <p className='text-sm font-semibold text-text-primary-light dark:text-text-primary-dark'>
              Legal Assistant
            </p>
            <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>
              {promptText}
            </p>
          </div>

          {/* Messages */}
          <div className='flex-1 p-3 overflow-y-auto'>
            <div className='text-sm text-text-muted-light dark:text-text-muted-dark'>
              Start by typing your question...
            </div>
          </div>

          {/* Input */}
          <div className='p-3 border-t border-border-light dark:border-border-dark'>
            <div className='flex items-center gap-2'>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder='Ask your legal question...'
                className='
                  flex-1
                  px-3 py-2
                  rounded-md
                  bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark
                  text-text-primary-light dark:text-text-primary-dark
                  placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark
                  focus:outline-none focus:ring-2 focus:ring-success
                '
              />

              <button
                className='
                  px-3 py-2
                  rounded-md
                  bg-success
                  text-white
                  font-semibold
                  hover:opacity-90
                  transition
                '
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button (Dark mode optimized) */}
      <Button3D
        type='button'
        variant='aiGlow'
        size='md'
        onClick={() => setOpen(!open)}
        className='
          floating-ai-trigger
          relative
          overflow-hidden
          max-w-[calc(100vw-3rem)]
          font-extrabold
          hover:scale-[1.04]
          transition-all
          before:absolute
          before:inset-0
          before:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.58),transparent)]
          before:-translate-x-full
          hover:before:translate-x-full
          before:transition-transform
          before:duration-700
        '
      >
        <span className='relative z-10 whitespace-nowrap'>
          {open ? '✕' : promptText}
        </span>
      </Button3D>
    </div>
  );
}

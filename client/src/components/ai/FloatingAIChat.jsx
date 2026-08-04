import { useEffect, useId, useRef, useState } from 'react';
import { ExternalLink, Maximize2, MessageCircle, Minimize2, RefreshCw, Send, X } from 'lucide-react';

import Button3D from '@/components/ui/Button3D';
import { askKnowledgeBase, getKnowledgeBaseCategories } from './knowledgeBaseService';
import SafeMarkdown from './SafeMarkdown';

const SECTION_COPY = {
  home: {
    launcher: 'Chat with this Firm legal assistant',
    welcome: 'Ask about the firm or a general legal topic. I use approved public information and show the sources I rely on.',
  },
  about: {
    launcher: 'Ask about the Firm',
    welcome: 'Would you like to learn about the Firm or its consultation process? I use only approved public Firm information.',
  },
  practice_areas: {
    launcher: 'Ask about our practice areas',
    welcome: 'Would you like to know more about one of the firm’s published practice areas?',
  },
  consultation: {
    launcher: 'Need to speak to an advocate?',
    welcome: 'I can explain the firm’s approved consultation process or help you find a way to speak to an advocate.',
  },
  contact: {
    launcher: 'Need to speak to an advocate?',
    welcome: 'I can help with the firm’s approved contact and consultation information.',
  },
};

const GENERIC_SUGGESTIONS = [
  'What legal services does the firm provide?',
  'What does access to justice mean in Kenya?',
  'What principles apply to personal data in Kenya?',
];

function welcomeMessage(section) {
  return { role: 'assistant', content: SECTION_COPY[section]?.welcome ?? SECTION_COPY.home.welcome, sources: [] };
}

function errorMessage(error) {
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (error?.response?.status === 429) return 'Too many questions have been sent from this connection. Please try again later.';
  if (error?.response?.status >= 500) return 'The assistant is temporarily unavailable. Please try again later or contact the firm.';
  return error?.response?.data?.message || 'I could not connect to the assistant. Check your connection and try again.';
}

export default function FloatingAIChat({ activeSection = 'home' }) {
  const safeSection = Object.hasOwn(SECTION_COPY, activeSection) ? activeSection : 'home';
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([welcomeMessage('home')]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const abortRef = useRef(null);
  const widgetRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    getKnowledgeBaseCategories(safeSection, controller.signal)
      .then((items) => setSuggestions(items.filter(Boolean).slice(0, 4)))
      .catch(() => setSuggestions(GENERIC_SUGGESTIONS));
    textareaRef.current?.focus();
    return () => controller.abort();
  }, [open, safeSection]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const enforceDesktopOnlyMaximize = (event) => {
      if (!event.matches) setMaximized(false);
    };
    desktop.addEventListener('change', enforceDesktopOnlyMaximize);
    return () => desktop.removeEventListener('change', enforceDesktopOnlyMaximize);
  }, []);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, loading]);

  const resizeInput = () => {
    const input = textareaRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  };

  const close = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setMaximized(false);
    setOpen(false);
  };

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setMaximized(false);
    setDraft('');
    setMessages([welcomeMessage(safeSection)]);
    requestAnimationFrame(() => {
      resizeInput();
      textareaRef.current?.focus();
    });
  };

  const sendQuestion = async (value = draft) => {
    const question = value.trim();
    if (!question || loading) return;
    const prior = messages
      .filter((item) => !item.error)
      .slice(-10)
      .map(({ role, content }) => ({ role, content }));
    setMessages((items) => [...items, { role: 'user', content: question }]);
    setDraft('');
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await askKnowledgeBase(question, prior, safeSection, controller.signal);
      if (controller.signal.aborted) return;
      setMessages((items) => [...items, {
        role: 'assistant', content: result.answer, sources: result.sources ?? [], needsLawyer: result.needs_lawyer,
        disclaimer: result.disclaimer,
      }]);
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessages((items) => [...items, { role: 'assistant', content: errorMessage(error), error: true }]);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendQuestion();
    }
  };

  return (
    <div ref={widgetRef} className={`fixed right-4 z-40 flex flex-col items-end sm:right-6 ${maximized ? 'bottom-4 top-28 sm:bottom-6 sm:top-32' : 'bottom-4 sm:bottom-6'}`}>
      {open && (
        <section
          role='dialog'
          aria-modal='false'
          aria-labelledby={titleId}
          className={`mb-3 flex flex-col overflow-hidden rounded-2xl border border-border-light bg-surface-light shadow-strong transition-[width,height] duration-200 motion-reduce:transition-none dark:border-border-dark dark:bg-surface-dark ${maximized ? 'min-h-0 w-[75vw] flex-1 lg:w-[min(50vw,800px)]' : 'h-[min(680px,calc(100dvh-12rem))] w-[calc(100vw-2rem)] sm:w-[430px] lg:h-[min(680px,calc(100dvh-7rem))]'}`}
        >
          <header className='flex items-start justify-between gap-2 border-b border-border-light px-3 py-3 dark:border-border-dark sm:gap-3 sm:px-4'>
            <div className='min-w-0 flex-1'>
              <h2 id={titleId} className='truncate text-sm font-bold text-text-primary-light dark:text-text-primary-dark sm:whitespace-normal'>{SECTION_COPY[safeSection].launcher}</h2>
              <p className='mt-1 text-xs text-text-muted-light dark:text-text-muted-dark'>Answers from approved public information</p>
            </div>
            <div className='flex shrink-0 gap-1'>
              <button type='button' onClick={() => setMaximized((value) => !value)} aria-label={maximized ? 'Minimize assistant' : 'Maximize assistant'} className='hidden rounded-md p-2 text-text-muted-light hover:bg-background-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success dark:text-text-muted-dark dark:hover:bg-background-dark lg:inline-flex'>{maximized ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
              <button type='button' onClick={reset} aria-label='Start a new conversation' className='rounded-md p-2 text-text-muted-light hover:bg-background-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success dark:text-text-muted-dark dark:hover:bg-background-dark'><RefreshCw size={17} /></button>
              <button type='button' onClick={close} aria-label='Close assistant' className='rounded-md p-2 text-text-muted-light hover:bg-background-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success dark:text-text-muted-dark dark:hover:bg-background-dark'><X size={18} /></button>
            </div>
          </header>

          <div ref={messagesRef} aria-live='polite' aria-busy={loading} className='flex-1 space-y-4 overflow-y-auto p-4'>
            {messages.map((item, index) => (
              <article key={`${item.role}-${index}`} className={item.role === 'user' ? 'ml-10 rounded-2xl rounded-br-sm bg-brand-primary p-3 text-sm text-white' : `mr-5 rounded-2xl rounded-bl-sm border p-3 text-sm ${item.error ? 'border-red-300 bg-red-50 text-red-800' : 'border-border-light bg-background-light text-text-primary-light dark:border-border-dark dark:bg-background-dark dark:text-text-primary-dark'}`}>
                <SafeMarkdown content={index === 0 && messages.length === 1 ? SECTION_COPY[safeSection].welcome : item.content} />
                {item.disclaimer && <p className='mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100'>{item.disclaimer}</p>}
                {item.sources?.length > 0 && (
                  <div className='mt-3 space-y-2 border-t border-border-light pt-2 dark:border-border-dark'>
                    <p className='text-xs font-bold'>Sources</p>
                    {item.sources.map((source) => (
                      <div key={`${source.title}-${source.source_reference}`} className='rounded-lg border border-border-light p-2 text-xs dark:border-border-dark'>
                        <p className='font-semibold'>{source.title}</p>
                        <p className='mt-1 text-text-muted-light dark:text-text-muted-dark'>{source.source_name}{source.source_reference ? ` · ${source.source_reference}` : ''}</p>
                        {source.source_url && <a href={source.source_url} target='_blank' rel='noreferrer' className='mt-1 inline-flex items-center gap-1 text-blue-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success dark:text-blue-300'>{source.source_name === 'Kenya Law' ? 'Open official source' : 'Open public source'} <ExternalLink size={12} /></a>}
                      </div>
                    ))}
                  </div>
                )}
                {item.needsLawyer && <a href='#contact' onClick={close} className='mt-3 inline-flex rounded-md bg-success px-3 py-2 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'>Speak to an advocate</a>}
              </article>
            ))}
            {messages.length === 1 && <div aria-label='Suggested questions' className='flex flex-wrap gap-2'>{(suggestions.length ? suggestions : GENERIC_SUGGESTIONS).map((suggestion) => <button key={suggestion} type='button' onClick={() => sendQuestion(suggestion)} className='rounded-full border border-border-light px-3 py-2 text-left text-xs text-text-primary-light hover:bg-background-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success dark:border-border-dark dark:text-text-primary-dark dark:hover:bg-background-dark'>{suggestion}</button>)}</div>}
            {loading && <div role='status' className='mr-20 rounded-2xl bg-background-light p-3 text-sm text-text-muted-light dark:bg-background-dark dark:text-text-muted-dark'>Checking verified sources…</div>}
          </div>

          <div className='border-t border-border-light p-3 dark:border-border-dark'>
            <p className='mb-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300'>Do not submit confidential, privileged, or highly sensitive information.</p>
            <div className='flex items-end gap-2'>
              <label htmlFor={`${titleId}-input`} className='sr-only'>Ask a question</label>
              <textarea id={`${titleId}-input`} ref={textareaRef} rows={1} maxLength={1200} value={draft} onChange={(event) => { setDraft(event.target.value); resizeInput(); }} onKeyDown={handleKeyDown} disabled={loading} placeholder='Ask about the firm or a legal topic…' className='max-h-[120px] min-h-10 flex-1 resize-none rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success disabled:opacity-60 dark:border-border-dark dark:bg-background-dark dark:text-text-primary-dark' />
              <button type='button' onClick={() => sendQuestion()} disabled={!draft.trim() || loading} aria-label='Send question' className='rounded-lg bg-success p-2.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'><Send size={18} /></button>
            </div>
          </div>
        </section>
      )}

      <Button3D type='button' variant='aiGlow' size='md' onClick={() => (open ? close() : setOpen(true))} aria-expanded={open} aria-haspopup='dialog' aria-label={open ? 'Close firm legal assistant' : `Open assistant: ${SECTION_COPY[safeSection].launcher.replace('this Firm', 'Firm')}`} className='floating-ai-trigger max-w-[calc(100vw-2rem)] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2'>
        <span className='flex items-center gap-2 transition-opacity duration-150 motion-reduce:transition-none'>{open ? <X size={18} /> : <MessageCircle size={18} />}{open ? 'Close' : SECTION_COPY[safeSection].launcher}</span>
      </Button3D>
    </div>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Maximize2, MessageCircle, Minimize2, RefreshCw, Send, X } from 'lucide-react';

import Button3D from '@/components/ui/Button3D';
import {
  askKnowledgeBase,
  askLegalAssistant,
  getKnowledgeBaseCategories,
  getLegalAssistantSuggestions,
} from './knowledgeBaseService';
import SafeMarkdown from './SafeMarkdown';
import { OPEN_ASSISTANT_EVENT } from './assistantEvents';

const SECTION_COPY = {
  home: {
    launcher: 'Hi! How can I help you?',
    title: 'Chat with this Firm legal assistant',
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

const PLATFORM_COPY = {
  launcher: 'Ask about Kenyan law',
  title: 'Kenyan law assistant',
  subtitle: 'General information on the law of Kenya, from official sources',
  welcome: 'Ask me a question about the law of Kenya: your rights, court processes, employment, land, family and more. I answer from official sources and show them. This is general information, not legal advice.',
  placeholder: 'Ask about the law of Kenya…',
};

const HISTORY_MESSAGE_LIMIT = 1500;

const GENERIC_SUGGESTIONS = [
  'What are the steps in a court case?',
  'How do I become a client?',
  'What legal services does the firm provide?',
  'What does access to justice mean in Kenya?',
  'What principles apply to personal data in Kenya?',
];

function welcomeMessage(section, platform = false) {
  const content = platform ? PLATFORM_COPY.welcome : SECTION_COPY[section]?.welcome ?? SECTION_COPY.home.welcome;
  return { role: 'assistant', content, sources: [] };
}

function errorMessage(error) {
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (error?.response?.status === 429) return 'Too many questions have been sent from this connection. Please try again later.';
  if (error?.response?.status >= 500) return 'The assistant is temporarily unavailable. Please try again later or contact the firm.';
  if (error?.response?.status === 404) return 'The assistant is not set up for this website yet. Please contact the firm directly.';
  return error?.response?.data?.message || error?.response?.data?.detail || 'I could not connect to the assistant. Check your connection and try again.';
}

export default function FloatingAIChat({
  activeSection = 'home',
  mode = 'firm',
  title,
  subtitle,
  suggestions: suggestedQuestions,
  launcherLabel,
  // A dashboard assistant supplies its own copy and question handler.
  welcome,
  ask: askOverride,
  placeholder,
  footnote = 'Do not submit confidential, privileged, or highly sensitive information.',
  loadingLabel = 'Checking verified sources…',
}) {
  const platform = mode === 'platform';
  const safeSection = Object.hasOwn(SECTION_COPY, activeSection) ? activeSection : 'home';
  const resolvedTitle = title ?? (platform ? PLATFORM_COPY.title : SECTION_COPY[safeSection].title ?? SECTION_COPY[safeSection].launcher);
  const resolvedSubtitle = subtitle ?? (platform ? PLATFORM_COPY.subtitle : 'Answers from approved public information');
  const resolvedLauncherLabel = launcherLabel ?? (platform ? PLATFORM_COPY.launcher : SECTION_COPY[safeSection].launcher);
  const loadSuggestions = platform ? getLegalAssistantSuggestions : getKnowledgeBaseCategories;
  const ask = askOverride ?? (platform ? askLegalAssistant : askKnowledgeBase);
  const firstMessage = (section) => (welcome ? { role: 'assistant', content: welcome, sources: [] } : welcomeMessage(section, platform));
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(() => [firstMessage('home')]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const abortRef = useRef(null);
  const widgetRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesRef = useRef(null);
  const latestQuestionRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    if (suggestedQuestions) {
      setSuggestions(suggestedQuestions.filter(Boolean).slice(0, 4));
      textareaRef.current?.focus();
      return undefined;
    }
    const controller = new AbortController();
    loadSuggestions(safeSection, controller.signal)
      .then((items) => setSuggestions(items.filter(Boolean).slice(0, 4)))
      .catch(() => setSuggestions(GENERIC_SUGGESTIONS));
    textareaRef.current?.focus();
    return () => controller.abort();
  }, [open, safeSection, suggestedQuestions, loadSuggestions]);

  useEffect(() => {
    const openAssistant = () => setOpen(true);
    window.addEventListener(OPEN_ASSISTANT_EVENT, openAssistant);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, openAssistant);
  }, []);

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

  // Pin the latest question to the top of the thread so its answer reads downward.
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    const question = latestQuestionRef.current;
    if (!question) {
      container.scrollTop = 0;
      return;
    }
    const offset = question.getBoundingClientRect().top - container.getBoundingClientRect().top;
    container.scrollTop += offset - parseFloat(getComputedStyle(container).paddingTop || '0');
  }, [messages, loading]);

  const latestQuestionIndex = messages.findLastIndex((item) => item.role === 'user');

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
    setMessages([firstMessage(safeSection)]);
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
      // The server accepts at most 1,500 characters per earlier message; the start carries the context.
      .map(({ role, content }) => ({ role, content: String(content).slice(0, HISTORY_MESSAGE_LIMIT) }));
    setMessages((items) => [...items, { role: 'user', content: question }]);
    setDraft('');
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await ask(question, prior, safeSection, controller.signal);
      if (controller.signal.aborted) return;
      setMessages((items) => [...items, {
        role: 'assistant', content: result.answer, sources: result.sources ?? [], needsLawyer: result.needs_lawyer,
        disclaimer: result.disclaimer,
        // Only a page inside this app, never an outside link.
        action: /^\/(?!\/)/.test(result.action?.path || '') ? result.action : null,
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
    <div ref={widgetRef} className='fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end sm:bottom-6 sm:right-6 sm:max-w-[calc(100vw-3rem)]'>
      {open && (
        <section
          role='dialog'
          aria-modal='false'
          aria-labelledby={titleId}
          className={`mb-3 flex min-h-0 h-[min(600px,calc(100dvh-13rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border-light bg-surface-light shadow-strong transition-[width,height] duration-200 motion-reduce:transition-none dark:border-border-dark dark:bg-surface-dark sm:h-[min(600px,calc(100dvh-14rem))] sm:w-[430px] ${maximized ? 'lg:h-[min(720px,calc(100dvh-14rem))] lg:w-[min(50vw,800px)]' : ''}`}
        >
          <header className='flex shrink-0 items-start justify-between gap-2 border-b border-border-light px-3 py-3 dark:border-border-dark sm:gap-3 sm:px-4'>
            <div className='min-w-0 flex-1'>
              <h2 id={titleId} className='truncate text-sm font-bold text-text-primary-light dark:text-text-primary-dark sm:whitespace-normal'>{resolvedTitle}</h2>
              {resolvedSubtitle && <p className='mt-1 text-xs text-text-muted-light dark:text-text-muted-dark'>{resolvedSubtitle}</p>}
            </div>
            <div className='flex shrink-0 gap-1'>
              <button type='button' onClick={() => setMaximized((value) => !value)} aria-label={maximized ? 'Minimize assistant' : 'Maximize assistant'} className='hidden rounded-md p-2 text-text-muted-light hover:bg-background-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success dark:text-text-muted-dark dark:hover:bg-background-dark lg:inline-flex'>{maximized ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
              <button type='button' onClick={reset} aria-label='Start a new conversation' className='rounded-md p-2 text-text-muted-light hover:bg-background-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success dark:text-text-muted-dark dark:hover:bg-background-dark'><RefreshCw size={17} /></button>
              <button type='button' onClick={close} aria-label='Close assistant' className='rounded-md p-2 text-text-muted-light hover:bg-background-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success dark:text-text-muted-dark dark:hover:bg-background-dark'><X size={18} /></button>
            </div>
          </header>

          <div ref={messagesRef} aria-live='polite' aria-busy={loading} className='min-h-0 flex-1 space-y-5 overflow-y-auto p-4'>
            {messages.map((item, index) => (
              <article key={`${item.role}-${index}`} ref={index === latestQuestionIndex ? latestQuestionRef : undefined} className={item.role === 'user' ? 'ml-10 rounded-2xl rounded-br-sm bg-brand-primary px-4 py-3 text-sm text-white' : `mr-3 rounded-2xl rounded-bl-sm border px-4 py-3.5 text-sm ${item.error ? 'border-red-300 bg-red-50 text-red-800' : 'border-border-light bg-background-light text-text-primary-light dark:border-border-dark dark:bg-background-dark dark:text-text-primary-dark'}`}>
                <SafeMarkdown content={item.content} />
                {item.disclaimer && <p className='mt-4 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100'>{item.disclaimer}</p>}
                {item.sources?.length > 0 && (
                  <div className='mt-4 space-y-2 border-t border-border-light pt-3 dark:border-border-dark'>
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
                {item.action && <Link to={item.action.path} onClick={close} className='mt-3 inline-flex rounded-md bg-brand-primary px-3 py-2 text-xs font-bold text-white hover:bg-[#0e2c47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:bg-sky-600 dark:hover:bg-sky-500'>{item.action.label}</Link>}
                {item.needsLawyer && platform && <p className='mt-3 text-xs font-semibold'>For advice on your own situation, speak to a qualified advocate.</p>}
                {item.needsLawyer && !platform && <a href='#contact' onClick={close} className='mt-3 inline-flex rounded-md bg-success px-3 py-2 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'>Speak to an advocate</a>}
              </article>
            ))}
            {messages.length === 1 && <div aria-label='Suggested questions' className='flex flex-wrap gap-2'>{(suggestions.length ? suggestions : GENERIC_SUGGESTIONS).map((suggestion) => <button key={suggestion} type='button' onClick={() => sendQuestion(suggestion)} className='rounded-full border border-border-light px-3 py-2 text-left text-xs text-text-primary-light hover:bg-background-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success dark:border-border-dark dark:text-text-primary-dark dark:hover:bg-background-dark'>{suggestion}</button>)}</div>}
            {loading && <div role='status' className='mr-20 rounded-2xl bg-background-light p-3 text-sm text-text-muted-light dark:bg-background-dark dark:text-text-muted-dark'>{loadingLabel}</div>}
          </div>

          <div className='shrink-0 border-t border-border-light p-3 dark:border-border-dark'>
            {footnote && <p className='mb-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300'>{footnote}</p>}
            <div className='flex items-end gap-2'>
              <label htmlFor={`${titleId}-input`} className='sr-only'>Ask a question</label>
              <textarea id={`${titleId}-input`} ref={textareaRef} rows={1} maxLength={1200} value={draft} onChange={(event) => { setDraft(event.target.value); resizeInput(); }} onKeyDown={handleKeyDown} disabled={loading} placeholder={placeholder ?? (platform ? PLATFORM_COPY.placeholder : 'Ask about the firm or a legal topic…')} className='max-h-[120px] min-h-10 flex-1 resize-none rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm text-text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success disabled:opacity-60 dark:border-border-dark dark:bg-background-dark dark:text-text-primary-dark' />
              <button type='button' onClick={() => sendQuestion()} disabled={!draft.trim() || loading} aria-label='Send question' className='rounded-lg bg-success p-2.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'><Send size={18} /></button>
            </div>
          </div>
        </section>
      )}

      <Button3D type='button' variant='aiGlow' size='md' onClick={() => (open ? close() : setOpen(true))} aria-expanded={open} aria-haspopup='dialog' aria-label={open ? (askOverride ? `Close ${resolvedTitle}` : platform ? 'Close Kenyan law assistant' : 'Close firm legal assistant') : `Open assistant: ${resolvedLauncherLabel.replace('this Firm', 'Firm')}`} className='floating-ai-trigger max-w-full font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2'>
        <span className='flex items-center gap-2 transition-opacity duration-150 motion-reduce:transition-none'>{open ? <X size={18} /> : <MessageCircle size={18} />}{open ? 'Close' : resolvedLauncherLabel}</span>
      </Button3D>
    </div>
  );
}

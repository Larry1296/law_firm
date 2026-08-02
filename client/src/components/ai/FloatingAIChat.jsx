import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Scale, ChevronDown, Loader2, RotateCcw } from 'lucide-react';
import axios from 'axios';

/* =========================================================
   Section-aware prompt hints
========================================================= */
const sectionPrompts = {
  home: 'Have a legal question? Ask Sheria AI →',
  about: 'Want to learn more about Sheria Master?',
  services: 'Need help choosing the right legal service?',
  'how-it-works': 'Curious how our process works?',
  features: 'How can our platform support you?',
  cta: 'Ready to take the next step with us?',
  testimonials: 'Want to hear more from our clients?',
  contact: 'Need help reaching the right legal team?',
};

const sectionIds = Object.keys(sectionPrompts);

/* =========================================================
   Suggested starter questions
========================================================= */
const SUGGESTED_QUESTIONS = [
  'What are my rights as an employee in Kenya?',
  'How do I register a company in Kenya?',
  'What is the process for buying land in Kenya?',
  'How does divorce work under Kenyan law?',
  'What areas of law does Sheria Master cover?',
  'How do I book a consultation with the firm?',
];

/* =========================================================
   Simple markdown → plain formatting helper
   (renders bold **text** and bullet lists)
========================================================= */
function FormattedMessage({ text }) {
  const lines = text.split('\n');
  return (
    <div className='space-y-1'>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className='h-2' />;

        // Bullet list items: lines starting with - or *
        const bulletMatch = line.match(/^[\-\*]\s+(.+)/);
        if (bulletMatch) {
          return (
            <div key={i} className='flex gap-1.5'>
              <span className='mt-0.5 text-[color:var(--brand-accent)] shrink-0'>•</span>
              <span dangerouslySetInnerHTML={{ __html: renderInline(bulletMatch[1]) }} />
            </div>
          );
        }

        // Numbered list items
        const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
        if (numberedMatch) {
          return (
            <div key={i} className='flex gap-1.5'>
              <span className='text-[color:var(--brand-accent)] shrink-0 font-semibold'>
                {numberedMatch[1]}.
              </span>
              <span dangerouslySetInnerHTML={{ __html: renderInline(numberedMatch[2]) }} />
            </div>
          );
        }

        // Headings: ## or **heading**
        const headingMatch = line.match(/^#{1,3}\s+(.+)/);
        if (headingMatch) {
          return (
            <p key={i} className='font-bold text-[color:var(--brand-primary)] mt-2'
              dangerouslySetInnerHTML={{ __html: renderInline(headingMatch[1]) }} />
          );
        }

        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
        );
      })}
    </div>
  );
}

function renderInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/* =========================================================
   Message bubble component
========================================================= */
function MessageBubble({ role, content, isStreaming }) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className='mr-2 mt-0.5 w-7 h-7 rounded-full bg-[color:var(--brand-primary)] flex items-center justify-center shrink-0'>
          <Scale size={13} className='text-white' />
        </div>
      )}
      <div
        className={`
          max-w-[82%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-[color:var(--brand-primary)] text-white rounded-br-sm'
            : 'bg-[color:var(--surface-raised)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-bl-sm'
          }
        `}
      >
        {isUser ? (
          <p>{content}</p>
        ) : (
          <>
            <FormattedMessage text={content} />
            {isStreaming && (
              <span className='inline-block w-1.5 h-3.5 bg-[color:var(--brand-accent)] rounded-sm ml-0.5 animate-pulse' />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Typing indicator
========================================================= */
function TypingIndicator() {
  return (
    <div className='flex justify-start mb-3'>
      <div className='mr-2 mt-0.5 w-7 h-7 rounded-full bg-[color:var(--brand-primary)] flex items-center justify-center shrink-0'>
        <Scale size={13} className='text-white' />
      </div>
      <div className='px-4 py-3 rounded-2xl rounded-bl-sm bg-[color:var(--surface-raised)] border border-[color:var(--border)] flex items-center gap-1.5'>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className='w-1.5 h-1.5 rounded-full bg-[color:var(--text-muted)] animate-bounce'
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   Main FloatingAIChat component
========================================================= */
export default function FloatingAIChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('home');
  const [showSuggestions, setShowSuggestions] = useState(true);

  const chatRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // ── scroll to bottom whenever messages change ──────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (chatRef.current && !chatRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── section-aware prompt tracking ─────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      let current = 'home';
      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.45 && rect.bottom >= 160) {
          current = id;
        }
      });
      setActiveSection(current);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // ── focus input when panel opens ──────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  // ── send question to backend ───────────────────────────────────────────────
  const sendMessage = useCallback(async (questionText) => {
    const question = (questionText ?? input).trim();
    if (!question || loading) return;

    // Optimistically add user message
    const userMsg = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    // Build history (exclude the message we just appended)
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '');
      const { data } = await axios.post(
        `${apiBase}/knowledge-base/ask/`,
        { question, history },
        { signal: abortRef.current?.signal },
      );

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer },
      ]);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED') return;
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.errors?.question?.[0] ||
        'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setError(null);
    setShowSuggestions(true);
    setInput('');
  };

  const promptText = sectionPrompts[activeSection] ?? sectionPrompts.home;
  const hasMessages = messages.length > 0;

  return (
    <div
      ref={chatRef}
      className='fixed bottom-6 right-6 z-[9999] flex flex-col items-end'
    >
      {/* ── Chat Panel ───────────────────────────────────────────────── */}
      {open && (
        <div
          className='
            w-[340px] sm:w-[390px]
            mb-3
            rounded-2xl
            shadow-[var(--shadow-strong)]
            border border-[color:var(--border)]
            bg-[color:var(--bg)]
            flex flex-col
            overflow-hidden
            animate-fadeIn
          '
          style={{ height: 'min(520px, calc(100vh - 120px))' }}
        >
          {/* Header */}
          <div className='
            px-4 py-3
            border-b border-[color:var(--border)]
            bg-[color:var(--brand-primary)]
            flex items-center justify-between
            shrink-0
          '>
            <div className='flex items-center gap-2.5'>
              <div className='w-8 h-8 rounded-full bg-white/20 flex items-center justify-center'>
                <Scale size={16} className='text-white' />
              </div>
              <div>
                <p className='text-sm font-bold text-white'>Sheria AI</p>
                <p className='text-[11px] text-white/70'>Legal Assistant · Kenyan Law</p>
              </div>
            </div>

            <div className='flex items-center gap-1'>
              {hasMessages && (
                <button
                  type='button'
                  onClick={handleReset}
                  title='Start new conversation'
                  className='p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition'
                >
                  <RotateCcw size={14} />
                </button>
              )}
              <button
                type='button'
                onClick={() => setOpen(false)}
                className='p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition'
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className='flex-1 overflow-y-auto px-3 pt-3 pb-1 min-h-0'>
            {/* Welcome state */}
            {!hasMessages && (
              <div className='flex flex-col items-center justify-center h-full text-center px-4 gap-3 pb-4'>
                <div className='w-14 h-14 rounded-full bg-[color:var(--brand-primary)] flex items-center justify-center shadow-md'>
                  <Scale size={26} className='text-white' />
                </div>
                <div>
                  <p className='font-bold text-[color:var(--text-primary)] text-base'>
                    Hello! I'm Sheria
                  </p>
                  <p className='text-xs text-[color:var(--text-muted)] mt-1 leading-relaxed'>
                    Your AI guide to Kenyan law &amp; Sheria Master firm. Ask me
                    anything — from your rights at work to how to register a
                    company.
                  </p>
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                role={msg.role}
                content={msg.content}
                isStreaming={false}
              />
            ))}

            {/* Typing indicator */}
            {loading && <TypingIndicator />}

            {/* Error */}
            {error && (
              <div className='mx-1 mb-3 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-800'>
                <p className='text-xs text-red-600 dark:text-red-400'>{error}</p>
                <button
                  type='button'
                  onClick={() => setError(null)}
                  className='mt-1 text-[10px] text-red-500 underline hover:no-underline'
                >
                  Dismiss
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions */}
          {showSuggestions && !hasMessages && (
            <div className='px-3 pb-2 shrink-0'>
              <p className='text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)] mb-1.5 px-1'>
                Suggested questions
              </p>
              <div className='flex flex-col gap-1.5'>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    type='button'
                    onClick={() => sendMessage(q)}
                    disabled={loading}
                    className='
                      text-left text-xs px-3 py-2 rounded-xl
                      border border-[color:var(--border)]
                      bg-[color:var(--surface-raised)]
                      text-[color:var(--text-primary)]
                      hover:border-[color:var(--brand-accent)]
                      hover:bg-[color:var(--surface)]
                      transition-all duration-150
                      disabled:opacity-50
                    '
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer (only after first assistant message) */}
          {messages.some((m) => m.role === 'assistant') && (
            <div className='px-3 py-1.5 shrink-0'>
              <p className='text-[10px] text-[color:var(--text-muted)] text-center leading-snug'>
                ⚖️ General information only — not formal legal advice.{' '}
                <button
                  type='button'
                  onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                  className='underline hover:no-underline'
                >
                  Consult an advocate
                </button>
              </p>
            </div>
          )}

          {/* Input */}
          <div className='px-3 pb-3 pt-2 border-t border-[color:var(--border)] shrink-0'>
            <div className='flex items-end gap-2'>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Ask your legal question…'
                rows={1}
                disabled={loading}
                className='
                  flex-1 resize-none
                  px-3 py-2.5
                  rounded-xl
                  bg-[color:var(--surface-raised)]
                  border border-[color:var(--border)]
                  text-[color:var(--text-primary)]
                  placeholder:text-[color:var(--text-muted)]
                  text-sm
                  focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]
                  transition
                  disabled:opacity-60
                  max-h-28
                  overflow-y-auto
                  leading-relaxed
                '
                style={{ minHeight: '40px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px';
                }}
              />

              <button
                type='button'
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className='
                  w-10 h-10
                  rounded-xl
                  bg-[color:var(--brand-primary)]
                  text-white
                  flex items-center justify-center
                  hover:opacity-90
                  transition
                  disabled:opacity-40
                  shrink-0
                '
              >
                {loading
                  ? <Loader2 size={16} className='animate-spin' />
                  : <Send size={16} />
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Trigger Button ───────────────────────────────────── */}
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='
          relative overflow-hidden
          flex items-center gap-2.5
          px-5 py-3
          rounded-2xl
          font-bold text-sm
          text-slate-950
          border-2 border-emerald-900/60
          bg-gradient-to-r from-amber-300 via-emerald-300 to-sky-300
          dark:from-emerald-400 dark:via-teal-400 dark:to-blue-500
          dark:border-teal-200/80 dark:text-slate-950
          shadow-[0_8px_0_rgba(15,118,110,0.45),0_14px_42px_rgba(15,118,110,0.30)]
          dark:shadow-[0_8px_0_rgba(4,47,46,0.55),0_14px_48px_rgba(45,212,191,0.35)]
          hover:scale-[1.03]
          hover:shadow-[0_6px_0_rgba(15,118,110,0.45),0_18px_56px_rgba(37,99,235,0.40)]
          active:scale-[0.98] active:translate-y-1
          transition-all duration-200
          max-w-[calc(100vw-3rem)]
          before:absolute before:inset-0
          before:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.55),transparent)]
          before:-translate-x-full hover:before:translate-x-full
          before:transition-transform before:duration-700
        '
      >
        <Scale size={17} className='relative z-10 shrink-0' />
        <span className='relative z-10 whitespace-nowrap truncate'>
          {open ? 'Close Chat' : promptText}
        </span>
        {!open && (
          <ChevronDown size={14} className='relative z-10 shrink-0 opacity-70' />
        )}
      </button>
    </div>
  );
}

import { Check, Copy, Pencil, RefreshCw, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const buttonClass = 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text-muted-light transition hover:bg-black/5 hover:text-text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success disabled:cursor-not-allowed disabled:opacity-50 dark:text-text-muted-dark dark:hover:bg-white/10 dark:hover:text-text-primary-dark';

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Older browsers and non-secure pages: copy through a hidden field.
  const field = Object.assign(document.createElement('textarea'), { value: text });
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  document.execCommand('copy');
  field.remove();
}

/**
 * Copy, edit, share (and, for an answer, regenerate) for one chat message.
 * Sharing uses the device's share sheet where there is one; elsewhere the text
 * is copied so it can be pasted into any app.
 */
export default function ChatMessageActions({ subject, text, shareTitle, onEdit, onRegenerate, disabled = false, className = '' }) {
  const [notice, setNotice] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (message) => {
    setNotice(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(''), 2000);
  };

  const copy = async () => {
    try {
      await copyText(text);
      flash('Copied');
    } catch {
      flash('Could not copy');
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    try {
      await copyText(text);
      flash('Copied. Paste it to share');
    } catch {
      flash('Could not share');
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-0.5 ${className}`}>
      <button type='button' onClick={copy} className={buttonClass} aria-label={`Copy ${subject}`}>
        {notice === 'Copied' ? <Check size={14} aria-hidden='true' /> : <Copy size={14} aria-hidden='true' />} Copy
      </button>
      {onEdit && (
        <button type='button' onClick={onEdit} disabled={disabled} className={buttonClass} aria-label={`Edit ${subject}`}>
          <Pencil size={14} aria-hidden='true' /> Edit
        </button>
      )}
      <button type='button' onClick={share} className={buttonClass} aria-label={`Share ${subject}`}>
        <Share2 size={14} aria-hidden='true' /> Share
      </button>
      {onRegenerate && (
        <button type='button' onClick={onRegenerate} disabled={disabled} className={buttonClass} aria-label={`Regenerate ${subject}`}>
          <RefreshCw size={14} aria-hidden='true' /> Regenerate
        </button>
      )}
      <span aria-live='polite' className='px-1 text-xs text-success'>{notice}</span>
    </div>
  );
}

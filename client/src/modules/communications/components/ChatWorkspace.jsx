import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, Forward, MessageCircle, Send, Users } from 'lucide-react';

import useAuth from '@/core/hooks/useAuth';
import { formatDateTime } from '@/core/utils/dateFormatter';

import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';

const threadTypeLabel = {
  DIRECT_STAFF: 'Direct staff chat',
  CASE_CLIENT: 'Case communication',
};

const getThreadTitle = (thread) => {
  if (!thread) return 'Select a conversation';
  return thread.subject || thread.case?.title || 'Untitled thread';
};

const getThreadSubtitle = (thread) => {
  if (!thread) return '';
  if (thread.case) {
    return `${thread.case.case_number || 'Case'} • ${thread.case.client?.full_name || 'Client'}`;
  }
  return thread.participants
    ?.map(
      (participant) => participant.user?.display_name || participant.user?.full_name || participant.user?.email,
    )
    .filter(Boolean)
    .join(', ');
};

const MessageStatusTicks = ({ status }) => {
  if (status === 'read') {
    return (
      <span title='Read' className='inline-flex text-sky-300'>
        <CheckCheck size={16} strokeWidth={2.4} />
      </span>
    );
  }

  if (status === 'delivered') {
    return (
      <span title='Delivered' className='inline-flex opacity-80'>
        <CheckCheck size={16} strokeWidth={2.4} />
      </span>
    );
  }

  return (
    <span title='Sent' className='inline-flex opacity-80'>
      <Check size={16} strokeWidth={2.4} />
    </span>
  );
};

export default function ChatWorkspace({
  title = 'Communication',
  subtitle = 'Secure case and staff communication',
  threads = [],
  selectedThreadId,
  onSelectThread,
  messages = [],
  onSendMessage,
  isLoadingThreads = false,
  isLoadingMessages = false,
  isSending = false,
  onRefresh,
  emptyThreadMessage = 'No conversations found.',
  readOnlyMessage = 'You can read this conversation but cannot reply.',
  sidebarExtra = null,
  getMessageActions = null,
  hideSingleThreadSidebarOnMobile = false,
}) {
  const { user } = useAuth() || {};
  const [body, setBody] = useState('');
  const messagesEndRef = useRef(null);

  const selectedThread = useMemo(
    () =>
      threads.find(
        (thread) => String(thread.id) === String(selectedThreadId),
      ) || null,
    [selectedThreadId, threads],
  );

  const canReply = selectedThread?.can_reply !== false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedThreadId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || !selectedThread || !canReply || isSending) return;

    await onSendMessage(trimmed);
    setBody('');
  };

  const handleComposerKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();

    if (!body.trim() || !selectedThread || !canReply || isSending) return;
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900 dark:text-white'>
            {title}
          </h1>
          <p className='text-sm text-slate-500 dark:text-slate-300'>
            {subtitle}
          </p>
        </div>

        {onRefresh && (
          <Button3D variant='outlineLight' onClick={onRefresh}>
            Refresh
          </Button3D>
        )}
      </div>

      <div className='grid min-h-[620px] gap-4 lg:grid-cols-[360px_1fr]'>
        <Card
          className={`min-h-[360px] flex-col overflow-hidden ${
            hideSingleThreadSidebarOnMobile && threads.length <= 1
              ? 'hidden lg:flex'
              : 'flex'
          }`}
        >
          <div className='border-b border-border-light p-4 dark:border-border-dark'>
            <div className='flex items-center gap-2 font-semibold'>
              <Users size={18} />
              Conversations
            </div>
            {sidebarExtra}
          </div>

          <div className='flex-1 overflow-y-auto'>
            {isLoadingThreads && (
              <p className='p-4 text-sm text-slate-500 dark:text-slate-300'>
                Loading conversations...
              </p>
            )}

            {!isLoadingThreads && !threads.length && (
              <p className='p-4 text-sm text-slate-500 dark:text-slate-300'>
                {emptyThreadMessage}
              </p>
            )}

            {!isLoadingThreads &&
              threads.map((thread) => {
                const isActive = String(thread.id) === String(selectedThreadId);
                const unread = thread.unread_count || 0;

                return (
                  <button
                    key={thread.id}
                    type='button'
                    onClick={() => onSelectThread(thread)}
                    className={`w-full border-b border-border-light px-4 py-4 text-left transition dark:border-border-dark ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='truncate font-semibold text-slate-900 dark:text-white'>
                          {getThreadTitle(thread)}
                        </p>
                        <p className='mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-300'>
                          {getThreadSubtitle(thread)}
                        </p>
                      </div>

                      {unread > 0 && (
                        <span className='rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white'>
                          {unread}
                        </span>
                      )}
                    </div>

                    <div className='mt-3 flex items-center justify-between text-xs text-slate-400'>
                      <span>
                        {threadTypeLabel[thread.thread_type] ||
                          thread.thread_type}
                      </span>
                      <span>
                        {thread.last_message_at
                          ? formatDateTime(thread.last_message_at)
                          : ''}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </Card>

        <Card className='flex min-h-[620px] flex-col overflow-hidden'>
          {!selectedThread ? (
            <div className='flex flex-1 flex-col items-center justify-center p-6 text-center text-slate-500 dark:text-slate-300'>
              <MessageCircle size={48} className='mb-3 opacity-50' />
              <p className='font-semibold'>Select a conversation</p>
              <p className='text-sm'>
                Choose a thread from the left to read or reply.
              </p>
            </div>
          ) : (
            <>
              <div className='border-b border-border-light p-4 dark:border-border-dark'>
                <div className='flex flex-col gap-2 md:flex-row md:items-start md:justify-between'>
                  <div>
                    <h2 className='text-lg font-bold text-slate-900 dark:text-white'>
                      {getThreadTitle(selectedThread)}
                    </h2>
                    <p className='text-sm text-slate-500 dark:text-slate-300'>
                      {getThreadSubtitle(selectedThread)}
                    </p>
                  </div>

                  <span className='w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                    {threadTypeLabel[selectedThread.thread_type] ||
                      selectedThread.thread_type}
                  </span>
                </div>
              </div>

              <div className='flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950/40'>
                {isLoadingMessages && (
                  <p className='text-sm text-slate-500 dark:text-slate-300'>
                    Loading messages...
                  </p>
                )}

                {!isLoadingMessages && !messages.length && (
                  <p className='rounded-xl bg-white p-4 text-sm text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300'>
                    No messages yet.
                  </p>
                )}

                {!isLoadingMessages &&
                  messages.map((message) => {
                    const isMine =
                      String(message.sender?.id) === String(user?.id);
                    const actions =
                      getMessageActions?.(message, selectedThread) || [];

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${
                            isMine
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100'
                          }`}
                        >
                          <div className='mb-1 flex flex-wrap items-center gap-2 text-xs opacity-80'>
                            <span className='font-semibold'>
                              {message.sender?.display_name ||
                                message.sender?.full_name ||
                                message.sender?.email ||
                                'System'}
                            </span>
                            <span>•</span>
                            <span>{formatDateTime(message.created_at)}</span>
                            {(message.is_forwarded || message.has_been_forwarded) && (
                              <>
                                <span>•</span>
                                <span
                                  className='inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                  title={
                                    message.has_been_forwarded && message.forwarded_at
                                      ? `Forwarded at ${formatDateTime(message.forwarded_at)}`
                                      : undefined
                                  }
                                >
                                  <Forward size={12} />
                                  {message.has_been_forwarded
                                    ? 'Already forwarded'
                                    : 'Forwarded'}
                                </span>
                              </>
                            )}
                          </div>
                          <p className='whitespace-pre-wrap text-sm leading-relaxed'>
                            {message.body}
                          </p>
                          {isMine && (
                            <div className='mt-1 flex items-center justify-end gap-1 text-xs opacity-90'>
                              {message.recipient_count > 1 && (
                                <span>
                                  {message.read_count || 0}/{message.recipient_count} read
                                </span>
                              )}
                              <MessageStatusTicks
                                status={message.delivery_status || 'sent'}
                              />
                            </div>
                          )}
                          {actions.length > 0 && (
                            <div className='mt-3 flex flex-wrap gap-2'>
                              {actions.map((action) => (
                                <button
                                  key={action.key || action.label}
                                  type='button'
                                  onClick={action.onClick}
                                  disabled={action.disabled}
                                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                    isMine
                                      ? 'border-white/40 bg-white/10 text-white hover:bg-white/20'
                                      : 'border-border-light bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-border-dark dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                                  }`}
                                  title={action.title || action.label}
                                >
                                  {action.icon || <Forward size={13} />}
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSubmit}
                className='border-t border-border-light p-4 dark:border-border-dark'
              >
                {!canReply && (
                  <div className='mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'>
                    {readOnlyMessage}
                  </div>
                )}

                <div className='flex flex-col gap-3 md:flex-row'>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    disabled={!canReply || isSending}
                    rows={2}
                    placeholder={
                      canReply
                        ? 'Type your message...'
                        : 'Replies are disabled for this thread'
                    }
                    autoComplete='on'
                    autoCorrect='on'
                    autoCapitalize='sentences'
                    spellCheck
                    className='min-h-[52px] flex-1 resize-none rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-slate-900 dark:text-white'
                  />

                  <Button3D
                    type='submit'
                    disabled={!canReply || isSending || !body.trim()}
                    className='min-w-[130px]'
                  >
                    <Send size={16} />
                    {isSending ? 'Sending...' : 'Send'}
                  </Button3D>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

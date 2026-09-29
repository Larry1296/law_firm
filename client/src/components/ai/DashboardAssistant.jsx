import { useEffect, useState } from 'react';

import FloatingAIChat from './FloatingAIChat';
import { askDashboardAssistant, getDashboardAssistant } from './knowledgeBaseService';

const COPY = {
  client: {
    launcher: 'Ask about my matters',
    placeholder: 'Ask about your matters or next court date…',
    footnote: 'Answers come from what the firm has shared with you. Your advocate has the final word.',
  },
  advocate: {
    launcher: 'Ask your assistant',
    placeholder: 'Ask about your matters, sittings or deadlines…',
    footnote: 'AI drafts from your matter records. Verify facts and authorities against the file.',
  },
  firm: {
    launcher: 'Ask your firm assistant',
    placeholder: 'Ask about the firm’s matters, workload or deadlines…',
    footnote: 'AI drafts from your firm’s records. Verify before acting.',
  },
  platform: {
    launcher: 'Ask the platform assistant',
    placeholder: 'Ask about platform figures or how to do a task…',
    footnote: 'Platform-wide figures only. Open a firm from Law firms for its details.',
  },
};

/**
 * The assistant for a signed-in dashboard. It appears only when the server says
 * this user may use it (for advocates, that needs the Use AI Tools permission).
 */
export default function DashboardAssistant({ kind }) {
  const [profile, setProfile] = useState(null);
  const copy = COPY[kind];

  useEffect(() => {
    const controller = new AbortController();
    getDashboardAssistant(kind, controller.signal)
      .then(setProfile)
      .catch(() => setProfile(null));
    return () => controller.abort();
  }, [kind]);

  if (!copy || !profile?.available) return null;

  return (
    <FloatingAIChat
      mode='dashboard'
      title={profile.title}
      subtitle={profile.subtitle}
      welcome={profile.welcome}
      suggestions={profile.suggestions}
      launcherLabel={copy.launcher}
      placeholder={copy.placeholder}
      footnote={copy.footnote}
      loadingLabel='Checking your records…'
      ask={(question, history, _section, signal) => askDashboardAssistant(kind, question, history, signal)}
    />
  );
}

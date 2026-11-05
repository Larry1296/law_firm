import { useEffect, useRef } from 'react';

import { DATA_CHANGED_EVENT, LIVE_REFRESH_MS } from '@/core/live/liveData';

// For data loaded outside the query cache: reload after any saved change, on return to the tab,
// and on the same interval as cached queries while the tab is visible.
export default function useLiveRefresh(reload, { enabled = true } = {}) {
  const latest = useRef(reload);
  useEffect(() => { latest.current = reload; }, [reload]);

  useEffect(() => {
    if (!enabled) return undefined;
    const run = () => latest.current?.();
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') run(); }, LIVE_REFRESH_MS);
    window.addEventListener(DATA_CHANGED_EVENT, run);
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(DATA_CHANGED_EVENT, run);
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);
}

import { useState } from 'react';

import { getApiErrorMessage } from '@/core/utils/errorMessages';
import courtroomService from '@/modules/courtroom/services/courtroomService';

// Opens the court provider through a one-time launch grant so the join is
// scope-checked, allowlisted and recorded in the attendance log.
export default function useCourtroomLaunch(sessionId) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');

  const launch = async () => {
    setBusy(true);
    setError('');
    setFallbackUrl('');
    // Open the tab while still inside the click so browsers don't block it as a popup.
    // 'noopener' would make window.open return null, so the opener is cleared by hand instead.
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    try {
      const grant = await courtroomService.requestLaunch(sessionId);
      const response = await courtroomService.openLaunch(grant.launch_token);
      if (popup) popup.location.replace(response.open_url);
      else setFallbackUrl(response.open_url);
    } catch (launchError) {
      popup?.close();
      setError(getApiErrorMessage(launchError, 'The courtroom could not be opened.'));
    } finally {
      setBusy(false);
    }
  };

  return { launch, busy, error, fallbackUrl };
}

import { useState } from 'react';
import { ExternalLink, Headphones, ShieldCheck, Video } from 'lucide-react';
import courtroomService from '@/modules/courtroom/services/courtroomService';

const instructions = {
  MICROSOFT_TEAMS: 'On desktop, choose “Continue on this browser” where offered. On mobile, the Teams app may be required.',
  GOOGLE_MEET: 'Use a supported browser on desktop. Mobile devices may hand off to the Google Meet app.',
  ZOOM: 'Use browser joining where the court enables it; otherwise continue in the installed Zoom application.',
  WEBEX: 'Continue in the supported browser or official Webex application.',
};

export default function CourtroomLauncher({ session, client = false }) {
  const [testing, setTesting] = useState(false);
  const [busy, setBusy] = useState(false);
  const event = session.event_summary || {};

  const launch = async () => {
    setBusy(true);
    try {
      const grant = await courtroomService.requestLaunch(session.id);
      const popup = window.open('', '_blank', 'noopener,noreferrer');
      const response = await courtroomService.openLaunch(grant.launch_token);
      if (popup) popup.location = response.open_url;
      else window.open(response.open_url, '_blank', 'noopener,noreferrer');
    } finally { setBusy(false); }
  };

  return (
    <section className='rounded-xl border border-border-light p-5 dark:border-border-dark' aria-label='Court readiness room'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div><p className='text-xs font-bold uppercase text-brand-primary'>Court readiness room</p><h3 className='mt-1 text-lg font-bold'>{event.internal_matter_number} · {event.official_court_case_number || 'Official number not recorded'}</h3><p className='text-sm'>{event.matter_title}</p></div>
        <span className='rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800'>{session.status?.replaceAll('_', ' ')}</span>
      </div>
      <div className='mt-4 grid gap-2 text-sm md:grid-cols-2'><p><strong>Court:</strong> {event.court_station || event.court || 'Not recorded'}</p><p><strong>Judicial officer:</strong> {event.judicial_officer || 'Not recorded'}</p><p><strong>Appearance:</strong> {event.appearance_type}</p><p><strong>Commencement:</strong> {event.starts_at ? new Date(event.starts_at).toLocaleString() : 'Not recorded'}</p></div>
      <div className='mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950'><p>Use your proper court display name, join muted, remain in an appropriate environment, and observe courtroom decorum.</p><p className='mt-1 font-semibold'>Recording is prohibited unless the Court grants leave.</p></div>
      <p className='mt-3 text-sm'>{instructions[session.provider_type] || 'Sheria Master will open the authorised official provider in a separate tab or application.'}</p>
      {testing && <div className='mt-3 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800'>Check your internet connection, speakers, microphone and camera using your device settings. Permissions are requested only by the provider when you proceed.</div>}
      <div className='mt-4 flex flex-wrap gap-2'><button type='button' onClick={() => setTesting((v) => !v)} className='inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold'><Headphones size={16}/>Readiness check</button><button type='button' onClick={launch} disabled={busy} className='inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50'><ExternalLink size={16}/>{busy ? 'Preparing…' : client ? 'Join Virtual Court' : 'Open Courtroom'}</button><button type='button' onClick={() => courtroomService.attendanceAction(session.id, { action: 'TECHNICAL_DIFFICULTY' })} className='inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700'><ShieldCheck size={16}/>Report technical problem</button></div>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { tutorials } from './api';
let sdk;
function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!sdk) sdk = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = setTimeout(() => {
      sdk = null;
      reject(new Error('Video player timed out. Please retry.'));
    }, 20000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      clearTimeout(timeout);
      sdk = null;
      reject(new Error('Unable to load YouTube. Check your connection.'));
    };
    document.head.appendChild(script);
  });
  return sdk;
}
export default function VideoPlayer({
  tutorial,
  seek,
  onPosition,
  trackProgress = true
}) {
  const host = useRef(null),
    player = useRef(null),
    html = useRef(null),
    resetActivity = useRef(null),
    callbacks = useRef({
      onPosition
    });
  const [enabled, setEnabled] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    callbacks.current = {
      onPosition
    };
  }, [onPosition]);
  useEffect(() => {
    if (!ready || !seek) return;
    resetActivity.current?.();
    const target = Math.min(seek.time, tutorial.duration || seek.time);
    if (tutorial.provider === 'youtube') player.current?.seekTo(target, true);
    else if (html.current) html.current.currentTime = target;
  }, [seek, ready, tutorial.provider, tutorial.duration]);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false,
      timer,
      last = null,
      ranges = [],
      lastSave = Date.now(),
      position = 0,
      lastSentPosition = null;
    const flush = () => {
      if (!trackProgress || !last && !ranges.length && !position) return;
      if (!ranges.length && Math.floor(position) === lastSentPosition) return;
      lastSentPosition = Math.floor(position);
      const batch = ranges;
      ranges = [];
      lastSave = Date.now();
      tutorials.progress(tutorial.id, {
        position: Math.floor(position),
        ranges: batch
      }).catch(() => {
        if (!cancelled) setError('Playback progress could not be saved.');
      });
    };
    resetActivity.current = () => { last = null; };
    const tick = (settle = false) => {
      const p = player.current,
        v = html.current;
      const current = tutorial.provider === 'youtube' ? p?.getCurrentTime?.() : v?.currentTime;
      if (!Number.isFinite(current)) return;
      position = current;
      const playing = tutorial.provider === 'youtube' ? p?.getPlayerState?.() === 1 : v && !v.paused && !v.seeking;
      const now = Date.now();
      if ((playing || settle) && last && current > last.position && current - last.position <= (now - last.time) / 1000 * 2.1 + .5) {
        const a = Math.floor(last.position),
          b = Math.floor(current);
        if (b > a && b - a <= 30) ranges.push([a, b]);
      }
      last = playing ? {
        position: current,
        time: now
      } : null;
      callbacks.current.onPosition?.(current);
      if (now - lastSave >= 15000) flush();
    };
    const initialize = async () => {
      try {
        if (tutorial.provider === 'youtube') {
          const YT = await loadYouTube();
          if (cancelled) return;
          const mount = document.createElement('div');
          host.current.appendChild(mount);
          player.current = new YT.Player(mount, {
            width: '100%',
            height: '100%',
            videoId: tutorial.video_reference,
            host: 'https://www.youtube-nocookie.com',
            playerVars: {
              playsinline: 1,
              origin: window.location.origin,
              autoplay: 0
            },
            events: {
              onReady: () => {
                if (cancelled) return;
                const frame = player.current.getIframe();
                frame.title = tutorial.title;
                frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen');
                frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                setReady(true);
              },
              onError: () => setError('Video unavailable. Check that embedding is allowed, or contact support.'),
              onStateChange: e => {
                if (e.data === 1) tick();
                if (e.data === 2 || e.data === 0) {
                  tick(true);
                  flush();
                }
              }
            }
          });
        }
        timer = setInterval(tick, 1000);
      } catch (e) { if (e?.isActionCancelled) return;
        setError(e.message);
      }
    };
    initialize();
    const visibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', visibility);
    const pause = () => { tick(true); flush(); };
    const play = () => tick();
    const seeking = () => { last = null; };
    html.current?.addEventListener('pause', pause);
    html.current?.addEventListener('ended', pause);
    html.current?.addEventListener('play', play);
    html.current?.addEventListener('seeking', seeking);
    html.current?.addEventListener('seeked', play);
    const video = html.current;
    return () => {
      tick(true);
      flush();
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      video?.removeEventListener('pause', pause);
      video?.removeEventListener('ended', pause);
      video?.removeEventListener('play', play);
      video?.removeEventListener('seeking', seeking);
      video?.removeEventListener('seeked', play);
      resetActivity.current = null;
      player.current?.destroy?.();
      player.current = null;
    };
  }, [enabled, tutorial.id, tutorial.provider, tutorial.video_reference, tutorial.title, trackProgress]);
  return <div>
    {!enabled ? <button className='w-full min-h-52 rounded-xl bg-black text-white p-8' onClick={() => setEnabled(true)}>Load video: {tutorial.title}</button> : <div className='aspect-video min-h-[200px] bg-black rounded-xl overflow-hidden'>
      {tutorial.provider === 'youtube' ? <div className='h-full w-full' ref={host} /> : <video ref={html} className='h-full w-full' controls playsInline preload='metadata' onLoadedMetadata={() => setReady(true)} src={tutorial.video_reference} onError={() => setError('Unable to play this video.')} />}
    </div>}
    {enabled && !ready && !error && <p role='status'>Loading player…</p>}
    {error && <p role='alert' className='text-red-600 dark:text-red-400'>{error}</p>}
    {enabled && tutorial.provider === 'html5' && <label>Playback speed <select defaultValue='1' onChange={e => {
        html.current.playbackRate = Number(e.target.value);
      }}>{[.5, 1, 1.25, 1.5, 2].map(n => <option key={n} value={n}>{n}×</option>)}</select>
</label>}
  </div>;
}

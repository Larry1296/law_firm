import { ExternalLink, Video } from 'lucide-react';

const directVideoPattern = /\.(mp4|webm|ogg)(\?.*)?$/i;

function getYouTubeId(url) {
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0];
  if (host.endsWith('youtube.com')) {
    if (url.pathname.startsWith('/watch')) return url.searchParams.get('v');
    if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2];
    if (url.pathname.startsWith('/live/')) return url.pathname.split('/')[2];
    if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2];
  }
  return null;
}

function getEmbedSource(rawUrl) {
  if (!rawUrl) return { type: 'empty' };

  try {
    const url = new URL(rawUrl);
    const youtubeId = getYouTubeId(url);
    if (youtubeId) {
      return {
        type: 'iframe',
        src: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      };
    }

    if (url.hostname.replace(/^www\./, '').endsWith('vimeo.com')) {
      const videoId = url.pathname.split('/').filter(Boolean).pop();
      if (videoId) {
        return {
          type: 'iframe',
          src: `https://player.vimeo.com/video/${videoId}`,
        };
      }
    }

    if (directVideoPattern.test(url.pathname)) {
      return { type: 'video', src: rawUrl };
    }

    return { type: 'iframe', src: rawUrl };
  } catch {
    return { type: 'invalid' };
  }
}

export default function CourtroomVideoPlayer({
  url,
  title = 'Courtroom session',
  status,
  providerName,
}) {
  const source = getEmbedSource(url);

  return (
    <div className='overflow-hidden rounded-xl border border-border-light bg-slate-950 dark:border-border-dark'>
      <div className='flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white'>
        <div className='flex min-w-0 items-center gap-3'>
          <Video size={18} className='shrink-0 text-blue-300' />
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold'>{title}</p>
            <p className='truncate text-xs text-white/60'>
              {providerName || 'Courtroom'} {status ? `· ${status}` : ''}
            </p>
          </div>
        </div>
        {url && (
          <a
            href={url}
            target='_blank'
            rel='noreferrer'
            className='inline-flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15'
          >
            <ExternalLink size={14} />
            Open
          </a>
        )}
      </div>

      <div className='aspect-video w-full bg-black'>
        {source.type === 'video' && (
          <video src={source.src} controls className='h-full w-full' title={title} />
        )}

        {source.type === 'iframe' && (
          <iframe
            src={source.src}
            title={title}
            className='h-full w-full'
            allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
            allowFullScreen
          />
        )}

        {(source.type === 'empty' || source.type === 'invalid') && (
          <div className='flex h-full items-center justify-center px-6 text-center text-sm text-white/70'>
            No playable courtroom link has been added.
          </div>
        )}
      </div>
    </div>
  );
}

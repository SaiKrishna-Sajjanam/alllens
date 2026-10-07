import { formatTime } from '@/lib/i18n';
import { lightPicture } from '@/lib/pictures';
import { textLanguage } from '@/lib/script';
import type { Video } from '@/lib/data';
import type { Lang } from '@/lib/types';
import RemoteImage from './RemoteImage';

/** One video from an official YouTube channel, as the channel titled it; it opens on YouTube. */
export default function VideoCard({ video, lang }: { video: Video; lang: Lang }) {
  const picture = lightPicture(video.image_url);
  return (
    <a className="video-card" href={video.url} target="_blank" rel="noopener noreferrer">
      <span className="video-thumb">
        {picture && <RemoteImage src={picture} />}
        <span className="play" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </span>
      <span className="video-title" lang={textLanguage(video.title, video.language) ?? undefined}>{video.title}</span>
      <span className="small muted">{video.source} · YouTube{video.published_at ? ` · ${formatTime(video.published_at, lang)}` : ''}</span>
    </a>
  );
}

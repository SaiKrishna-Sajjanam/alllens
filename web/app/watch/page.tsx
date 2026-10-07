import Link from 'next/link';
import VideoCard from '@/components/VideoCard';
import { getVideos, getViewer } from '@/lib/data';
import { DEFAULT_TAB, normaliseTab, tabsFor } from '@/lib/feed';
import { t } from '@/lib/i18n';

export const metadata = { title: 'Watch' };

type Search = Promise<{ [key: string]: string | string[] | undefined }>;
const PER_PAGE = 24;

/** The newest videos from the official YouTube channels we follow, newest first, in the same three
 *  areas as the feed. Each opens on YouTube; "All versions" opens the story the video belongs to. */
export default async function WatchPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const { prefs } = viewer;
  const lang = prefs.uiLanguage;
  const tab = normaliseTab(typeof sp.tab === 'string' ? sp.tab : undefined);
  const page = Math.min(Math.max(Number.parseInt(typeof sp.page === 'string' ? sp.page : '0', 10) || 0, 0), 10);
  const videos = await getVideos({ tab, prefs, limit: (page + 1) * PER_PAGE + 1 });
  const shown = videos.slice(0, (page + 1) * PER_PAGE);
  const href = (over: { tab?: string; page?: number }) => {
    const q = new URLSearchParams();
    const tb = over.tab ?? tab;
    if (tb !== DEFAULT_TAB) q.set('tab', tb);
    if (over.page) q.set('page', String(over.page));
    const s = q.toString();
    return s ? `/watch?${s}` : '/watch';
  };
  const tabs = tabsFor(prefs, lang, { international: t(lang, 'feed.tabInternational'), national: t(lang, 'feed.tabNational'), state: t(lang, 'prefs.places') });
  return (
    <div className="stack-lg">
      <div className="stack">
        <h1>{t(lang, 'watch.title')}</h1>
        <p className="muted">{t(lang, 'watch.intro')}</p>
        <nav className="segmented" aria-label={t(lang, 'feed.tabsLabel')}>
          {tabs.map((x) => (
            <Link key={x.id} href={href({ tab: x.id })} aria-current={x.id === tab ? 'true' : undefined}>{x.label}</Link>
          ))}
        </nav>
      </div>
      {shown.length === 0 ? (
        <p className="panel">{tab === 'state' && !prefs.state ? t(lang, 'feed.chooseState') : t(lang, 'watch.empty')}</p>
      ) : (
        <div className="video-grid">
          {shown.map((v) => (
            <div key={v.id} className="stack" style={{ gap: 4 }}>
              <VideoCard video={v} lang={lang} />
              {v.story_id && <Link className="small" href={`/story/${v.story_id}`}>{t(lang, 'watch.versions')}</Link>}
            </div>
          ))}
        </div>
      )}
      {videos.length > shown.length && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-secondary" href={href({ page: page + 1 })} scroll={false}>{t(lang, 'feed.more')}</Link>
        </div>
      )}
    </div>
  );
}

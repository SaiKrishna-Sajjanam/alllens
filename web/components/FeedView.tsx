import Link from 'next/link';
import { DEFAULT_TAB, type Tab, type TabId } from '@/lib/feed';
import { formatTime, t } from '@/lib/i18n';
import type { FeedSort, Lang, Prefs, Story } from '@/lib/types';
import DistrictFilter from './DistrictFilter';
import StoryCard from './StoryCard';

interface Props {
  lang: Lang;
  prefs: Prefs;
  tabs: Tab[];
  tab: TabId;
  sort: FeedSort;
  showAllTopics: boolean;
  page: number;
  stories: Story[];
  hasMore: boolean;
  demo: boolean;
  lastVisit: string | null;
}

const SORTS: FeedSort[] = ['sources', 'latest', 'random'];

export default function FeedView(p: Props) {
  const { lang, prefs } = p;
  const href = (over: Partial<{ tab: TabId; sort: FeedSort; all: boolean; page: number }>) => {
    const q = new URLSearchParams();
    const tab = over.tab ?? p.tab;
    const sort = over.sort ?? p.sort;
    const all = over.all ?? p.showAllTopics;
    const page = over.page ?? 0;
    if (tab !== DEFAULT_TAB) q.set('tab', tab);
    if (sort !== prefs.feedSort) q.set('sort', sort);
    if (all) q.set('all', '1');
    if (page) q.set('page', String(page));
    const s = q.toString();
    return s ? `/feed?${s}` : '/feed';
  };
  const hasTopicChoice = prefs.topics.length > 0 || prefs.customTopics.length > 0;

  return (
    <div>
      <div className="feed-head">
        <div className="spread">
          <div className="stack" style={{ gap: 2 }}>
            <h1>{t(lang, 'feed.title')}</h1>
            <p className="small muted">
              {p.lastVisit ? t(lang, 'feed.since', { time: formatTime(p.lastVisit, lang) }) : t(lang, 'feed.firstVisit')}
            </p>
          </div>
          <Link className="btn btn-secondary btn-small" href="/settings">{t(lang, 'feed.edit')}</Link>
        </div>
        {p.demo && <p className="notice" role="note">{t(lang, 'feed.demo')}</p>}
        <nav className="segmented" aria-label={t(lang, 'feed.tabsLabel')}>
          {p.tabs.map((tab) => (
            <Link key={tab.id} href={href({ tab: tab.id })} aria-current={tab.id === p.tab ? 'true' : undefined}>
              {tab.label}
            </Link>
          ))}
        </nav>
        {p.tab === 'state' && <DistrictFilter prefs={prefs} lang={lang} />}
        <div className="spread">
          <div className="row" role="group" aria-label={t(lang, 'feed.order')}>
            <span className="small muted">{t(lang, 'feed.order')}:</span>
            {SORTS.map((s) => (
              <Link key={s} href={href({ sort: s })} className="chip soft" aria-pressed={s === p.sort ? 'true' : 'false'}
                style={{ minHeight: 36, fontSize: 13 }}>
                {t(lang, `sort.${s}` as const)}
              </Link>
            ))}
          </div>
          {hasTopicChoice && (
            <Link className="btn btn-quiet btn-small" href={href({ all: !p.showAllTopics })}>
              {p.showAllTopics ? t(lang, 'feed.onlyMyTopics') : t(lang, 'feed.showAllTopics')}
            </Link>
          )}
        </div>
        <p className="small muted">{t(lang, 'feed.orderNote')}</p>
      </div>

      {p.stories.length === 0 ? (
        <div className="panel stack">
          <p>{hasTopicChoice && !p.showAllTopics ? t(lang, 'feed.emptyTopics') : t(lang, 'feed.empty')}</p>
          {hasTopicChoice && !p.showAllTopics && (
            <Link className="btn btn-secondary" href={href({ all: true })}>{t(lang, 'feed.showAllTopics')}</Link>
          )}
        </div>
      ) : (
        <div className="feed-grid">
          {p.stories.map((s) => (
            <StoryCard key={s.id} story={s} lang={lang} readLanguages={prefs.languages} lastVisit={p.lastVisit} />
          ))}
        </div>
      )}
      {p.hasMore && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 20 }}>
          <Link className="btn btn-secondary" href={href({ page: p.page + 1 })} scroll={false}>{t(lang, 'feed.more')}</Link>
        </div>
      )}
    </div>
  );
}

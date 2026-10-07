import Link from 'next/link';
import { topicName } from '@/lib/catalog';
import { DEFAULT_TAB, labelLanguage, pickLabel, type Tab, type TabId } from '@/lib/feed';
import { formatTime, t } from '@/lib/i18n';
import type { FeedSort, Lang, Prefs, Story } from '@/lib/types';
import type { storyCardTexts } from '@/lib/headlines';
import { textLanguage } from '@/lib/script';
import ReadAloud, { type Spoken } from './ReadAloud';
import StatePicker from './StatePicker';
import StoryCard from './StoryCard';

interface Props {
  lang: Lang;
  prefs: Prefs;
  tabs: Tab[];
  tab: TabId;
  sort: FeedSort;
  topic: string | null;
  page: number;
  stories: Story[];
  /** Card headlines and opening lines in the app language (Google's translation where needed), by story id. */
  cards: Awaited<ReturnType<typeof storyCardTexts>>;
  hasMore: boolean;
  demo: boolean;
  lastVisit: string | null;
}

const SORTS: FeedSort[] = ['sources', 'latest', 'random'];

export default function FeedView(p: Props) {
  const { lang, prefs } = p;
  const href = (over: Partial<{ tab: TabId; sort: FeedSort; topic: string | null; page: number }>) => {
    const q = new URLSearchParams();
    const tab = over.tab ?? p.tab;
    const sort = over.sort ?? p.sort;
    const topic = over.topic !== undefined ? over.topic : p.topic;
    const page = over.page ?? 0;
    if (tab !== DEFAULT_TAB) q.set('tab', tab);
    if (sort !== prefs.feedSort) q.set('sort', sort);
    if (topic) q.set('topic', topic);
    if (page) q.set('page', String(page));
    const s = q.toString();
    return s ? `/feed?${s}` : '/feed';
  };

  // Read aloud in the order shown: each card's source, headline and opening lines, as on screen.
  const spoken: Spoken[] = p.stories.map((s) => {
    const label = pickLabel(s, lang);
    const sn = p.cards.snippets[s.id];
    const title = p.cards.titles[s.id];
    return {
      source: label.source_name,
      title: title ?? label.title,
      titleLang: title ? lang : textLanguage(label.title, labelLanguage(s, label)),
      snippet: sn ? sn.translated ?? sn.text : null,
      snippetLang: sn ? (sn.translated ? lang : textLanguage(sn.text, sn.language)) : null,
    };
  });

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
        {p.tab === 'state' && <StatePicker prefs={prefs} lang={lang} />}
        {/* Topic buttons for this visit only, in the reader's own order: the feed starts with all news,
            tapping a topic shows only that topic, tapping it again shows all news again. */}
        <div className="filter-row" role="group" aria-label={t(lang, 'prefs.topics')}>
          {prefs.topicOrder.map((id) => {
            const on = p.topic === id;
            return (
              <Link key={id} href={href({ topic: on ? null : id })} className="chip" aria-pressed={on ? 'true' : 'false'}
                title={on ? t(lang, 'feed.allTopics') : undefined}>
                {topicName(id, lang)}
                {on && <span aria-hidden="true">&nbsp;✕</span>}
              </Link>
            );
          })}
        </div>
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
        </div>
        <p className="small muted">{t(lang, 'feed.orderNote')}</p>
        <ReadAloud items={spoken} lang={lang} label="listen.all" />
      </div>

      {p.tab === 'state' && !prefs.state ? null : p.stories.length === 0 ? (
        <div className="panel stack">
          <p>{t(lang, 'feed.empty')}</p>
          {p.topic && <Link className="btn btn-secondary" href={href({ topic: null })}>{t(lang, 'feed.allTopics')}</Link>}
        </div>
      ) : (
        <div className="feed-grid">
          {p.stories.map((s) => (
            <StoryCard key={s.id} story={s} lang={lang} lastVisit={p.lastVisit} translated={p.cards.titles[s.id]}
              snippet={p.cards.snippets[s.id]} />
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

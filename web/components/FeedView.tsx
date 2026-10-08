import IntroBox from './IntroBox';
import Link from 'next/link';
import { topicName, isTopic } from '@/lib/catalog';
import type { Video } from '@/lib/data';
import { DEFAULT_SORT, DEFAULT_TAB, labelLanguage, pickLabel, type Tab, type TabId } from '@/lib/feed';
import { formatDay, formatTime, t } from '@/lib/i18n';
import { lightPicture } from '@/lib/pictures';
import type { FeedSort, Lang, Prefs, Story } from '@/lib/types';
import type { storyCardTexts } from '@/lib/headlines';
import { textLanguage } from '@/lib/script';
import { ClockIcon, TopicIcon, TrendIcon, WatchIcon } from './Icons';
import InstallCard from './InstallCard';
import QuickPanels, { type QuickPanel } from './QuickPanels';
import ReadAloud, { type Spoken } from './ReadAloud';
import StatePicker from './StatePicker';
import WeatherStrip from './WeatherStrip';
import type { Weather } from '@/lib/weatherData';
import StoryCard from './StoryCard';
import TopicBar from './TopicBar';
import VideoCard from './VideoCard';

interface Props {
  lang: Lang;
  prefs: Prefs;
  tabs: Tab[];
  tab: TabId;
  sort: FeedSort;
  /** The topic on screen (the reader's first topic unless they tapped another on this visit). */
  topic: string;
  page: number;
  stories: Story[];
  /** Most sources in the last 24 hours (all topics), and the newest stories: both mechanical. */
  mostCovered: Story[];
  justIn: Story[];
  videos: Video[];
  /** Headlines and opening lines in the app language (Google's translation where needed), by story id. */
  cards: Awaited<ReturnType<typeof storyCardTexts>>;
  hasMore: boolean;
  demo: boolean;
  lastVisit: string | null;
  /** When news was last collected. */
  lastRefresh: string | null;
  /** Morning, afternoon or evening in India. */
  /** Already in the reader's language, with their name when signed in. */
  greeting: string;
  /** State tab: the weather at the state's capital. */
  weather?: (Weather & { city: string }) | null;
}

const SORTS: FeedSort[] = ['sources', 'latest', 'random'];

export default function FeedView(p: Props) {
  const { lang, prefs } = p;
  const href = (over: Partial<{ tab: TabId; sort: FeedSort; topic: string; page: number }>) => {
    const q = new URLSearchParams();
    const tab = over.tab ?? p.tab;
    const sort = over.sort ?? p.sort;
    const topic = over.topic ?? p.topic;
    const page = over.page ?? 0;
    if (tab !== DEFAULT_TAB) q.set('tab', tab);
    if (sort !== DEFAULT_SORT) q.set('sort', sort);
    if (topic !== prefs.topicOrder[0]) q.set('topic', topic);
    if (page) q.set('page', String(page));
    const s = q.toString();
    return s ? `/feed?${s}` : '/feed';
  };

  // A story's headline as shown: the app-language headline, or Google's marked translation of it.
  const headline = (s: Story) => {
    const label = pickLabel(s, lang);
    const tr = p.cards.titles[s.id];
    return { text: tr ?? label.title, lang: tr ? lang : textLanguage(label.title, labelLanguage(s, label)) ?? undefined, label };
  };
  const firstTopic = (s: Story) => (s.topics ?? []).find((x) => isTopic(x));
  const sourcesBadge = (s: Story) => {
    const langs = (s.languages ?? []).length;
    return langs === 1 ? t(lang, 'home.sourcesLang1', { n: s.source_count }) : t(lang, 'home.sourcesLangs', { n: s.source_count, l: langs });
  };
  // Read aloud in the order shown: each card's source, headline and opening lines, as on screen.
  const spoken: Spoken[] = p.stories.map((s) => {
    const h = headline(s);
    const sn = p.cards.snippets[s.id];
    return {
      source: h.label.source_name,
      title: h.text,
      titleLang: h.lang,
      snippet: sn ? sn.translated ?? sn.text : null,
      snippetLang: sn ? (sn.translated ? lang : textLanguage(sn.text, sn.language)) : null,
    };
  });
  const noState = p.tab === 'state' && !prefs.state;

  // "Most covered", "just in" and videos: in the right-hand column on a laptop, and as buttons under the
  // tabs on phones and tablets (where that column would sit below the whole topic).
  const watchHref = p.tab === DEFAULT_TAB ? '/watch' : `/watch?tab=${p.tab}`;
  const coveredList = (
    <ol className="ranked">
      {p.mostCovered.map((s, i) => {
        const h = headline(s);
        const topic = firstTopic(s);
        const pic = i === 0 ? lightPicture(s.image_url) : null;
        return (
          <li key={s.id}>
            <Link href={`/story/${s.id}`}>
              <span className="rank" aria-hidden="true">{i + 1}</span>
              <span className="stack" style={{ gap: 4, minWidth: 0, flex: 1 }}>
                {pic && <span className="ranked-pic"><img src={pic} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /></span>}
                <span className="ranked-headline" lang={h.lang}>{h.text}</span>
                <span className="small muted">
                  {sourcesBadge(s)}
                  {topic ? ` · ${topicName(topic, lang)}` : ''}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
  const justInList = p.justIn.map((s) => {
    const h = headline(s);
    const pic = lightPicture(s.image_url);
    return (
      <Link key={s.id} href={`/story/${s.id}`} className="mini-story">
        <span className="mini-pic">{pic && <img src={pic} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />}</span>
        <span className="stack" style={{ gap: 2, minWidth: 0 }}>
          <span className="mini-headline" lang={h.lang}>{h.text}</span>
          <span className="small muted">
            {formatDay(s.first_published_at, lang)} · {h.label.source_name}
          </span>
        </span>
      </Link>
    );
  });
  const videoList = (
    <div className="side-videos">
      {p.videos.slice(0, 3).map((v) => <VideoCard key={v.id} video={v} lang={lang} />)}
    </div>
  );
  const showCovered = !noState && p.mostCovered.length > 0;
  const showJustIn = !noState && p.justIn.length > 0;
  const quick: QuickPanel[] = [
    ...(showCovered ? [{ id: 'covered', label: t(lang, 'home.mostCovered'), icon: <TrendIcon />,
      content: <><p className="small muted">{t(lang, 'home.mostCoveredNote')}</p>{coveredList}</> }] : []),
    ...(showJustIn ? [{ id: 'justin', label: t(lang, 'home.justIn'), icon: <ClockIcon />, content: <div className="just-in">{justInList}</div> }] : []),
    ...(p.videos.length ? [{ id: 'watch', label: t(lang, 'nav.watch'), icon: <WatchIcon size={16} />,
      content: <>{videoList}<Link className="small" href={watchHref}>{t(lang, 'home.seeAll')}</Link></> }] : []),
  ];

  return (
    <div className="home">
      <div className="feed-head">
        <div className="spread">
          <div className="stack" style={{ gap: 2 }}>
            <h1>{p.greeting}</h1>
            <p className="muted feed-tagline">{t(lang, 'feed.tagline')}</p>
          </div>
          <Link className="btn btn-secondary btn-small" href="/settings">{t(lang, 'feed.edit')}</Link>
        </div>
        <p className="small muted refresh-line">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          <span>
            {p.lastRefresh ? t(lang, 'feed.refreshed', { time: formatTime(p.lastRefresh, lang) }) : null}
            {p.lastRefresh ? ' · ' : null}
            {!p.lastVisit ? t(lang, 'feed.firstVisit')
              // Visited after the last collection: nothing has arrived since.
              : p.lastRefresh && Date.parse(p.lastVisit) >= Date.parse(p.lastRefresh) ? t(lang, 'feed.nothingNew')
              : t(lang, 'feed.since', { time: formatTime(p.lastVisit, lang) })}
          </span>
        </p>
        {p.demo && <p className="notice" role="note">{t(lang, 'feed.demo')}</p>}
        {!p.lastVisit && <IntroBox lang={lang} />}
        <nav className="segmented" aria-label={t(lang, 'feed.tabsLabel')}>
          {p.tabs.map((tab) => (
            <Link key={tab.id} href={href({ tab: tab.id })} aria-current={tab.id === p.tab ? 'true' : undefined}>
              {tab.label}
            </Link>
          ))}
        </nav>
        {p.tab === 'state' && <StatePicker prefs={prefs} lang={lang} />}
        {p.tab === 'state' && prefs.state && <WeatherStrip state={prefs.state} weather={p.weather ?? null} lang={lang} />}
        <QuickPanels panels={quick} label={t(lang, 'feed.tabsLabel')} />
        {/* One topic at a time, in the reader's own order; the feed opens on the first (owner's decision,
            2026-10-07: Politics unless the reader moved another topic to the front). */}
        <TopicBar prefs={prefs} lang={lang} topic={p.topic}
          hrefs={Object.fromEntries(prefs.topicOrder.map((id) => [id, href({ topic: id })]))} />
      </div>

      {/* The chosen topic is the page (about 70% on a laptop); "most covered", "just in" and videos sit
          in a narrow column beside it, or below it on phones and tablets. */}
      <div className="home-grid">
        <section className="topic-section" aria-labelledby="topic-title">
          <div className="topic-banner">
            <span className="topic-banner-icon" aria-hidden="true"><TopicIcon id={p.topic} size={24} /></span>
            <h2 id="topic-title">{topicName(p.topic, lang)}</h2>
            <span className="topic-banner-tab small muted">{p.tabs.find((x) => x.id === p.tab)?.label}</span>
          </div>
          <div className="topic-head">
            <div className="row order-row" role="group" aria-label={t(lang, 'feed.order')}>
              <span className="small muted">{t(lang, 'feed.order')}:</span>
              {SORTS.map((s) => (
                <Link key={s} href={href({ sort: s })} className="chip soft order-chip" aria-pressed={s === p.sort ? 'true' : 'false'}>
                  {t(lang, `sort.${s}` as const)}
                </Link>
              ))}
            </div>
            <ReadAloud items={spoken} lang={lang} label="listen.all" />
          </div>
          {noState ? null : p.stories.length === 0 ? (
            <div className="panel stack">
              <p>{t(lang, 'feed.empty')}</p>
            </div>
          ) : (
            <div className="feed-grid">
              {p.stories.map((s) => (
                <StoryCard key={s.id} story={s} lang={lang} translated={p.cards.titles[s.id]} viewTopic={p.topic}
                  snippet={p.cards.snippets[s.id]} kind={p.cards.kinds[s.id]} />
              ))}
            </div>
          )}
          <p className="small muted">{t(lang, 'feed.orderNote')}</p>
          {p.hasMore && (
            <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
              <Link className="btn btn-secondary" href={href({ page: p.page + 1 })} scroll={false}>{t(lang, 'feed.more')}</Link>
            </div>
          )}
        </section>

        <aside className="home-side">
          {showCovered && (
            <section className="side-card side-list" aria-labelledby="most-covered">
              <h2 id="most-covered">{t(lang, 'home.mostCovered')}</h2>
              <p className="small muted">{t(lang, 'home.mostCoveredNote')}</p>
              {coveredList}
            </section>
          )}
          {showJustIn && (
            <section className="side-card side-list just-in" aria-labelledby="just-in">
              <h2 id="just-in">{t(lang, 'home.justIn')}</h2>
              {justInList}
            </section>
          )}
          {p.videos.length > 0 && (
            <section className="side-card side-list" aria-labelledby="watch-title">
              <div className="spread">
                <h2 id="watch-title">{t(lang, 'home.watch')}</h2>
                <Link className="small" href={watchHref}>{t(lang, 'home.seeAll')}</Link>
              </div>
              {videoList}
            </section>
          )}
          <InstallCard labels={{ title: t(lang, 'install.title'), body: t(lang, 'install.body'), button: t(lang, 'install.button'), ios: t(lang, 'install.ios') }} />
        </aside>
      </div>
    </div>
  );
}

import FeedView from '@/components/FeedView';
import { redirect } from 'next/navigation';
import MarkVisited from '@/components/MarkVisited';
import { amIRestricted } from '@/lib/admin';
import { getFeed, getHighlights, getLastRefresh, getVideos, getViewer } from '@/lib/data';
import { greetingKey } from '@/lib/displayName';
import { DEFAULT_SORT, normaliseTab, normaliseTopic, tabsFor } from '@/lib/feed';
import { storyCardTexts } from '@/lib/headlines';
import { t } from '@/lib/i18n';
import type { FeedSort } from '@/lib/types';

export const metadata = { title: 'Your news' };

type Search = Promise<{ [key: string]: string | string[] | undefined }>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function FeedPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  // Signed in before names were asked: ask once (not a restricted account, which cannot save it).
  if (viewer.user?.needsName && !(await amIRestricted())) redirect('/name?next=/feed');
  const { prefs } = viewer;
  const lang = prefs.uiLanguage;
  const tab = normaliseTab(one(sp.tab));
  const sortParam = one(sp.sort);
  const sort: FeedSort = sortParam === 'latest' || sortParam === 'random' || sortParam === 'sources' ? sortParam : DEFAULT_SORT;
  const page = Math.min(Math.max(Number.parseInt(one(sp.page) ?? '0', 10) || 0, 0), 20);
  // The feed shows one topic at a time and opens on the reader's first (Politics by default).
  const topic = normaliseTopic(one(sp.topic)) ?? prefs.topicOrder[0];
  const seed = `${viewer.user?.id ?? 'guest'}-${new Date().toISOString().slice(0, 13)}`;

  const [feed, lastRefresh, highlights, videos] = await Promise.all([
    getFeed({ prefs, tab, sort, topic, page, seed }),
    getLastRefresh(),
    getHighlights(tab, prefs),
    getVideos({ tab, prefs, limit: 3 }),
  ]);
  // One translation pass for everything on the page (cards, most covered, just in).
  const seen = new Set<string>();
  const all = [...feed.stories, ...highlights.mostCovered, ...highlights.justIn].filter((s) => !seen.has(s.id) && seen.add(s.id));
  const cards = await storyCardTexts(all, lang);
  const name = viewer.user?.name ?? null;
  const greeting = t(lang, greetingKey(name, viewer.lastVisit), name ? { name } : undefined);
  return (
    <>
      <FeedView
        lang={lang}
        prefs={prefs}
        tabs={tabsFor(prefs, lang, { international: t(lang, 'feed.tabInternational'), national: t(lang, 'feed.tabNational'), state: t(lang, 'prefs.places') })}
        tab={tab}
        sort={sort}
        topic={topic}
        page={page}
        stories={feed.stories}
        mostCovered={highlights.mostCovered}
        justIn={highlights.justIn}
        videos={videos}
        cards={cards}
        greeting={greeting}
        hasMore={feed.hasMore}
        demo={feed.demo}
        lastVisit={viewer.lastVisit}
        lastRefresh={lastRefresh}
      />
      <MarkVisited />
    </>
  );
}

import FeedView from '@/components/FeedView';
import MarkVisited from '@/components/MarkVisited';
import { getFeed, getViewer } from '@/lib/data';
import { normaliseTab, tabsFor } from '@/lib/feed';
import { t } from '@/lib/i18n';
import type { FeedSort } from '@/lib/types';

export const metadata = { title: 'Your news' };

type Search = Promise<{ [key: string]: string | string[] | undefined }>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function FeedPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const { prefs } = viewer;
  const lang = prefs.uiLanguage;
  const tab = normaliseTab(one(sp.tab));
  const sortParam = one(sp.sort);
  const sort: FeedSort = sortParam === 'latest' || sortParam === 'random' || sortParam === 'sources' ? sortParam : prefs.feedSort;
  const page = Math.min(Math.max(Number.parseInt(one(sp.page) ?? '0', 10) || 0, 0), 20);
  const showAllTopics = one(sp.all) === '1';
  const seed = `${viewer.user?.id ?? 'guest'}-${new Date().toISOString().slice(0, 13)}`;

  const feed = await getFeed({ prefs, tab, sort, showAllTopics, page, seed });
  return (
    <>
      <FeedView
        lang={lang}
        prefs={prefs}
        tabs={tabsFor(prefs, lang, { international: t(lang, 'feed.tabInternational'), national: t(lang, 'feed.tabNational'), state: t(lang, 'prefs.places') })}
        tab={tab}
        sort={sort}
        showAllTopics={showAllTopics}
        page={page}
        stories={feed.stories}
        hasMore={feed.hasMore}
        demo={feed.demo}
        lastVisit={viewer.lastVisit}
      />
      <MarkVisited />
    </>
  );
}

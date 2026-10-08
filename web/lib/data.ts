import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { demoData, DEMO_SOURCES } from './demo';
import { isConfigured } from './env';
import {
  ARCHIVE_DAYS, FEED_DAYS, PAGE_SIZE, HIDDEN_BY_HIDE_CRIME, inTab, matchesFilters, pickLabel, sortStories, type TabId,
} from './feed';
import { isLang } from './i18n';
import { plainText } from './plaintext';
import {
  DEFAULT_PREFS, PREFS_COOKIE, UI_COOKIE, VISIT_COOKIE, decodePrefsCookie, prefsFromProfile,
} from './prefs';
import { publicCache, publicClient } from './supabase/public';
import { createClient } from './supabase/server';
import type { Article, FeedSort, FollowedStory, Prefs, Source, Story, Viewer } from './types';

const STORY_COLS =
  'id,label,label_source_id,label_language,labels,first_published_at,last_article_at,article_count,source_count,languages,source_types,places,primary_place,scope,topics,image_url,image_source,created_at';
const ARTICLE_COLS =
  'id,source_id,title,snippet,url,published_at,fetched_at,title_updated_at,language,wire_key,primary_place,image_url,story_id,sources(id,name,type,language,region,layer)';

const cleanArticle = (a: Article): Article => ({ ...a, title: plainText(a.title), snippet: plainText(a.snippet) });

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

// ------------------------------------------------------------------ viewer

export const getViewer = cache(async (): Promise<Viewer> => {
  const jar = await cookies();
  const cookiePrefs = decodePrefsCookie(jar.get(PREFS_COOKIE)?.value);
  const ui = jar.get(UI_COOKIE)?.value;
  const guestVisit = jar.get(VISIT_COOKIE)?.value ?? null;
  const guestPrefs: Prefs = { ...(cookiePrefs ?? DEFAULT_PREFS), ...(isLang(ui) ? { uiLanguage: ui } : {}) };
  const guest = { user: null, prefs: guestPrefs, hasPrefs: !!cookiePrefs, lastVisit: guestVisit };

  if (!isConfigured()) return { configured: false, ...guest };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { configured: true, ...guest };

  const { data: row } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  const me = { id: user.id, email: user.email ?? user.phone ?? null };
  if (!row) return { configured: true, ...guest, user: me };
  return { configured: true, user: me, prefs: prefsFromProfile(row), hasPrefs: true, lastVisit: row.last_visit_at ?? null };
});

// ------------------------------------------------------------------ feed

/** International, National or the reader's state: the same rule as inTab() (lib/feed.ts), as a query. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tabStories<Q extends { eq: any; or: any; overlaps: any }>(query: Q, tab: TabId, prefs: Prefs): Q {
  if (tab === 'international') return query.eq('scope', 'international');
  if (tab === 'national') return query.or('scope.is.null,scope.neq.international');
  return query.overlaps('places', [prefs.state]);
}

const hideCrime = (prefs: Prefs) => (s: Story) =>
  !prefs.hideCrime || !(s.topics ?? []).some((x) => HIDDEN_BY_HIDE_CRIME.includes(x));

/** The stories most outlets reported in the last 24 hours, most sources first (all topics), and the
 *  newest stories. Mechanical: by number of sources, and by time. */
async function highlights(tab: TabId, prefs: Prefs): Promise<{ mostCovered: Story[]; justIn: Story[] }> {
  const day = daysAgo(1);
  const nowIso = new Date().toISOString();
  if (!isConfigured()) {
    const { stories } = demoData();
    const mine = stories.filter((s) => inTab(s, tab, prefs) && hideCrime(prefs)(s));
    return {
      mostCovered: sortStories(mine, 'sources', '').slice(0, 5),
      justIn: [...mine].sort((a, b) => (b.first_published_at ?? '').localeCompare(a.first_published_at ?? '')).slice(0, 3),
    };
  }
  if (tab === 'state' && !prefs.state) return { mostCovered: [], justIn: [] };
  const supabase = publicClient();
  const base = () => tabStories(supabase.from('stories').select(STORY_COLS), tab, prefs);
  const [most, latest] = await Promise.all([
    base().gte('last_article_at', day).order('source_count', { ascending: false })
      .order('last_article_at', { ascending: false }).limit(12),
    // Some feeds give times in the future (wrong time zone): those are left out of "just in".
    base().lte('first_published_at', nowIso).order('first_published_at', { ascending: false }).limit(12),
  ]);
  const keep = hideCrime(prefs);
  return {
    mostCovered: ((most.data ?? []) as unknown as Story[]).filter(keep).slice(0, 5),
    justIn: ((latest.data ?? []) as unknown as Story[]).filter(keep).slice(0, 3),
  };
}

export interface Video {
  id: string;
  title: string;
  url: string;
  image_url: string | null;
  published_at: string | null;
  language: string | null;
  story_id: string | null;
  source: string;
}

/** The newest videos from the official YouTube channels we follow, newest first. */
async function videos(q: { tab: TabId; prefs: Prefs; limit: number; offset?: number }): Promise<Video[]> {
  if (!isConfigured()) return [];
  if (q.tab === 'state' && !q.prefs.state) return [];
  const supabase = publicClient();
  let query = supabase.from('articles')
    .select('id,title,url,image_url,published_at,language,story_id,sources(name),stories!inner(scope,places)')
    .like('source_id', 'yt_%')   // every YouTube source id starts with yt_ (sources.csv)
    .lte('published_at', new Date().toISOString())
    .gte('published_at', daysAgo(FEED_DAYS));
  if (q.tab === 'international') query = query.eq('stories.scope', 'international');
  else if (q.tab === 'national') query = query.or('scope.is.null,scope.neq.international', { referencedTable: 'stories' });
  else query = query.overlaps('stories.places', [q.prefs.state]);
  const from = q.offset ?? 0;
  const { data } = await query.order('published_at', { ascending: false }).range(from, from + q.limit - 1);
  type Row = Omit<Video, 'source'> & { sources: { name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id, title: plainText(r.title), url: r.url, image_url: r.image_url ?? null, published_at: r.published_at,
    language: r.language, story_id: r.story_id, source: (r.sources?.name ?? '').replace(/\s*\(YouTube\)$/, ''),
  }));
}

/** Stories from the last 30 days whose headlines or opening lines mention the words, newest first. */
async function search(q: string, page: number): Promise<{ stories: Story[]; hasMore: boolean }> {
  const term = q.trim().slice(0, 100);
  const end = (page + 1) * PAGE_SIZE;
  if (term.length < 2) return { stories: [], hasMore: false };
  const from = daysAgo(ARCHIVE_DAYS);
  const to = new Date(Date.now() + 60_000).toISOString();
  if (!isConfigured()) {
    const ids = await customStoryIds([term], from, to);
    const stories = demoData().stories.filter((s) => ids.has(s.id));
    return { stories: sortStories(stories, 'latest', '').slice(0, end), hasMore: stories.length > end };
  }
  const ids = [...(await customStoryIds([term], from, to))];
  if (!ids.length) return { stories: [], hasMore: false };
  const supabase = publicClient();
  const { data } = await supabase.from('stories').select(STORY_COLS).in('id', ids.slice(0, 500))
    .order('last_article_at', { ascending: false }).range(0, end);
  const rows = (data ?? []) as unknown as Story[];
  return { stories: rows.slice(0, end), hasMore: rows.length > end };
}

export interface FeedQuery {
  prefs: Prefs;
  tab: TabId;
  sort: FeedSort;
  topic: string | null;   // a topic button tapped on this visit; null = All
  page: number;
  seed: string;
}

export interface FeedResult {
  stories: Story[];
  hasMore: boolean;
  demo: boolean;
}

/** Story ids whose headlines or snippets mention any of these words (archive search). */
async function customStoryIds(terms: string[], since: string, until: string): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!terms.length) return ids;
  if (!isConfigured()) {
    const { articles } = demoData();
    for (const a of articles) {
      const text = `${a.title} ${a.snippet ?? ''}`.toLowerCase();
      if (terms.some((t) => text.includes(t.toLowerCase()))) ids.add(a.story_id!);
    }
    return ids;
  }
  const supabase = publicClient();
  const results = await Promise.all(
    terms.slice(0, 5).map((q) => supabase.rpc('search_story_ids', { q, since, until })),
  );
  for (const r of results) for (const id of (r.data as string[] | null) ?? []) ids.add(id);
  return ids;
}

async function feed(q: FeedQuery): Promise<FeedResult> {
  const { prefs } = q;
  const since = daysAgo(FEED_DAYS);

  if (!isConfigured()) {
    const { stories } = demoData();
    const filtered = stories.filter((s) => inTab(s, q.tab, prefs) && matchesFilters(s, prefs, q.topic));
    const sorted = sortStories(filtered, q.sort, q.seed);
    const end = (q.page + 1) * PAGE_SIZE;
    return { stories: sorted.slice(0, end), hasMore: sorted.length > end, demo: true };
  }

  const supabase = publicClient();
  if (q.tab === 'state' && !prefs.state) return { stories: [], hasMore: false, demo: false };   // no state chosen yet
  let query = tabStories(supabase.from('stories').select(STORY_COLS).gte('last_article_at', since), q.tab, prefs);
  // Same rules as matchesFilters(): nothing personal narrows the news.
  if (q.topic) query = query.overlaps('topics', [q.topic]);
  if (prefs.hideCrime && !(q.topic && HIDDEN_BY_HIDE_CRIME.includes(q.topic))) {
    query = query.not('topics', 'ov', `{${HIDDEN_BY_HIDE_CRIME.join(',')}}`);
  }

  const end = (q.page + 1) * PAGE_SIZE;
  if (q.sort === 'random') {
    const { data } = await query.order('last_article_at', { ascending: false }).limit(400);
    const shuffled = sortStories((data ?? []) as unknown as Story[], 'random', q.seed);
    return { stories: shuffled.slice(0, end), hasMore: shuffled.length > end, demo: false };
  }
  if (q.sort === 'sources') query = query.order('source_count', { ascending: false });
  const { data } = await query.order('last_article_at', { ascending: false }).range(0, end);
  const rows = (data ?? []) as unknown as Story[];
  return { stories: rows.slice(0, end), hasMore: rows.length > end, demo: false };
}

export interface CardSnippet {
  article_id: string;
  snippet: string;
  language: string | null;
}

/** The opening lines of the report each card's headline comes from, by story id: the same
 *  source's own words, credited on the card with the headline. */
export async function getCardSnippets(stories: Story[], lang: string): Promise<Record<string, CardSnippet>> {
  const byArticle = new Map(stories.map((s): [string, string] => [pickLabel(s, lang).article_id, s.id]).filter(([a]) => a));
  if (!byArticle.size) return {};
  const rows = isConfigured()
    ? await snippetRows([...byArticle.keys()].sort())
    : demoData().articles.filter((a) => byArticle.has(a.id));
  const out: Record<string, CardSnippet> = {};
  for (const r of rows) {
    const snippet = plainText(r.snippet);
    if (snippet) out[byArticle.get(r.id)!] = { article_id: r.id, snippet, language: r.language };
  }
  return out;
}

/** When news was last collected: the time the most recent report reached the database. */
async function lastRefresh(): Promise<string | null> {
  if (!isConfigured()) {
    const times = demoData().articles.map((a) => a.fetched_at).sort();
    return times.at(-1) ?? null;
  }
  const supabase = publicClient();
  const { data } = await supabase.from('articles').select('fetched_at').order('fetched_at', { ascending: false }).limit(1);
  return (data?.[0] as { fetched_at: string } | undefined)?.fetched_at ?? null;
}

// ------------------------------------------------------------------ one story

async function story(id: string): Promise<{ story: Story; articles: Article[] } | null> {
  if (!/^[\w-]{1,80}$/.test(id)) return null;
  if (!isConfigured()) {
    const { stories, articles } = demoData();
    const story = stories.find((s) => s.id === id);
    return story ? { story, articles: articles.filter((a) => a.story_id === id) } : null;
  }
  const supabase = publicClient();
  const [{ data: story }, { data: articles }] = await Promise.all([
    supabase.from('stories').select(STORY_COLS).eq('id', id).maybeSingle(),
    supabase.from('articles').select(ARTICLE_COLS).eq('story_id', id).order('published_at', { ascending: true }).limit(300),
  ]);
  if (!story) return null;
  return { story: story as unknown as Story, articles: ((articles ?? []) as unknown as Article[]).map(cleanArticle) };
}

export async function getArticles(ids: string[]): Promise<Article[]> {
  const clean = ids.filter((x) => /^[\w-]{1,80}$/.test(x)).slice(0, 3);
  if (!clean.length) return [];
  if (!isConfigured()) return demoData().articles.filter((a) => clean.includes(a.id));
  const supabase = publicClient();
  const { data } = await supabase.from('articles').select(ARTICLE_COLS).in('id', clean);
  const rows = ((data ?? []) as unknown as Article[]).map(cleanArticle);
  return clean.map((id) => rows.find((r) => r.id === id)).filter((a): a is Article => !!a);
}

// ------------------------------------------------------------------ follows

export async function getFollowState(storyId: string): Promise<{ following: boolean; seen: number }> {
  if (!isConfigured()) return { following: false, seen: 0 };
  const supabase = await createClient();
  const { data } = await supabase.from('follows').select('seen_article_count').eq('story_id', storyId).maybeSingle();
  return { following: !!data, seen: data?.seen_article_count ?? 0 };
}

export async function markFollowSeen(storyId: string, count: number): Promise<void> {
  if (!isConfigured()) return;
  const supabase = await createClient();
  await supabase.from('follows').update({ seen_article_count: count }).eq('story_id', storyId);
}

export async function getFollowing(): Promise<FollowedStory[]> {
  if (!isConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('follows')
    .select(`seen_article_count, created_at, stories(${STORY_COLS})`)
    .order('created_at', { ascending: false })
    .limit(100);
  return ((data ?? []) as unknown as { seen_article_count: number; stories: Story | null }[])
    .filter((r) => r.stories)
    .map((r) => ({ story: r.stories as Story, seenArticleCount: r.seen_article_count }));
}

// ------------------------------------------------------------------ archive and sources

async function archive(q: { prefs: Prefs; search: string; page: number }): Promise<{ stories: Story[]; hasMore: boolean }> {
  const from = daysAgo(ARCHIVE_DAYS);
  const to = daysAgo(FEED_DAYS);
  const end = (q.page + 1) * PAGE_SIZE;
  const search = q.search.trim().slice(0, 100);
  if (!isConfigured()) return { stories: [], hasMore: false };

  const supabase = publicClient();
  let query = supabase.from('stories').select(STORY_COLS).gte('last_article_at', from).lt('last_article_at', to);
  if (search.length >= 2) {
    const ids = [...(await customStoryIds([search], from, to))];
    if (!ids.length) return { stories: [], hasMore: false };
    query = query.in('id', ids);
  }
  const { data } = await query.order('last_article_at', { ascending: false }).range(0, end);
  const rows = (data ?? []) as unknown as Story[];
  return { stories: rows.slice(0, end), hasMore: rows.length > end };
}

async function sources(): Promise<Source[]> {
  if (!isConfigured()) return DEMO_SOURCES;
  const supabase = publicClient();
  const { data } = await supabase
    .from('sources')
    .select('id,name,layer,type,language,region,status')
    .order('name', { ascending: true });
  return (data ?? []) as unknown as Source[];
}

type SnippetRow = { id: string; snippet: string | null; language: string | null };
const snippetRows = publicCache('snippets', async (ids: string[]): Promise<SnippetRow[]> => {
  const { data } = await publicClient().from('articles').select('id,snippet,language').in('id', ids);
  return (data ?? []) as SnippetRow[];
});

// ------------------------------------------------------------------ cached public reads

/** Only the settings that change which stories a list holds (state, hide crime). The rest of a
 *  reader's settings (topic order, language) never narrows the news, so readers share one cache. */
const newsPrefs = (p: Prefs): Prefs => ({ ...DEFAULT_PREFS, state: p.state, hideCrime: p.hideCrime });

const cachedHighlights = publicCache('highlights', highlights);
export const getHighlights = (tab: TabId, prefs: Prefs) => cachedHighlights(tab, newsPrefs(prefs));

const cachedVideos = publicCache('videos', videos);
export const getVideos = (q: Parameters<typeof videos>[0]) => cachedVideos({ ...q, prefs: newsPrefs(q.prefs) });

export const searchStories = publicCache('search', search);

const cachedFeed = publicCache('feed', feed);
export const getFeed = (q: FeedQuery) => cachedFeed({ ...q, prefs: newsPrefs(q.prefs), seed: q.sort === 'random' ? q.seed : '' });

export const getLastRefresh = publicCache('last-refresh', lastRefresh, 60);
export const getStory = publicCache('story', story, 120);

const cachedArchive = publicCache('archive', archive);
export const getArchive = (q: Parameters<typeof archive>[0]) => cachedArchive({ ...q, prefs: newsPrefs(q.prefs) });

export const getSources = cache(publicCache('sources', sources, 3600));

export function isDemo(): boolean {
  return !isConfigured();
}

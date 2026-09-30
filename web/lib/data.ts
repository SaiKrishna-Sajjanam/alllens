import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { groupsOf } from './catalog';
import { demoData, DEMO_SOURCES } from './demo';
import { isConfigured } from './env';
import {
  ARCHIVE_DAYS, FEED_DAYS, PAGE_SIZE, districtFilter, inTab, matchesInterests, sortStories, type TabId,
} from './feed';
import { isLang } from './i18n';
import {
  DEFAULT_PREFS, PREFS_COOKIE, UI_COOKIE, VISIT_COOKIE, decodePrefsCookie, prefsFromProfile,
} from './prefs';
import { createClient } from './supabase/server';
import type { Article, FeedSort, FollowedStory, Prefs, Source, Story, Viewer } from './types';

const STORY_COLS =
  'id,label,label_source_id,label_language,labels,first_published_at,last_article_at,article_count,source_count,languages,source_types,places,primary_place,scope,topics';
const ARTICLE_COLS =
  'id,source_id,title,snippet,url,published_at,fetched_at,title_updated_at,language,wire_key,primary_place,story_id,sources(id,name,type,language,region,layer)';

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

export interface FeedQuery {
  prefs: Prefs;
  tab: TabId;
  sort: FeedSort;
  showAllTopics: boolean;
  page: number;
  seed: string;
}

export interface FeedResult {
  stories: Story[];
  hasMore: boolean;
  demo: boolean;
}

/** Story ids whose headlines or snippets mention any of the reader's own interests. */
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
  const supabase = await createClient();
  const results = await Promise.all(
    terms.slice(0, 5).map((q) => supabase.rpc('search_story_ids', { q, since, until })),
  );
  for (const r of results) for (const id of (r.data as string[] | null) ?? []) ids.add(id);
  return ids;
}

export async function getFeed(q: FeedQuery): Promise<FeedResult> {
  const { prefs } = q;
  const since = daysAgo(FEED_DAYS);
  const custom = q.showAllTopics ? new Set<string>() : await customStoryIds(prefs.customTopics, since, daysAgo(-1));

  if (!isConfigured()) {
    const { stories } = demoData();
    const filtered = stories.filter((s) => inTab(s, q.tab, prefs) && matchesInterests(s, prefs, custom, q.showAllTopics));
    const sorted = sortStories(filtered, q.sort, q.seed);
    const end = (q.page + 1) * PAGE_SIZE;
    return { stories: sorted.slice(0, end), hasMore: sorted.length > end, demo: true };
  }

  const supabase = await createClient();
  let query = supabase.from('stories').select(STORY_COLS).gte('last_article_at', since);
  if (q.tab === 'international') query = query.eq('scope', 'international');
  else if (q.tab === 'national') query = query.or('scope.is.null,scope.neq.international');
  else {
    query = query.overlaps('places', [prefs.state]);
    const districts = districtFilter(prefs);
    if (districts.length) query = query.overlaps('places', districts);
  }
  if (prefs.languages.length) query = query.overlaps('languages', prefs.languages);
  if (prefs.hideCrime) query = query.not('topics', 'ov', '{crime}');
  if (prefs.sourceTypes.length) {
    const raw = await rawTypesFor(prefs.sourceTypes);
    if (!raw.length) return { stories: [], hasMore: false, demo: false };
    query = query.overlaps('source_types', raw);
  }
  if (!q.showAllTopics && (prefs.topics.length || prefs.customTopics.length)) {
    const ids = [...custom];
    if (prefs.topics.length && ids.length) query = query.or(`topics.ov.{${prefs.topics.join(',')}},id.in.(${ids.join(',')})`);
    else if (prefs.topics.length) query = query.overlaps('topics', prefs.topics);
    else if (ids.length) query = query.in('id', ids);
    else return { stories: [], hasMore: false, demo: false };
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

/** Raw source types (e.g. "tv_digital") that belong to the chosen groups (e.g. "tv"). */
async function rawTypesFor(groups: string[]): Promise<string[]> {
  const sources = await getSources();
  const types = new Set(sources.map((s) => s.type ?? 'other'));
  return [...types].filter((t) => groupsOf(t).some((g) => groups.includes(g)));
}

// ------------------------------------------------------------------ one story

export async function getStory(id: string): Promise<{ story: Story; articles: Article[] } | null> {
  if (!/^[\w-]{1,80}$/.test(id)) return null;
  if (!isConfigured()) {
    const { stories, articles } = demoData();
    const story = stories.find((s) => s.id === id);
    return story ? { story, articles: articles.filter((a) => a.story_id === id) } : null;
  }
  const supabase = await createClient();
  const [{ data: story }, { data: articles }] = await Promise.all([
    supabase.from('stories').select(STORY_COLS).eq('id', id).maybeSingle(),
    supabase.from('articles').select(ARTICLE_COLS).eq('story_id', id).order('published_at', { ascending: true }).limit(300),
  ]);
  if (!story) return null;
  return { story: story as unknown as Story, articles: (articles ?? []) as unknown as Article[] };
}

export async function getArticles(ids: string[]): Promise<Article[]> {
  const clean = ids.filter((x) => /^[\w-]{1,80}$/.test(x)).slice(0, 3);
  if (!clean.length) return [];
  if (!isConfigured()) return demoData().articles.filter((a) => clean.includes(a.id));
  const supabase = await createClient();
  const { data } = await supabase.from('articles').select(ARTICLE_COLS).in('id', clean);
  const rows = (data ?? []) as unknown as Article[];
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

export async function getArchive(q: { prefs: Prefs; search: string; page: number }): Promise<{ stories: Story[]; hasMore: boolean }> {
  const from = daysAgo(ARCHIVE_DAYS);
  const to = daysAgo(FEED_DAYS);
  const end = (q.page + 1) * PAGE_SIZE;
  const search = q.search.trim().slice(0, 100);
  if (!isConfigured()) return { stories: [], hasMore: false };

  const supabase = await createClient();
  let query = supabase.from('stories').select(STORY_COLS).gte('last_article_at', from).lt('last_article_at', to);
  if (q.prefs.languages.length) query = query.overlaps('languages', q.prefs.languages);
  if (search.length >= 2) {
    const ids = [...(await customStoryIds([search], from, to))];
    if (!ids.length) return { stories: [], hasMore: false };
    query = query.in('id', ids);
  }
  const { data } = await query.order('last_article_at', { ascending: false }).range(0, end);
  const rows = (data ?? []) as unknown as Story[];
  return { stories: rows.slice(0, end), hasMore: rows.length > end };
}

export const getSources = cache(async (): Promise<Source[]> => {
  if (!isConfigured()) return DEMO_SOURCES;
  const supabase = await createClient();
  const { data } = await supabase
    .from('sources')
    .select('id,name,layer,type,language,region,status')
    .order('name', { ascending: true });
  return (data ?? []) as unknown as Source[];
});

export function isDemo(): boolean {
  return !isConfigured();
}

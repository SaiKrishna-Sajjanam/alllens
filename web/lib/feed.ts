// Pure, mechanical rules for what a reader sees and in what order.
// No scoring of sources anywhere: only time, counts, the reader's own
// choices, or random order.
import { groupsOf, placeName, type SourceGroup } from './catalog';
import type { Article, FeedSort, LabelInfo, Lang, Prefs, Story, StorySort } from './types';

export const FEED_DAYS = 7;
export const ARCHIVE_DAYS = 30;
export const PAGE_SIZE = 40;
/** The reader's "hide crime and accidents" choice. */
export const HIDDEN_BY_HIDE_CRIME = ['crime', 'accidents'];

export const TAB_IDS = ['international', 'national', 'state'] as const;
export type TabId = (typeof TAB_IDS)[number];
export const DEFAULT_TAB: TabId = 'national';

export interface Tab {
  id: TabId;
  label: string;
}

export function tabsFor(prefs: Prefs, lang: Lang, labels: { international: string; national: string; state: string }): Tab[] {
  return [
    { id: 'international', label: labels.international },
    { id: 'national', label: labels.national },
    { id: 'state', label: prefs.state ? placeName(prefs.state, lang) : labels.state },
  ];
}

export function normaliseTab(tab: string | undefined): TabId {
  if (tab === 'india') return 'national'; // old links
  return (TAB_IDS as readonly string[]).includes(tab ?? '') ? (tab as TabId) : DEFAULT_TAB;
}

export const isInternational = (story: Story) => story.scope === 'international';

/**
 * International = stories from world-news feeds that name no Indian place.
 * National = every Indian story (central, nationwide and all states, the reader's included).
 * State = the reader's state (any state or union territory, all treated alike; none until chosen).
 */
export function inTab(story: Story, tab: TabId, prefs: Prefs): boolean {
  if (tab === 'international') return isInternational(story);
  if (tab === 'national') return !isInternational(story);
  return !!prefs.state && (story.places ?? []).includes(prefs.state);
}

export function matchesInterests(story: Story, prefs: Prefs, customStoryIds: Set<string>, showAllTopics: boolean): boolean {
  const topics = story.topics ?? [];
  if (prefs.hideCrime && topics.some((t) => HIDDEN_BY_HIDE_CRIME.includes(t))) return false;
  const langs = story.languages ?? [];
  if (langs.length && !langs.some((l) => prefs.languages.includes(l))) return false;
  if (prefs.sourceTypes.length) {
    const groups = new Set((story.source_types ?? []).flatMap((t) => groupsOf(t)));
    if (!prefs.sourceTypes.some((g) => groups.has(g as SourceGroup))) return false;
  }
  if (showAllTopics || (!prefs.topics.length && !prefs.customTopics.length)) return true;
  return topics.some((t) => prefs.topics.includes(t)) || customStoryIds.has(story.id);
}

/** Deterministic shuffle so "Random" stays stable while a page is open. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);

export function sortStories(stories: Story[], sort: FeedSort, seed: string): Story[] {
  if (sort === 'random') return seededShuffle(stories, seed);
  const byLatest = (a: Story, b: Story) => time(b.last_article_at) - time(a.last_article_at) || a.id.localeCompare(b.id);
  if (sort === 'latest') return [...stories].sort(byLatest);
  return [...stories].sort((a, b) => b.source_count - a.source_count || byLatest(a, b));
}

/**
 * The headline shown for a story: the earliest headline in the reader's first
 * language that has one, otherwise the earliest headline overall. Always a
 * source's own words, credited to that source.
 */
export function pickLabel(story: Story, languages: string[]): LabelInfo {
  const labels = story.labels ?? {};
  for (const l of languages) if (labels[l]) return labels[l];
  const first = story.label_language ? labels[story.label_language] : undefined;
  return first ?? {
    title: story.label,
    article_id: '',
    source_id: story.label_source_id ?? '',
    source_name: story.label_source_id ?? '',
    published_at: story.first_published_at ?? '',
  };
}

export function isNewSince(story: Story, lastVisit: string | null): boolean {
  return !!lastVisit && time(story.last_article_at) > time(lastVisit);
}

// ------------------------------------------------------------------ one story

export function articleTime(a: Article): number {
  return time(a.published_at) || time(a.fetched_at);
}

export function sortArticles(articles: Article[], sort: StorySort, seed: string): Article[] {
  if (sort === 'random') return seededShuffle(articles, seed);
  const byTime = (a: Article, b: Article) => articleTime(a) - articleTime(b) || a.id.localeCompare(b.id);
  if (sort === 'latest') return [...articles].sort((a, b) => byTime(b, a));
  if (sort === 'source') {
    return [...articles].sort((a, b) => (a.sources?.name ?? '').localeCompare(b.sources?.name ?? '') || byTime(a, b));
  }
  return [...articles].sort(byTime);
}

export function filterArticles(articles: Article[], group: string, language: string): Article[] {
  return articles.filter(
    (a) =>
      (group === 'all' || groupsOf(a.sources?.type).includes(group as SourceGroup)) &&
      (language === 'all' || a.language === language),
  );
}

/** For each article, how many OTHER listings carry the same wire text. */
export function wireCounts(articles: Article[]): Map<string, number> {
  const byKey = new Map<string, number>();
  for (const a of articles) if (a.wire_key) byKey.set(a.wire_key, (byKey.get(a.wire_key) ?? 0) + 1);
  const out = new Map<string, number>();
  for (const a of articles) {
    const n = a.wire_key ? (byKey.get(a.wire_key) ?? 1) - 1 : 0;
    if (n > 0) out.set(a.id, n);
  }
  return out;
}

export function presentGroups(articles: Article[]): SourceGroup[] {
  const set = new Set(articles.flatMap((a) => groupsOf(a.sources?.type)));
  return [...set];
}

export function presentLanguages(articles: Article[]): string[] {
  return [...new Set(articles.map((a) => a.language).filter((l): l is string => !!l))];
}

export const MAX_COMPARE = 3;

export function toggleCompare(selected: string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id);
  if (selected.length >= MAX_COMPARE) return selected;
  return [...selected, id];
}

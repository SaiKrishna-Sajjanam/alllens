// Reader choices: defaults, validation, and conversion to/from the cookie
// (guests) and the profiles table (signed-in readers).
import { AI_ASSISTANTS } from './ai';
import { LANGUAGES, PILOT_STATES, SOURCE_GROUPS, isPlace, isTopic } from './catalog';
import { isLang } from './i18n';
import type { FeedSort, Prefs } from './types';

export const PREFS_COOKIE = 'alllens_prefs';
export const VISIT_COOKIE = 'alllens_last_visit';
export const UI_COOKIE = 'alllens_ui';

export const DEFAULT_PREFS: Prefs = {
  topics: [],
  customTopics: [],
  state: 'tg',
  places: ['tg-hyderabad'],
  languages: ['en'],
  sourceTypes: [],
  hideCrime: false,
  uiLanguage: 'en',
  aiAssistant: 'chatgpt',
  feedSort: 'sources',
  catchupTime: '19:30',
  notifyDigest: true,
  notifyFollowed: true,
};

/** Enough for every district of the largest state; matches profiles_places_len in supabase/migrations. */
export const MAX_PLACES = 100;

const SORTS: FeedSort[] = ['sources', 'latest', 'random'];
const strList = (v: unknown, ok: (s: string) => boolean, max: number) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ok(x)))].slice(0, max) : undefined;

/** Accept only known values; anything unexpected falls back to the default. */
export function cleanPrefs(input: unknown): Prefs {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const langs = strList(o.languages, (c) => LANGUAGES.some((l) => l.code === c), 5);
  const custom = strList(o.customTopics, (s) => s.trim().length >= 2 && s.length <= 60, 20)?.map((s) => s.trim());
  const time = typeof o.catchupTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(o.catchupTime) ? o.catchupTime : undefined;
  return {
    topics: strList(o.topics, isTopic, 20) ?? DEFAULT_PREFS.topics,
    customTopics: custom ?? DEFAULT_PREFS.customTopics,
    state: typeof o.state === 'string' && PILOT_STATES.includes(o.state) ? o.state : DEFAULT_PREFS.state,
    places: strList(o.places, (p) => isPlace(p) && p !== 'tg', MAX_PLACES) ?? DEFAULT_PREFS.places,
    languages: langs && langs.length ? langs : DEFAULT_PREFS.languages,
    sourceTypes: strList(o.sourceTypes, (g) => (SOURCE_GROUPS as readonly string[]).includes(g), 10) ?? [],
    hideCrime: typeof o.hideCrime === 'boolean' ? o.hideCrime : DEFAULT_PREFS.hideCrime,
    uiLanguage: isLang(o.uiLanguage) ? o.uiLanguage : DEFAULT_PREFS.uiLanguage,
    aiAssistant: typeof o.aiAssistant === 'string' && AI_ASSISTANTS.some((a) => a.id === o.aiAssistant)
      ? o.aiAssistant : DEFAULT_PREFS.aiAssistant,
    feedSort: SORTS.includes(o.feedSort as FeedSort) ? (o.feedSort as FeedSort) : DEFAULT_PREFS.feedSort,
    catchupTime: time ?? DEFAULT_PREFS.catchupTime,
    notifyDigest: typeof o.notifyDigest === 'boolean' ? o.notifyDigest : DEFAULT_PREFS.notifyDigest,
    notifyFollowed: typeof o.notifyFollowed === 'boolean' ? o.notifyFollowed : DEFAULT_PREFS.notifyFollowed,
  };
}

export function encodePrefsCookie(p: Prefs): string {
  return encodeURIComponent(JSON.stringify(p));
}

export function decodePrefsCookie(raw: string | undefined | null): Prefs | null {
  if (!raw) return null;
  try {
    return cleanPrefs(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return null;
  }
}

export interface ProfileRow {
  user_id: string;
  topics: string[];
  custom_topics: string[];
  state: string;
  places: string[];
  languages: string[];
  source_types: string[];
  hide_crime: boolean;
  ui_language: string;
  ai_assistant: string;
  feed_sort: string;
  catchup_time: string;
  notify_digest: boolean;
  notify_followed: boolean;
  last_visit_at?: string | null;
}

export function prefsFromProfile(row: Partial<ProfileRow>): Prefs {
  return cleanPrefs({
    topics: row.topics,
    customTopics: row.custom_topics,
    state: row.state,
    places: row.places,
    languages: row.languages,
    sourceTypes: row.source_types,
    hideCrime: row.hide_crime,
    uiLanguage: row.ui_language,
    aiAssistant: row.ai_assistant,
    feedSort: row.feed_sort,
    catchupTime: typeof row.catchup_time === 'string' ? row.catchup_time.slice(0, 5) : undefined,
    notifyDigest: row.notify_digest,
    notifyFollowed: row.notify_followed,
  });
}

export function profileFromPrefs(userId: string, p: Prefs): ProfileRow {
  return {
    user_id: userId,
    topics: p.topics,
    custom_topics: p.customTopics,
    state: p.state,
    places: p.places,
    languages: p.languages,
    source_types: p.sourceTypes,
    hide_crime: p.hideCrime,
    ui_language: p.uiLanguage,
    ai_assistant: p.aiAssistant,
    feed_sort: p.feedSort,
    catchup_time: p.catchupTime,
    notify_digest: p.notifyDigest,
    notify_followed: p.notifyFollowed,
  };
}

// Reader choices: defaults, validation, and conversion to/from the cookie
// (guests) and the profiles table (signed-in readers).
import { AI_ASSISTANTS } from './ai';
import { isState } from './catalog';
import { isLang } from './i18n';
import type { FeedSort, Prefs } from './types';

export const PREFS_COOKIE = 'alllens_prefs';
export const VISIT_COOKIE = 'alllens_last_visit';
export const UI_COOKIE = 'alllens_ui';

export const DEFAULT_PREFS: Prefs = {
  state: '',            // none until the reader picks one: every state is treated alike
  hideCrime: false,
  uiLanguage: 'en',
  aiAssistant: 'chatgpt',
  feedSort: 'sources',
};

const SORTS: FeedSort[] = ['sources', 'latest', 'random'];
/** Accept only known values; anything unexpected falls back to the default. */
export function cleanPrefs(input: unknown): Prefs {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  // Older cookies and profiles also carry topics, languages and kinds of sources: no longer used.
  const state = typeof o.state === 'string' && isState(o.state) ? o.state : DEFAULT_PREFS.state;
  return {
    state,
    hideCrime: typeof o.hideCrime === 'boolean' ? o.hideCrime : DEFAULT_PREFS.hideCrime,
    uiLanguage: isLang(o.uiLanguage) ? o.uiLanguage : DEFAULT_PREFS.uiLanguage,
    aiAssistant: typeof o.aiAssistant === 'string' && AI_ASSISTANTS.some((a) => a.id === o.aiAssistant)
      ? o.aiAssistant : DEFAULT_PREFS.aiAssistant,
    feedSort: SORTS.includes(o.feedSort as FeedSort) ? (o.feedSort as FeedSort) : DEFAULT_PREFS.feedSort,
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
  last_visit_at?: string | null;
}

export function prefsFromProfile(row: Partial<ProfileRow>): Prefs {
  return cleanPrefs({
    state: row.state,
    hideCrime: row.hide_crime,
    uiLanguage: row.ui_language,
    aiAssistant: row.ai_assistant,
    feedSort: row.feed_sort,
  });
}

export function profileFromPrefs(userId: string, p: Prefs): ProfileRow {
  return {
    user_id: userId,
    // Topics, own interests, news languages and kinds of sources no longer narrow anyone's
    // news (and the district level was removed): those columns are kept, empty.
    topics: [],
    custom_topics: [],
    state: p.state,
    places: [],
    languages: [],
    source_types: [],
    hide_crime: p.hideCrime,
    ui_language: p.uiLanguage,
    ai_assistant: p.aiAssistant,
    feed_sort: p.feedSort,
  };
}

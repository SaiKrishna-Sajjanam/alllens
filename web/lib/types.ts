/** Interface languages. Keep in step with UI_LANGUAGES in lib/i18n.ts and profiles_ui_language in supabase/migrations. */
export type Lang = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa' | 'or' | 'ur';
export type FeedSort = 'sources' | 'latest' | 'random';
export type StorySort = 'earliest' | 'latest' | 'random' | 'source';

/** The reader's choices. Nothing here narrows International or National: those are the same
 *  for every reader. The state picks the State tab; "hide crime" is an optional comfort setting;
 *  the topic order only arranges the topic buttons. */
export interface Prefs {
  state: string;
  hideCrime: boolean;
  uiLanguage: Lang;
  aiAssistant: string;
  /** Topic ids in the order the reader put the topic buttons (every topic, each once). Moves buttons only. */
  topicOrder: string[];
}

export interface LabelInfo {
  title: string;
  article_id: string;
  source_id: string;
  source_name: string;
  published_at: string;
}

export interface Story {
  id: string;
  label: string;
  label_source_id: string | null;
  label_language: string | null;
  labels: Record<string, LabelInfo> | null;
  first_published_at: string | null;
  last_article_at: string | null;
  article_count: number;
  source_count: number;
  languages: string[] | null;
  source_types: string[] | null;
  places: string[] | null;
  primary_place: string | null;
  scope: string | null;
  topics: string[] | null;
  /** Link to the earliest report's own picture (never a copy), and that outlet's name. */
  image_url?: string | null;
  image_source?: string | null;
  /** When Vuaz first collected the story (drives the New badge). */
  created_at?: string | null;
}

export interface Source {
  id: string;
  name: string;
  layer: string;
  type: string | null;
  language: string | null;
  region: string | null;
  feed_url?: string | null;
  status: string | null;
}

export interface Article {
  id: string;
  source_id: string;
  title: string;
  snippet: string | null;
  url: string;
  published_at: string | null;
  fetched_at: string;
  title_updated_at: string | null;
  language: string | null;
  wire_key: string | null;
  primary_place: string | null;
  image_url?: string | null;
  story_id?: string | null;
  sources: Pick<Source, 'id' | 'name' | 'type' | 'language' | 'region' | 'layer'> | null;
}

export interface FollowedStory {
  story: Story;
  seenArticleCount: number;
}

export interface Viewer {
  configured: boolean;
  /** name: what the reader asked to be called (null until they write one, after signing in). */
  /** needsName: signed in but no name written yet (only once the database has the column). */
  user: { id: string; email: string | null; name: string | null; needsName: boolean } | null;
  prefs: Prefs;
  hasPrefs: boolean;
  lastVisit: string | null;
}

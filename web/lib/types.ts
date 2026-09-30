/** Interface languages. Keep in step with UI_LANGUAGES in lib/i18n.ts and profiles_ui_language in supabase/migrations. */
export type Lang = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa' | 'or' | 'ur';
export type FeedSort = 'sources' | 'latest' | 'random';
export type StorySort = 'earliest' | 'latest' | 'random' | 'source';

export interface Prefs {
  topics: string[];
  customTopics: string[];
  state: string;
  languages: string[];
  sourceTypes: string[]; // empty = every type
  hideCrime: boolean;
  uiLanguage: Lang;
  aiAssistant: string;
  feedSort: FeedSort;
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
  user: { id: string; email: string | null } | null;
  prefs: Prefs;
  hasPrefs: boolean;
  lastVisit: string | null;
}

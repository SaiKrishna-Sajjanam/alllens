// Places, topics, languages and source-type groups shared by every screen.
// places.json / topics.json are generated from pipeline/data by
// `python -m pipeline.export_web_data`, so the app and the pipeline use the same ids.
import placesData from './generated/places.json';
import topicsData from './generated/topics.json';
import { extraName } from './names';
import type { Lang } from './types';

export interface Place {
  id: string;
  kind: 'state';
  en: string;
  te: string;
  parents: string[];
}
export interface Topic {
  id: string;
  en: string;
  te: string;
}

export const PLACES = placesData as Place[];
export const TOPICS = topicsData as Topic[];
const PLACE_BY_ID = new Map(PLACES.map((p) => [p.id, p]));
const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

/** Every state and union territory, A-Z. All are treated alike; none comes first. */
export const STATES: string[] = PLACES.filter((p) => p.kind === 'state')
  .sort((a, b) => a.en.localeCompare(b.en))
  .map((p) => p.id);

export function isState(id: string): boolean {
  return PLACE_BY_ID.get(id)?.kind === 'state';
}

/** Place name in the interface language; English where that language has no name yet. */
export function placeName(id: string, lang: Lang): string {
  const p = PLACE_BY_ID.get(id);
  if (!p) return id;
  if (lang === 'te') return p.te || p.en;
  return (p.kind === 'state' && extraName('state', id, lang)) || p.en;
}

export function isPlace(id: string): boolean {
  return PLACE_BY_ID.has(id);
}

export function topicName(id: string, lang: Lang): string {
  const t = TOPIC_BY_ID.get(id);
  if (!t) return id;
  return lang === 'te' ? t.te : extraName('topic', id, lang) ?? t.en;
}

export function isTopic(id: string): boolean {
  return TOPIC_BY_ID.has(id);
}

/** The place shown on a story card: its state (the app has one level only). */
export function mostSpecific(ids: string[]): string | null {
  return ids.find((id) => PLACE_BY_ID.has(id)) ?? null;
}

/** News languages: English, then the Indian languages we collect in (sources.csv `language`). */
export const LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'mr', name: 'मराठी' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'ur', name: 'اردو' },
  { code: 'gu', name: 'ગુજરાતી' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'or', name: 'ଓଡ଼ିଆ' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ' },
  { code: 'as', name: 'অসমীয়া' },
];

export function languageName(code: string | null | undefined): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? (code || '');
}

/** Sources carry raw types like "tv_digital"; readers filter by these broad groups. */
export const SOURCE_GROUPS = ['newspaper', 'tv', 'digital', 'video', 'community', 'government', 'international'] as const;
export type SourceGroup = (typeof SOURCE_GROUPS)[number];

export function groupsOf(type: string | null | undefined): SourceGroup[] {
  const t = (type || '').toLowerCase();
  const out: SourceGroup[] = [];
  if (t.includes('newspaper')) out.push('newspaper');
  if (t.includes('tv')) out.push('tv');
  if (t.includes('digital') || t.includes('business')) out.push('digital');
  if (t.includes('video')) out.push('video');       // official YouTube channels (sources.csv type "..._video")
  if (t.includes('community')) out.push('community');
  if (t.includes('government')) out.push('government');
  if (t.includes('international')) out.push('international');
  return out.length ? out : ['digital'];
}

/** The one section a source's reports are listed under on a story page, by fixed rule (a TV
 *  channel's YouTube feed is YouTube; a newspaper's TV arm is Newspaper). Sections are shown in
 *  SOURCE_GROUPS order, which is fixed and the same for every story. */
export function sectionOf(type: string | null | undefined): SourceGroup {
  const g = groupsOf(type);
  for (const s of ['video', 'newspaper', 'tv', 'community', 'government', 'international', 'digital'] as const) {
    if (g.includes(s)) return s;
  }
  return 'digital';
}

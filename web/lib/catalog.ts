// Places, topics, languages and source-type groups shared by every screen.
// places.json / topics.json are generated from pipeline/data by
// `python -m pipeline.export_web_data`, so the app and the pipeline use the same ids.
import placesData from './generated/places.json';
import topicsData from './generated/topics.json';
import type { Lang } from './types';

export interface Place {
  id: string;
  kind: 'state' | 'district' | 'city';
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

/** States offered in onboarding. The pilot covers Telangana; more are added state by state. */
export const PILOT_STATES = ['tg'];

/** Largest cities first so the short list in onboarding covers most readers; the rest A-Z. */
const FIRST = ['tg-hyderabad', 'tg-rangareddy', 'tg-medchal-malkajgiri', 'tg-warangal', 'tg-hanumakonda',
  'tg-karimnagar', 'tg-khammam', 'tg-nizamabad'];

/** Cities and districts of a state. */
export function districtsOf(state: string): Place[] {
  const rank = (p: Place) => (FIRST.includes(p.id) ? FIRST.indexOf(p.id) : FIRST.length);
  return PLACES.filter((p) => p.parents.includes(state)).sort((a, b) => rank(a) - rank(b) || a.en.localeCompare(b.en));
}

export function placeName(id: string, lang: Lang): string {
  const p = PLACE_BY_ID.get(id);
  return p ? (lang === 'te' ? p.te : p.en) : id;
}

export function isPlace(id: string): boolean {
  return PLACE_BY_ID.has(id);
}

export function topicName(id: string, lang: Lang): string {
  const t = TOPIC_BY_ID.get(id);
  return t ? (lang === 'te' ? t.te : t.en) : id;
}

export function isTopic(id: string): boolean {
  return TOPIC_BY_ID.has(id);
}

/** Most specific place first (city/district before state). */
export function mostSpecific(ids: string[]): string | null {
  const rank = (id: string) => ({ city: 3, district: 2, state: 1 })[PLACE_BY_ID.get(id)?.kind ?? 'state'] ?? 0;
  return [...ids].sort((a, b) => rank(b) - rank(a))[0] ?? null;
}

export const LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'hi', name: 'हिन्दी' },
];

export function languageName(code: string | null | undefined): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? (code || '');
}

/** Sources carry raw types like "tv_digital"; readers filter by these broad groups. */
export const SOURCE_GROUPS = ['newspaper', 'tv', 'digital', 'community', 'government', 'international'] as const;
export type SourceGroup = (typeof SOURCE_GROUPS)[number];

export function groupsOf(type: string | null | undefined): SourceGroup[] {
  const t = (type || '').toLowerCase();
  const out: SourceGroup[] = [];
  if (t.includes('newspaper')) out.push('newspaper');
  if (t.includes('tv') || t.includes('video')) out.push('tv');
  if (t.includes('digital') || t.includes('business')) out.push('digital');
  if (t.includes('community')) out.push('community');
  if (t.includes('government')) out.push('government');
  if (t.includes('international')) out.push('international');
  return out.length ? out : ['digital'];
}

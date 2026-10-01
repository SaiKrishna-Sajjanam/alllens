import 'server-only';
// Headlines and snippets (the short opening text from the feed) in the reader's app language.
// Articles are never translated: links open the original, and readers use their own phone's
// translator for it. Every translation is shown marked as Google's, with the source's own
// words one tap away.
//
// Most are ready in the database (pipeline/translate.py, every collect run). Anything still
// missing is translated when a page first opens, through the same Google Apps Script
// translator (docs/TRANSLATE.md), and cached for a week so it is asked for only once.
import { unstable_cache } from 'next/cache';
import { isConfigured, runtimeSetting, tidySetting } from './env';
import { labelLanguage, pickLabel } from './feed';
import { textLanguage } from './script';
import { createClient } from './supabase/server';
import { titleHash } from './titlehash';
import type { Article, Lang, Story } from './types';

// Server-only settings (no NEXT_PUBLIC_ prefix, so they never reach the browser).
const TRANSLATE_URL = tidySetting('TRANSLATE_URL', runtimeSetting('TRANSLATE_URL'));
const TRANSLATE_TOKEN = tidySetting('TRANSLATE_TOKEN', runtimeSetting('TRANSLATE_TOKEN'));
const BATCH_LINES = 40;
const BATCH_CHARS = 3500;     // Google takes about 5,000 characters per call
const MAX_NOW = 120;          // texts translated while one page opens; the rest come from the next run

export interface Headline {
  id: string;                 // article id
  title: string;
  language: string | null;
}

type Kind = 'title' | 'snippet';
interface Text {
  id: string;
  kind: Kind;
  text: string;
  language: string | null;
}

const oneLine = (s: string) => s.split(/\s+/).filter(Boolean).join(' ');
const keyOf = (id: string, kind: Kind) => `${id}:${kind}`;

async function callTranslator(texts: string[], source: string, target: string): Promise<string[]> {
  try {
    return await askTranslator(texts, source, target);
  } catch (e) {
    // Google's Apps Script translator refuses a few source languages (e.g. Assamese); detection works.
    if (source && e instanceof Error && /not currently supported/i.test(e.message)) return askTranslator(texts, '', target);
    throw e;
  }
}

async function askTranslator(texts: string[], source: string, target: string): Promise<string[]> {
  const res = await fetch(TRANSLATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // One text, items separated by blank lines: translating into Telugu and other scripts Google
    // merges or splits single lines but keeps blank-line paragraphs (pipeline/translate.py does the same).
    body: JSON.stringify({ token: TRANSLATE_TOKEN, source, target, texts: [texts.join('\n\n')] }),
    redirect: 'follow',       // Apps Script answers with a redirect to the result
    signal: AbortSignal.timeout(8000),
  });
  const body = (await res.json()) as { translations?: unknown[]; error?: string };
  const parts = Array.isArray(body.translations) ? body.translations.map(String).join('\n').trim().split(/\n\s*\n/) : [];
  if (parts.length !== texts.length) {
    throw new Error(body.error ?? 'translator answer did not match');   // thrown, so never cached
  }
  return parts.map((x) => oneLine(x).slice(0, 600));
}

const cachedTranslate = unstable_cache(callTranslator, ['headline-translation-v1'], { revalidate: 7 * 86_400 });

async function translateNow(items: Text[], lang: Lang): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const batches: { source: string; items: Text[] }[] = [];
  const open = new Map<string, { source: string; items: Text[] }>();
  for (const it of items.slice(0, MAX_NOW)) {
    const source = it.language ?? '';
    let cur = open.get(source);
    const size = (cur?.items ?? []).reduce((n, x) => n + oneLine(x.text).length, 0) + oneLine(it.text).length;
    if (!cur || cur.items.length >= BATCH_LINES || size > BATCH_CHARS) {
      cur = { source, items: [] };
      open.set(source, cur);
      batches.push(cur);
    }
    cur.items.push(it);
  }
  await Promise.all(batches.map((b) =>
    cachedTranslate(b.items.map((x) => oneLine(x.text)), b.source, lang)
      .then((texts) => b.items.forEach((x, j) => { if (texts[j]) out.set(keyOf(x.id, x.kind), texts[j]); }))
      .catch(() => undefined),   // translator busy or not reachable: the original shows
  ));
  return out;
}

/** Translations into the reader's app language, keyed "articleId:title" / "articleId:snippet", for
 *  texts not already written in it. A text with no translation available shows its original words. */
async function translateTexts(items: Text[], lang: Lang): Promise<Map<string, string>> {
  // By the text's own letters: an English title on a Telugu channel is translated for a Telugu reader.
  const need = items
    .map((i) => ({ ...i, language: textLanguage(i.text, i.language) }))
    .filter((i) => i.id && oneLine(i.text) && i.language !== lang);
  const out = new Map<string, string>();
  if (!need.length) return out;
  if (isConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('headline_translations')
      .select('article_id,title,source_hash,snippet,snippet_hash')
      .eq('lang', lang)
      .in('article_id', [...new Set(need.map((i) => i.id))]);
    const wanted = new Map(need.map((i) => [keyOf(i.id, i.kind), i]));
    type Row = { article_id: string; title: string | null; source_hash: string | null; snippet: string | null; snippet_hash: string | null };
    for (const r of (data ?? []) as Row[]) {
      const t = wanted.get(keyOf(r.article_id, 'title'));
      if (t && r.title && r.source_hash === titleHash(t.text)) out.set(keyOf(r.article_id, 'title'), r.title);   // same wording only
      const s = wanted.get(keyOf(r.article_id, 'snippet'));
      if (s && r.snippet && r.snippet_hash === titleHash(s.text)) out.set(keyOf(r.article_id, 'snippet'), r.snippet);
    }
  }
  // Headlines first, so a busy page still gets those.
  const missing = need.filter((i) => !out.has(keyOf(i.id, i.kind))).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'title' ? -1 : 1));
  if (missing.length && TRANSLATE_URL && TRANSLATE_TOKEN) for (const [k, v] of await translateNow(missing, lang)) out.set(k, v);
  return out;
}

const pick = (m: Map<string, string>, kind: Kind) =>
  Object.fromEntries([...m].filter(([k]) => k.endsWith(`:${kind}`)).map(([k, v]) => [k.slice(0, -kind.length - 1), v]));

/** Headline translations by article id. */
export async function translateHeadlines(items: Headline[], lang: Lang): Promise<Record<string, string>> {
  return pick(await translateTexts(items.map((i) => ({ id: i.id, kind: 'title', text: i.title, language: i.language })), lang), 'title');
}

/** Headline and snippet translations of a story's reports, by article id. */
export async function translateReports(articles: Article[], lang: Lang): Promise<{ titles: Record<string, string>; snippets: Record<string, string> }> {
  const texts: Text[] = articles.flatMap((a) => [
    { id: a.id, kind: 'title' as const, text: a.title, language: a.language },
    ...(a.snippet ? [{ id: a.id, kind: 'snippet' as const, text: a.snippet, language: a.language }] : []),
  ]);
  const m = await translateTexts(texts, lang);
  return { titles: pick(m, 'title'), snippets: pick(m, 'snippet') };
}

/** The card headline of each story in the reader's app language, keyed by story id. */
export async function translateStoryHeadlines(stories: Story[], lang: Lang): Promise<Record<string, string>> {
  const labels = stories.map((s) => {
    const label = pickLabel(s, lang);
    return { story: s.id, item: { id: label.article_id, title: label.title, language: labelLanguage(s, label) } };
  });
  const byArticle = await translateHeadlines(labels.map((l) => l.item), lang);
  return Object.fromEntries(labels.filter((l) => byArticle[l.item.id]).map((l) => [l.story, byArticle[l.item.id]]));
}

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
import { after } from 'next/server';
import { getCardSnippets } from './data';
import { isConfigured, runtimeSetting, tidySetting } from './env';
import { labelLanguage, pickLabel } from './feed';
import { textLanguage } from './script';
import { publicCache, publicClient } from './supabase/public';
import { titleHash } from './titlehash';
import type { Article, Lang, Story } from './types';

// Server-only settings (no NEXT_PUBLIC_ prefix, so they never reach the browser).
const TRANSLATE_URL = tidySetting('TRANSLATE_URL', runtimeSetting('TRANSLATE_URL'));
const TRANSLATE_TOKEN = tidySetting('TRANSLATE_TOKEN', runtimeSetting('TRANSLATE_TOKEN'));
const BATCH_LINES = 40;
const BATCH_CHARS = 3500;     // Google takes about 5,000 characters per call
const MAX_NOW = 120;          // texts translated while one page opens; the rest come from the next run
const WAIT_MS = 2500;         // a page waits at most this long; later answers are kept for the next visit

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
    signal: AbortSignal.timeout(20_000),
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
  const batches: { kind: Kind; source: string; items: Text[] }[] = [];
  const open = new Map<string, { kind: Kind; source: string; items: Text[] }>();
  for (const it of items.slice(0, MAX_NOW)) {
    const source = it.language ?? '';
    const key = `${it.kind}:${source}`;   // headlines and snippets in separate calls
    let cur = open.get(key);
    const size = (cur?.items ?? []).reduce((n, x) => n + oneLine(x.text).length, 0) + oneLine(it.text).length;
    if (!cur || cur.items.length >= BATCH_LINES || size > BATCH_CHARS) {
      cur = { kind: it.kind, source, items: [] };
      open.set(key, cur);
      batches.push(cur);
    }
    cur.items.push(it);
  }
  const run = (bs: typeof batches) => Promise.all(bs.map((b) =>
    cachedTranslate(b.items.map((x) => oneLine(x.text)), b.source, lang)
      .then((texts) => b.items.forEach((x, j) => { if (texts[j]) out.set(keyOf(x.id, x.kind), texts[j]); }))
      .catch(() => undefined),   // translator busy or not reachable: the original shows
  ));
  // Snippets are translated when a reader first sees them (collection does headlines only), but the
  // page never waits for them: they finish in the background and show translated from the next view
  // (cached for a week, for everyone). Headlines are waited for, at most WAIT_MS: what is ready shows
  // translated, the rest shows its original words this time and finishes in the background too.
  const snippets = run(batches.filter((b) => b.kind === 'snippet'));
  after(() => snippets);
  const headlines = run(batches.filter((b) => b.kind === 'title'));
  const finished = await Promise.race([headlines.then(() => true), new Promise<false>((r) => setTimeout(() => r(false), WAIT_MS))]);
  if (!finished) after(() => headlines);
  return new Map(out);
}

type StoredRow = { article_id: string; title: string | null; source_hash: string | null; snippet: string | null; snippet_hash: string | null };
/** Translations already stored by the pipeline, shared by every reader for a few minutes. */
const storedTranslations = publicCache('translations', async (lang: Lang, ids: string[]): Promise<StoredRow[]> => {
  const { data } = await publicClient()
    .from('headline_translations')
    .select('article_id,title,source_hash,snippet,snippet_hash')
    .eq('lang', lang)
    .in('article_id', ids);
  return (data ?? []) as StoredRow[];
});

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
    const data = await storedTranslations(lang, [...new Set(need.map((i) => i.id))].sort());
    const wanted = new Map(need.map((i) => [keyOf(i.id, i.kind), i]));
    for (const r of data) {
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

/** Headline and snippet translations of a story's reports, by article id. */
export async function translateReports(articles: Article[], lang: Lang): Promise<{ titles: Record<string, string>; snippets: Record<string, string> }> {
  const texts: Text[] = articles.flatMap((a) => [
    { id: a.id, kind: 'title' as const, text: a.title, language: a.language },
    ...(a.snippet ? [{ id: a.id, kind: 'snippet' as const, text: a.snippet, language: a.language }] : []),
  ]);
  const m = await translateTexts(texts, lang);
  return { titles: pick(m, 'title'), snippets: pick(m, 'snippet') };
}

/** What each card shows under the picture, keyed by story id: the headline in the reader's app
 *  language and the same report's opening lines, each Google's translation where needed. Headlines
 *  are asked for first, so a busy translator still gives those. */
export async function storyCardTexts(stories: Story[], lang: Lang): Promise<{
  titles: Record<string, string>;
  snippets: Record<string, { text: string; language: string | null; translated?: string }>;
}> {
  const snippets = await getCardSnippets(stories, lang);
  const texts: Text[] = [];
  const storyOf = new Map<string, string>();
  for (const s of stories) {
    const label = pickLabel(s, lang);
    if (!label.article_id) continue;
    storyOf.set(label.article_id, s.id);
    texts.push({ id: label.article_id, kind: 'title', text: label.title, language: labelLanguage(s, label) });
    const sn = snippets[s.id];
    if (sn) texts.push({ id: sn.article_id, kind: 'snippet', text: sn.snippet, language: sn.language });
  }
  const m = await translateTexts(texts, lang);
  const byStory = (r: Record<string, string>) =>
    Object.fromEntries(Object.entries(r).filter(([a]) => storyOf.has(a)).map(([a, v]) => [storyOf.get(a)!, v]));
  const translatedSnippets = byStory(pick(m, 'snippet'));
  return {
    titles: byStory(pick(m, 'title')),
    snippets: Object.fromEntries(Object.entries(snippets).map(([id, sn]) =>
      [id, { text: sn.snippet, language: sn.language, translated: translatedSnippets[id] }])),
  };
}

import 'server-only';
// Headlines in the reader's app language. Only headlines: snippets and articles stay as each
// source wrote them, and readers use their own phone's translator for those. Every
// translation is shown marked as Google's, with the source's own words one tap away.
//
// Most are ready in the database (pipeline/translate.py, every collect run). Anything still
// missing is translated when a page first opens, through the same Google Apps Script
// translator (docs/TRANSLATE.md), and cached for a week so it is asked for only once.
import { unstable_cache } from 'next/cache';
import { isConfigured, runtimeSetting, tidySetting } from './env';
import { labelLanguage, pickLabel } from './feed';
import { createClient } from './supabase/server';
import { titleHash } from './titlehash';
import type { Lang, Story } from './types';

// Server-only settings (no NEXT_PUBLIC_ prefix, so they never reach the browser).
const TRANSLATE_URL = tidySetting('TRANSLATE_URL', runtimeSetting('TRANSLATE_URL'));
const TRANSLATE_TOKEN = tidySetting('TRANSLATE_TOKEN', runtimeSetting('TRANSLATE_TOKEN'));
const BATCH_LINES = 40;
const MAX_NOW = 120;          // headlines translated while one page opens; the rest come from the next run

export interface Headline {
  id: string;                 // article id
  title: string;
  language: string | null;
}

const oneLine = (s: string) => s.split(/\s+/).filter(Boolean).join(' ');

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
    // One text, headlines separated by blank lines: translating into Telugu and other scripts Google
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
  return parts.map((x) => oneLine(x).slice(0, 400));
}

const cachedTranslate = unstable_cache(callTranslator, ['headline-translation-v1'], { revalidate: 7 * 86_400 });

async function translateNow(items: Headline[], lang: Lang): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const groups = new Map<string, Headline[]>();
  for (const it of items.slice(0, MAX_NOW)) {
    const key = it.language ?? '';
    groups.set(key, [...(groups.get(key) ?? []), it]);
  }
  const calls: Promise<void>[] = [];
  for (const [source, list] of groups) {
    for (let i = 0; i < list.length; i += BATCH_LINES) {
      const batch = list.slice(i, i + BATCH_LINES);
      calls.push(
        cachedTranslate(batch.map((b) => oneLine(b.title)), source, lang)
          .then((texts) => batch.forEach((b, j) => { if (texts[j]) out[b.id] = texts[j]; }))
          .catch(() => undefined),   // translator busy or not reachable: the original shows
      );
    }
  }
  await Promise.all(calls);
  return out;
}

/** Translations into the reader's app language, keyed by article id, for the reports not
 *  already written in it. A report with no translation available shows its original words. */
export async function translateHeadlines(items: Headline[], lang: Lang): Promise<Record<string, string>> {
  const need = items.filter((i) => i.id && i.title && i.language !== lang);
  const out: Record<string, string> = {};
  if (!need.length) return out;
  if (isConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('headline_translations')
      .select('article_id,title,source_hash')
      .eq('lang', lang)
      .in('article_id', need.map((i) => i.id));
    const byId = new Map(need.map((i) => [i.id, i]));
    for (const r of (data ?? []) as { article_id: string; title: string; source_hash: string }[]) {
      const it = byId.get(r.article_id);
      if (it && r.source_hash === titleHash(it.title)) out[r.article_id] = r.title;   // same wording only
    }
  }
  const missing = need.filter((i) => !out[i.id]);
  if (missing.length && TRANSLATE_URL && TRANSLATE_TOKEN) Object.assign(out, await translateNow(missing, lang));
  return out;
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

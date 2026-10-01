// Which language a headline is really written in, by its letters: a Telugu channel often titles its
// videos in English, and those still need translating for a Telugu reader. Same rule as
// pipeline/translate.py (written_in, text_language).

const SCRIPTS: Record<string, [number, number]> = {
  hi: [0x0900, 0x097f], mr: [0x0900, 0x097f], bn: [0x0980, 0x09ff], as: [0x0980, 0x09ff],
  pa: [0x0a00, 0x0a7f], gu: [0x0a80, 0x0aff], or: [0x0b00, 0x0b7f], ta: [0x0b80, 0x0bff],
  te: [0x0c00, 0x0c7f], kn: [0x0c80, 0x0cff], ml: [0x0d00, 0x0d7f], ur: [0x0600, 0x06ff],
};

const count = (text: string, test: (code: number) => boolean) => {
  let n = 0;
  for (const ch of text) if (test(ch.codePointAt(0)!)) n++;
  return n;
};
const isLatin = (c: number) => (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a);

/** At least a third of the letters in the language's own script (English: mostly Latin letters).
 *  Languages without a table are trusted. */
export function writtenIn(text: string, lang: string | null | undefined): boolean {
  const latin = count(text, isLatin);
  if (lang === 'en') {
    const other = count(text, (c) => Object.values(SCRIPTS).some(([lo, hi]) => c >= lo && c <= hi));
    return latin >= other;
  }
  if (!lang || !SCRIPTS[lang]) return true;
  const [lo, hi] = SCRIPTS[lang];
  const own = count(text, (c) => c >= lo && c <= hi);
  return own > 0 && own * 2 >= latin;
}

/** The source's language when the text is written in it; else English when it is in Latin letters;
 *  else null (the translator detects it). */
export function textLanguage(text: string, lang: string | null | undefined): string | null {
  if (lang && writtenIn(text, lang)) return lang;
  return writtenIn(text, 'en') ? 'en' : null;
}

// "Translate": hand the ORIGINAL article to Google Translate at the reader's click.
// The app itself never shows translated words (product rules 2 and 3): the translation
// happens on Google's site, clearly Google's, and the source's own words stay untouched here.
import type { Lang } from './types';

/** Link to the original article translated into the reader's interface language, or null
 *  when no translation is needed (same language) or the link isn't a web address. */
export function translateUrl(articleUrl: string, articleLang: string | null | undefined, target: Lang): string | null {
  if (!/^https?:\/\//i.test(articleUrl) || articleLang === target) return null;
  return `https://translate.google.com/translate?sl=auto&tl=${target}&u=${encodeURIComponent(articleUrl)}`;
}

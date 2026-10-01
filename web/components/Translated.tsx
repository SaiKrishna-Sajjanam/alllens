import { languageName } from '@/lib/catalog';
import { t } from '@/lib/i18n';
import { textLanguage } from '@/lib/script';
import type { Lang } from '@/lib/types';

/** A headline in the reader's app language. When it is Google's translation, it says so, and
 *  the source's own words are one tap away. Without a translation, the original shows as is. */
export function Translated({ as: Tag, className, original, originalLang, translated, lang }: {
  as: 'h1' | 'h2' | 'p';
  className?: string;
  original: string;
  originalLang: string | null | undefined;
  translated: string | undefined;
  lang: Lang;
}) {
  originalLang = textLanguage(original, originalLang);
  if (!translated) return <Tag className={className} lang={originalLang ?? undefined}>{original}</Tag>;
  return (
    <div className="translated">
      <Tag className={className} lang={lang}>{translated}</Tag>
      <details className="original small">
        <summary>{t(lang, 'tr.showOriginal', { language: languageName(originalLang) })}</summary>
        <p lang={originalLang ?? undefined}>{original}</p>
      </details>
    </div>
  );
}

/** One report on a story page: headline and snippet in the reader's language (Google's
 *  translation where it exists, marked), with a single toggle showing the source's own words. */
export function ReportText({ title, snippet, originalLang, translatedTitle, translatedSnippet, lang }: {
  title: string;
  snippet: string | null;
  originalLang: string | null | undefined;
  translatedTitle: string | undefined;
  translatedSnippet: string | undefined;
  lang: Lang;
}) {
  const ol = textLanguage(title, originalLang) ?? undefined;
  return (
    <div className="translated">
      <h2 className="headline" lang={translatedTitle ? lang : ol}>{translatedTitle ?? title}</h2>
      {snippet && <p className="snippet" lang={translatedSnippet ? lang : ol}>{translatedSnippet ?? snippet}</p>}
      {(translatedTitle || translatedSnippet) && (
        <details className="original small">
          <summary>{t(lang, 'tr.showOriginal', { language: languageName(ol) })}</summary>
          <p lang={ol}><strong>{title}</strong></p>
          {snippet && <p lang={ol}>{snippet}</p>}
        </details>
      )}
    </div>
  );
}

/** Links open the original article or video. When it is in another language, say so, and point
 *  to the reader's own phone translator: the app never translates articles. */
export function OwnTranslatorNote({ articleLang, lang }: { articleLang: string | null | undefined; lang: Lang }) {
  if (!articleLang || articleLang === lang) return null;
  return <p className="small muted">{t(lang, 'story.ownTranslator', { language: languageName(articleLang) })}</p>;
}

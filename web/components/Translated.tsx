import { languageName } from '@/lib/catalog';
import { t } from '@/lib/i18n';
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

/** Links open the original article or video. When it is in another language, say so, and point
 *  to the reader's own phone translator: the app never translates articles. */
export function OwnTranslatorNote({ articleLang, lang }: { articleLang: string | null | undefined; lang: Lang }) {
  if (!articleLang || articleLang === lang) return null;
  return <p className="small muted">{t(lang, 'story.ownTranslator', { language: languageName(articleLang) })}</p>;
}

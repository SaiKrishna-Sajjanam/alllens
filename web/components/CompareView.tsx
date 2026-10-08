import OwnKindTag, { reportKind } from './OwnKindTag';
import { groupsOf, languageName } from '@/lib/catalog';
import { formatTime, t } from '@/lib/i18n';
import type { Article, Lang } from '@/lib/types';
import AskAI from './AskAI';
import BackLink from './BackLink';
import { ExternalIcon } from './Icons';
import { OwnTranslatorNote, Translated } from './Translated';

/** 2-3 reports next to each other, exactly as published (headlines also in the reader's
 *  language, marked as Google's translation). No commentary. */
export default function CompareView({ articles, lang, storyId, aiAssistant, translated }: {
  articles: Article[]; lang: Lang; storyId: string | null; aiAssistant: string;
  translated: { titles: Record<string, string>; snippets: Record<string, string> };
}) {
  const back = storyId ? `/story/${storyId}` : '/feed';
  if (articles.length < 2) {
    return (
      <div className="narrow stack">
        <h1>{t(lang, 'compare.title')}</h1>
        <p className="panel">{t(lang, 'compare.none')}</p>
        <BackLink fallback={back} label={t(lang, storyId ? 'compare.backToStory' : 'story.back')} icon={false} />
      </div>
    );
  }
  return (
    <div className="stack-lg">
      <div className="stack">
        <BackLink fallback={back} label={t(lang, storyId ? 'compare.backToStory' : 'story.back')} />
        <h1>{t(lang, 'compare.title')}</h1>
        <p className="muted">{t(lang, 'compare.intro')}</p>
      </div>
      <div className="compare-grid">
        {articles.map((a) => {
          const l = a.language ?? undefined;
          return (
            <section key={a.id} className="card compare-col" aria-label={a.sources?.name ?? a.source_id}>
              <div className="stack" style={{ gap: 0, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                <strong>{a.sources?.name ?? a.source_id} <OwnKindTag kind={reportKind(a)} lang={lang} /></strong>
                <span className="small muted">
                  {[...groupsOf(a.sources?.type).map((g) => t(lang, `group.${g}` as 'group.tv')), languageName(a.language)].join(' · ')}
                </span>
                <span className="small muted">{formatTime(a.published_at ?? a.fetched_at, lang)}</span>
              </div>
              <span className="section-title">{t(lang, 'compare.headline')}</span>
              <Translated as="p" className="headline" original={a.title} originalLang={a.language}
                translated={translated.titles[a.id]} lang={lang} />
              {a.snippet && (
                <>
                  <span className="section-title">{t(lang, 'compare.snippet')}</span>
                  <Translated as="p" className="small" original={a.snippet} originalLang={l}
                    translated={translated.snippets[a.id]} lang={lang} />
                </>
              )}
              <a href={a.url} target="_blank" rel="noopener noreferrer" data-count="original" className="row" style={{ minHeight: 44, fontWeight: 600 }}>
                {t(lang, 'compare.original')} <ExternalIcon />
              </a>
              <OwnTranslatorNote articleLang={a.language} lang={lang} />
            </section>
          );
        })}
      </div>
      <div className="narrow stack" style={{ margin: 0 }}>
        <AskAI urls={articles.map((a) => a.url)} lang={lang} preferred={aiAssistant} label={t(lang, 'compare.askAll')} block />
        <p className="small muted">{t(lang, 'ai.note')}</p>
      </div>
    </div>
  );
}

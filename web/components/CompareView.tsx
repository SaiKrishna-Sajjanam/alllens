import Link from 'next/link';
import { groupsOf, languageName } from '@/lib/catalog';
import { formatTime, t } from '@/lib/i18n';
import type { Article, Lang } from '@/lib/types';
import AskAI from './AskAI';
import { BackIcon, ExternalIcon } from './Icons';

/** 2-3 reports next to each other, exactly as published. No commentary. */
export default function CompareView({ articles, lang, storyId, aiAssistant }: {
  articles: Article[]; lang: Lang; storyId: string | null; aiAssistant: string;
}) {
  const back = storyId ? `/story/${storyId}` : '/feed';
  if (articles.length < 2) {
    return (
      <div className="narrow stack">
        <h1>{t(lang, 'compare.title')}</h1>
        <p className="panel">{t(lang, 'compare.none')}</p>
        <Link href={back}>{t(lang, storyId ? 'compare.backToStory' : 'story.back')}</Link>
      </div>
    );
  }
  return (
    <div className="stack-lg">
      <div className="stack">
        <Link href={back} className="row" style={{ minHeight: 44, textDecoration: 'none', fontWeight: 500 }}>
          <BackIcon />
          {t(lang, storyId ? 'compare.backToStory' : 'story.back')}
        </Link>
        <h1>{t(lang, 'compare.title')}</h1>
        <p className="muted">{t(lang, 'compare.intro')}</p>
      </div>
      <div className="compare-grid">
        {articles.map((a) => {
          const l = a.language ?? undefined;
          return (
            <section key={a.id} className="card compare-col" aria-label={a.sources?.name ?? a.source_id}>
              <div className="stack" style={{ gap: 0, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                <strong>{a.sources?.name ?? a.source_id}</strong>
                <span className="small muted">
                  {[...groupsOf(a.sources?.type).map((g) => t(lang, `group.${g}` as 'group.tv')), languageName(a.language)].join(' · ')}
                </span>
                <span className="small muted">{formatTime(a.published_at ?? a.fetched_at, lang)}</span>
              </div>
              <span className="section-title">{t(lang, 'compare.headline')}</span>
              <p className="headline" lang={l}>{a.title}</p>
              {a.snippet && (
                <>
                  <span className="section-title">{t(lang, 'compare.snippet')}</span>
                  <p className="small" lang={l} style={{ lineHeight: 1.6 }}>{a.snippet}</p>
                </>
              )}
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="row" style={{ minHeight: 44, fontWeight: 600 }}>
                {t(lang, 'compare.original')} <ExternalIcon />
              </a>
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

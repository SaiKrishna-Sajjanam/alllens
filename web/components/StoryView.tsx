'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { groupsOf, languageName, mostSpecific, placeName } from '@/lib/catalog';
import {
  MAX_COMPARE, filterArticles, pickLabel, presentGroups, presentLanguages, sortArticles, toggleCompare, wireCounts,
} from '@/lib/feed';
import { formatTime, t } from '@/lib/i18n';
import { translateUrl } from '@/lib/translate';
import type { Article, Lang, Story, StorySort } from '@/lib/types';
import AskAI from './AskAI';
import FollowButton from './FollowButton';
import { BackIcon, ExternalIcon } from './Icons';
import RemoteImage from './RemoteImage';

interface Props {
  story: Story;
  articles: Article[];
  lang: Lang;
  readLanguages: string[];
  aiAssistant: string;
  signedIn: boolean;
  following: boolean;
}

const SORTS: StorySort[] = ['earliest', 'latest', 'random', 'source'];

/** Every version of one story, as each source published it. */
export default function StoryView({ story, articles, lang, readLanguages, aiAssistant, signedIn, following }: Props) {
  const [group, setGroup] = useState('all');
  const [language, setLanguage] = useState('all');
  const [sort, setSort] = useState<StorySort>('earliest');
  const [selected, setSelected] = useState<string[]>([]);
  const [warn, setWarn] = useState(false);

  const label = pickLabel(story, readLanguages);
  const labelLang = Object.entries(story.labels ?? {}).find(([, v]) => v.article_id === label.article_id)?.[0];
  const groups = useMemo(() => presentGroups(articles), [articles]);
  const languages = useMemo(() => presentLanguages(articles), [articles]);
  const wires = useMemo(() => wireCounts(articles), [articles]);
  const shown = useMemo(
    () => sortArticles(filterArticles(articles, group, language), sort, story.id),
    [articles, group, language, sort, story.id],
  );
  const place = mostSpecific(story.places ?? []);

  function pick(id: string) {
    const next = toggleCompare(selected, id);
    setWarn(next === selected && !selected.includes(id));
    setSelected(next);
  }

  return (
    <div className="narrow">
      <div className="story-head">
        <Link href="/feed" className="row" style={{ minHeight: 44, textDecoration: 'none', fontWeight: 500 }}>
          <BackIcon />
          {t(lang, 'story.back')}
        </Link>
        <h1 lang={labelLang}>{label.title}</h1>
        <p className="small muted">
          {place ? `${placeName(place, lang)} · ` : ''}
          {t(lang, 'story.firstBy', { source: label.source_name, time: formatTime(label.published_at, lang) })}
        </p>
        <div className="spread">
          <p className="small">
            <strong>{t(lang, 'story.count', { n: story.article_count, s: story.source_count })}</strong>
          </p>
          <FollowButton storyId={story.id} initial={following} signedIn={signedIn} lang={lang} />
        </div>
      </div>

      <div className="filters">
        {groups.length > 1 && (
          <div className="filter-row" role="group" aria-label={t(lang, 'story.filterType')}>
            {['all', ...groups].map((g) => (
              <button key={g} type="button" className="chip" aria-pressed={group === g} onClick={() => setGroup(g)}>
                {g === 'all' ? t(lang, 'story.all') : t(lang, `group.${g}` as 'group.tv')}
              </button>
            ))}
          </div>
        )}
        {languages.length > 1 && (
          <div className="filter-row" role="group" aria-label={t(lang, 'story.filterLanguage')}>
            {['all', ...languages].map((l) => (
              <button key={l} type="button" className="chip" aria-pressed={language === l} onClick={() => setLanguage(l)}
                lang={l === 'all' ? undefined : l}>
                {l === 'all' ? t(lang, 'story.all') : languageName(l)}
              </button>
            ))}
          </div>
        )}
        <div className="spread">
          <label className="row small" htmlFor="story-sort">
            <span className="muted">{t(lang, 'story.sort')}</span>
          </label>
          <select id="story-sort" value={sort} onChange={(e) => setSort(e.target.value as StorySort)} style={{ width: 'auto' }}>
            {SORTS.map((s) => <option key={s} value={s}>{t(lang, `sort.${s}` as 'sort.latest')}</option>)}
          </select>
        </div>
        <p className="small muted">{t(lang, 'story.orderNote')}</p>
        {articles.some((a) => translateUrl(a.url, a.language, lang)) && (
          <p className="small muted">{t(lang, 'story.translateNote')}</p>
        )}
      </div>

      <div className="article-list">
        {shown.length === 0 && <p className="panel">{t(lang, 'story.noneMatch')}</p>}
        {shown.map((a) => {
          const name = a.sources?.name ?? a.source_id;
          const lang2 = a.language ?? undefined;
          const checked = selected.includes(a.id);
          const video = groupsOf(a.sources?.type).includes('video');
          return (
            <article key={a.id} className="card article">
              {a.image_url && (
                <a href={a.url} target="_blank" rel="noopener noreferrer" className={video ? 'report-pic video' : 'report-pic'}
                  tabIndex={-1} aria-hidden="true">
                  <RemoteImage src={a.image_url} />
                </a>
              )}
              <div className="spread" style={{ alignItems: 'baseline' }}>
                <div className="stack" style={{ gap: 0 }}>
                  <span className="source">{name}</span>
                  <span className="small muted">
                    {[...groupsOf(a.sources?.type).map((g) => t(lang, `group.${g}` as 'group.tv')), languageName(a.language)]
                      .filter(Boolean).join(' · ')}
                  </span>
                </div>
                <time className="small muted" dateTime={a.published_at ?? a.fetched_at}>
                  {formatTime(a.published_at ?? a.fetched_at, lang)}
                </time>
              </div>
              <h2 className="headline" lang={lang2}>{a.title}</h2>
              {a.snippet && <p className="snippet" lang={lang2}>{a.snippet}</p>}
              {a.title_updated_at && (
                <p className="small muted">{t(lang, 'story.updated', { time: formatTime(a.title_updated_at, lang) })}</p>
              )}
              {wires.get(a.id) ? <p className="small muted">{t(lang, 'story.wire', { n: wires.get(a.id)! })}</p> : null}
              <div className="actions">
                <a className="btn btn-primary btn-small" href={a.url} target="_blank" rel="noopener noreferrer">
                  {t(lang, video ? 'story.watch' : 'story.read', { source: name })}
                  <ExternalIcon />
                </a>
                {translateUrl(a.url, a.language, lang) && (
                  <a className="btn btn-secondary btn-small" href={translateUrl(a.url, a.language, lang)!} target="_blank"
                    rel="noopener noreferrer" title={t(lang, 'story.translateNote')}>
                    {t(lang, 'story.translate')}
                    <ExternalIcon />
                  </a>
                )}
                <AskAI urls={[a.url]} lang={lang} preferred={aiAssistant} />
                <label className="check compare small" style={{ minHeight: 40, alignItems: 'center' }}>
                  <input type="checkbox" checked={checked} onChange={() => pick(a.id)}
                    disabled={!checked && selected.length >= MAX_COMPARE} />
                  {t(lang, 'story.compare')}
                </label>
              </div>
            </article>
          );
        })}
        <p className="panel small muted">{t(lang, 'story.moreComing')}</p>
      </div>

      {(selected.length > 0 || warn) && (
        <div className="compare-bar" role="region" aria-label={t(lang, 'story.compare')}>
          <span className="small muted">{warn ? t(lang, 'story.compareMax') : t(lang, 'story.compareHint')}</span>
          {selected.length >= 2 ? (
            <Link className="btn btn-primary" href={`/compare?ids=${selected.join(',')}&story=${story.id}`}>
              {t(lang, 'story.compareN', { n: selected.length })}
            </Link>
          ) : (
            <span className="btn btn-primary" aria-disabled="true" style={{ opacity: 0.55 }}>
              {t(lang, 'story.compareN', { n: selected.length })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

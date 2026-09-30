import Link from 'next/link';
import { groupsOf, languageName, mostSpecific, placeName } from '@/lib/catalog';
import { isNewSince, pickLabel } from '@/lib/feed';
import { formatDay, t } from '@/lib/i18n';
import type { Lang, Story } from '@/lib/types';

interface Props {
  story: Story;
  lang: Lang;
  readLanguages: string[];
  lastVisit: string | null;
  extra?: React.ReactNode;
}

/** One story in a list. The headline is a source's own words, credited to it. */
export default function StoryCard({ story, lang, readLanguages, lastVisit, extra }: Props) {
  const label = pickLabel(story, readLanguages);
  const labelLang = Object.entries(story.labels ?? {}).find(([, v]) => v.article_id === label.article_id)?.[0]
    ?? story.label_language ?? undefined;
  const place = mostSpecific(story.places ?? []);
  const groups = [...new Set((story.source_types ?? []).flatMap((x) => groupsOf(x)))];
  const fresh = isNewSince(story, lastVisit);
  return (
    <Link href={`/story/${story.id}`} className="card story-card">
      <div className="spread">
        <span className="small muted">
          {place ? `${placeName(place, lang)} · ` : ''}
          {formatDay(story.last_article_at, lang)}
        </span>
        {fresh && (
          <span className="badge">
            <span className="new-dot" aria-hidden="true" />&nbsp;{t(lang, 'feed.new')}
          </span>
        )}
      </div>
      <h2 className="headline" lang={labelLang}>{label.title}</h2>
      <p className="small muted">{t(lang, 'feed.firstBy', { source: label.source_name })}</p>
      <div className="row small">
        <span className="count">
          {story.source_count === 1 ? t(lang, 'feed.source1') : t(lang, 'feed.sources', { n: story.source_count })}
        </span>
        {(story.languages ?? []).map((l) => (
          <span key={l} className="tag" lang={l}>{languageName(l)}</span>
        ))}
        {groups.map((g) => (
          <span key={g} className="tag">{t(lang, `group.${g}` as const)}</span>
        ))}
      </div>
      {extra}
    </Link>
  );
}

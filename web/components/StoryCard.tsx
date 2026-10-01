import Link from 'next/link';
import { groupsOf, languageName, mostSpecific, placeName } from '@/lib/catalog';
import { isNewSince, labelLanguage, pickLabel } from '@/lib/feed';
import { formatDay, t } from '@/lib/i18n';
import type { Lang, Story } from '@/lib/types';
import { lightPicture } from '@/lib/pictures';
import RemoteImage from './RemoteImage';

interface Props {
  story: Story;
  lang: Lang;
  lastVisit: string | null;
  /** Google's translation of the headline into the app language, when it was written in another. */
  translated?: string;
  extra?: React.ReactNode;
}

/** One story in a list. The headline is a source's own words, credited to it, or Google's
 *  translation of them, marked as such (the original is on the story page). */
export default function StoryCard({ story, lang, lastVisit, translated, extra }: Props) {
  const label = pickLabel(story, lang);
  const labelLang = labelLanguage(story, label) ?? undefined;
  const place = mostSpecific(story.places ?? []);
  const groups = [...new Set((story.source_types ?? []).flatMap((x) => groupsOf(x)))];
  const fresh = isNewSince(story, lastVisit);
  const picture = lightPicture(story.image_url);
  return (
    <Link href={`/story/${story.id}`} className="card story-card">
      {picture && (
        <figure className="story-pic">
          <RemoteImage src={picture} />
          {story.image_source && <figcaption>{t(lang, 'story.pictureBy', { source: story.image_source })}</figcaption>}
        </figure>
      )}
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
      <h2 className="headline" lang={translated ? lang : labelLang}>{translated ?? label.title}</h2>
      <p className="small muted">
        {t(lang, 'feed.firstBy', { source: label.source_name })}
        {translated ? ` · ${t(lang, 'tr.from', { language: languageName(labelLang) })}` : ''}
      </p>
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

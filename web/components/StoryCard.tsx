import Link from 'next/link';
import { groupsOf, languageName, mostSpecific, placeName, isTopic, topicName } from '@/lib/catalog';
import { isNew, labelLanguage, pickLabel } from '@/lib/feed';
import { formatDay, t } from '@/lib/i18n';
import type { Lang, Story } from '@/lib/types';
import { lightPicture } from '@/lib/pictures';
import { textLanguage } from '@/lib/script';
import RemoteImage from './RemoteImage';

interface Props {
  story: Story;
  lang: Lang;
  /** Google's translation of the headline into the app language, when it was written in another. */
  translated?: string;
  /** The opening lines of the same report, and Google's translation of them when there is one. */
  snippet?: { text: string; language: string | null; translated?: string };
  extra?: React.ReactNode;
  /** The topic being viewed, shown as the card's label (a story can belong to several topics). */
  viewTopic?: string;
}

/** One story in a list. The headline and its opening lines are one source's own words,
 *  credited to it, or Google's translation of them, marked as such (the original is on the
 *  story page). */
export default function StoryCard({ story, lang, translated, snippet, extra, viewTopic }: Props) {
  const label = pickLabel(story, lang);
  const labelLang = labelLanguage(story, label) ?? undefined;
  const place = mostSpecific(story.places ?? []);
  const groups = [...new Set((story.source_types ?? []).flatMap((x) => groupsOf(x)))];
  const fresh = isNew(story);
  const picture = lightPicture(story.image_url);
  // The card's label: the topic being viewed, else its first topic (topics.json order).
  const topic = viewTopic ?? (story.topics ?? []).find((x) => isTopic(x)) ?? null;
  return (
    <Link href={`/story/${story.id}`} className={`card story-card${picture ? ' has-pic' : ''}`}>
      {picture && (
        <figure className="story-pic">
          <RemoteImage src={picture} />
          {story.image_source && <figcaption>{t(lang, 'story.pictureBy', { source: story.image_source })}</figcaption>}
        </figure>
      )}
      <div className="spread card-top">
        <span className="kicker">
          {[topic ? topicName(topic, lang) : null, place ? placeName(place, lang) : null].filter(Boolean).join(' · ')}
        </span>
        {fresh && (
          <span className="badge">
            <span className="new-dot" aria-hidden="true" />&nbsp;{t(lang, 'feed.new')}
          </span>
        )}
      </div>
      <h2 className="headline" lang={translated ? lang : labelLang}>{translated ?? label.title}</h2>
      {snippet && (
        <p className="card-snippet" lang={snippet.translated ? lang : textLanguage(snippet.text, snippet.language) ?? undefined}>
          {snippet.translated ?? snippet.text}
        </p>
      )}
      <p className="small muted">
        {t(lang, 'feed.firstBy', { source: label.source_name })} · {formatDay(story.last_article_at, lang)}
        {translated || snippet?.translated ? ` · ${t(lang, 'tr.from', { language: languageName(labelLang) })}` : ''}
      </p>
      <p className="small card-sum">
        <span className="count">{(story.languages ?? []).length > 1
          ? t(lang, 'home.sourcesLangs', { n: story.source_count, l: (story.languages ?? []).length })
          : story.source_count === 1 ? t(lang, 'feed.source1') : t(lang, 'feed.sources', { n: story.source_count })}</span>
      </p>
      <div className="row small card-tags">
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

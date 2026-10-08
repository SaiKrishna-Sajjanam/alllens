import Link from 'next/link';
import { languageName, mostSpecific, placeName, isTopic, topicName } from '@/lib/catalog';
import { isNew, labelLanguage, pickLabel } from '@/lib/feed';
import { formatDay, t } from '@/lib/i18n';
import type { Lang, Story } from '@/lib/types';
import { lightPicture } from '@/lib/pictures';
import { textLanguage } from '@/lib/script';
import type { OwnKind } from '@/lib/ownKind';
import OwnKindTag from './OwnKindTag';
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
  /** The outlet's own mark on the headline's report (Opinion, Editorial, Analysis). */
  kind?: OwnKind;
}

/** One story in a list. The headline and its opening lines are one source's own words,
 *  credited to it, or Google's translation of them, marked as such (the original is on the
 *  story page). */
export default function StoryCard({ story, lang, translated, snippet, extra, viewTopic, kind }: Props) {
  const label = pickLabel(story, lang);
  const labelLang = labelLanguage(story, label) ?? undefined;
  const place = mostSpecific(story.places ?? []);
  const langs = (story.languages ?? []).length;
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
          {kind && <> <OwnKindTag kind={kind} lang={lang} /></>}
        </span>
        {fresh && (
          <span className="badge">
            <span className="new-dot" aria-hidden="true" />&nbsp;{t(lang, 'feed.new')}
          </span>
        )}
      </div>
      {/* A translated headline carries the source's own words as a tooltip; the story page shows them too. */}
      <h2 className="headline" lang={translated ? lang : labelLang} title={translated ? label.title : undefined}>
        {translated ?? label.title}
      </h2>
      {snippet && (
        <p className="card-snippet" lang={snippet.translated ? lang : textLanguage(snippet.text, snippet.language) ?? undefined}>
          {snippet.translated ?? snippet.text}
        </p>
      )}
      {/* The point of Vuaz on every card: how many outlets told this story, in how many languages. */}
      <p className="card-versions">
        <span className="count">{langs > 1
          ? t(lang, 'home.sourcesLangs', { n: story.source_count, l: langs })
          : story.source_count === 1 ? t(lang, 'feed.source1') : t(lang, 'feed.sources', { n: story.source_count })}</span>
        {story.source_count > 1 && <span className="versions-cta">{t(lang, 'card.versions')} →</span>}
      </p>
      <p className="small muted">
        {t(lang, 'feed.firstBy', { source: label.source_name })} · {formatDay(story.last_article_at, lang)}
        {translated || snippet?.translated ? ` · ${t(lang, 'tr.from', { language: languageName(labelLang) })}` : ''}
      </p>
      {extra}
    </Link>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import StoryView from '@/components/StoryView';
import { getFollowState, getStory, getViewer, markFollowSeen } from '@/lib/data';
import { translateReports } from '@/lib/headlines';
import { t } from '@/lib/i18n';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const data = await getStory(id);
  return { title: data ? data.story.label : 'Story' };
}

export default async function StoryPage({ params }: { params: Params }) {
  const { id } = await params;
  const [viewer, data] = await Promise.all([getViewer(), getStory(id)]);
  const lang = viewer.prefs.uiLanguage;
  if (!data) {
    return (
      <div className="narrow stack">
        <p className="panel">{t(lang, 'story.gone')}</p>
        <Link href="/feed">{t(lang, 'story.back')}</Link>
      </div>
    );
  }
  const [follow, translated] = await Promise.all([
    viewer.user ? getFollowState(id) : Promise.resolve({ following: false, seen: 0 }),
    translateReports(data.articles, lang),
  ]);
  if (follow.following && follow.seen !== data.story.article_count) await markFollowSeen(id, data.story.article_count);
  return (
    <StoryView
      story={data.story}
      articles={data.articles}
      lang={lang}
      translated={translated.titles}
      translatedSnippets={translated.snippets}
      aiAssistant={viewer.prefs.aiAssistant}
      signedIn={!!viewer.user}
      following={follow.following}
    />
  );
}

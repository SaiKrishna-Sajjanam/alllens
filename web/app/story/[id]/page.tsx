import type { Metadata } from 'next';
import Link from 'next/link';
import StoryView from '@/components/StoryView';
import { getFollowState, getStory, getViewer, markFollowSeen } from '@/lib/data';
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
  const follow = viewer.user ? await getFollowState(id) : { following: false, seen: 0 };
  if (follow.following && follow.seen !== data.story.article_count) await markFollowSeen(id, data.story.article_count);
  return (
    <StoryView
      story={data.story}
      articles={data.articles}
      lang={lang}
      readLanguages={viewer.prefs.languages}
      aiAssistant={viewer.prefs.aiAssistant}
      signedIn={!!viewer.user}
      following={follow.following}
    />
  );
}

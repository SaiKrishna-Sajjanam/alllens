import Link from 'next/link';
import StoryCard from '@/components/StoryCard';
import { getFollowing, getViewer } from '@/lib/data';
import { storyCardTexts } from '@/lib/headlines';
import { t } from '@/lib/i18n';

export const metadata = { title: 'Following' };

export default async function FollowingPage() {
  const viewer = await getViewer();
  const lang = viewer.prefs.uiLanguage;
  if (!viewer.user) {
    return (
      <div className="narrow stack">
        <h1>{t(lang, 'following.title')}</h1>
        <p className="panel">
          <Link href="/login?next=/following">{t(lang, 'following.signIn')}</Link>
        </p>
      </div>
    );
  }
  const items = await getFollowing();
  const cards = await storyCardTexts(items.map((i) => i.story), lang);
  return (
    <div className="stack-lg">
      <h1>{t(lang, 'following.title')}</h1>
      {items.length === 0 ? (
        <p className="panel">{t(lang, 'following.empty')}</p>
      ) : (
        <div className="feed-grid">
          {items.map(({ story, seenArticleCount }) => {
            const fresh = Math.max(story.article_count - seenArticleCount, 0);
            return (
              <StoryCard key={story.id} story={story} lang={lang} lastVisit={null} translated={cards.titles[story.id]}
                snippet={cards.snippets[story.id]}
                extra={
                  <p className={fresh ? 'badge' : 'small muted'} style={{ alignSelf: 'flex-start' }}>
                    {fresh ? t(lang, 'following.newSince', { n: fresh }) : t(lang, 'following.noNew')}
                  </p>
                } />
            );
          })}
        </div>
      )}
    </div>
  );
}

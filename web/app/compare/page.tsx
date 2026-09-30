import CompareView from '@/components/CompareView';
import { getArticles, getViewer } from '@/lib/data';

export const metadata = { title: 'Side by side' };

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ComparePage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.ids) ? sp.ids.join(',') : sp.ids ?? '';
  const story = typeof sp.story === 'string' && /^[\w-]{1,80}$/.test(sp.story) ? sp.story : null;
  const [viewer, articles] = await Promise.all([getViewer(), getArticles(raw.split(','))]);
  return <CompareView articles={articles} lang={viewer.prefs.uiLanguage} storyId={story} aiAssistant={viewer.prefs.aiAssistant} />;
}

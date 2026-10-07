import Link from 'next/link';
import StoryCard from '@/components/StoryCard';
import { getViewer, searchStories } from '@/lib/data';
import { storyCardTexts } from '@/lib/headlines';
import { t } from '@/lib/i18n';

export const metadata = { title: 'Search' };

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

/** Stories from the last 30 days whose headlines or opening lines contain the words, newest first. */
export default async function SearchPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : '';
  const page = Math.min(Math.max(Number.parseInt(typeof sp.page === 'string' ? sp.page : '0', 10) || 0, 0), 20);
  const viewer = await getViewer();
  const lang = viewer.prefs.uiLanguage;
  const { stories, hasMore } = await searchStories(q, page);
  const cards = await storyCardTexts(stories, lang);
  const more = new URLSearchParams({ q, page: String(page + 1) }).toString();
  return (
    <div className="stack-lg">
      <div className="stack">
        <h1>{t(lang, 'search.title')}</h1>
        <form role="search" className="row" style={{ flexWrap: 'nowrap', maxWidth: 640 }}>
          <label className="visually-hidden" htmlFor="q">{t(lang, 'search.label')}</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder={t(lang, 'search.placeholder')} maxLength={100} autoFocus={!q} />
          <button className="btn btn-primary" type="submit">{t(lang, 'archive.searchButton')}</button>
        </form>
        {q.length >= 2 && <p className="small muted">{t(lang, 'search.results', { q })}</p>}
        {q.length === 1 && <p className="small muted">{t(lang, 'search.hint')}</p>}
      </div>
      {q.length >= 2 && stories.length === 0 && <p className="panel">{t(lang, 'search.empty')}</p>}
      {stories.length > 0 && (
        <div className="feed-grid">
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} lang={lang} translated={cards.titles[s.id]} snippet={cards.snippets[s.id]} />
          ))}
        </div>
      )}
      {hasMore && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-secondary" href={`/search?${more}`} scroll={false}>{t(lang, 'feed.more')}</Link>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import StoryCard from '@/components/StoryCard';
import { getArchive, getViewer } from '@/lib/data';
import { storyCardTexts } from '@/lib/headlines';
import { t } from '@/lib/i18n';

export const metadata = { title: 'Archive' };

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ArchivePage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 100) : '';
  const page = Math.min(Math.max(Number.parseInt(typeof sp.page === 'string' ? sp.page : '0', 10) || 0, 0), 20);
  const viewer = await getViewer();
  const lang = viewer.prefs.uiLanguage;
  const { stories, hasMore } = await getArchive({ prefs: viewer.prefs, search: q, page });
  const cards = await storyCardTexts(stories, lang);
  const more = new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) }).toString();
  return (
    <div className="stack-lg">
      <div className="stack">
        <h1>{t(lang, 'archive.title')}</h1>
        <p className="muted">{t(lang, 'archive.intro')}</p>
        <form role="search" className="row" style={{ flexWrap: 'nowrap', maxWidth: 560 }}>
          <label className="visually-hidden" htmlFor="q">{t(lang, 'archive.search')}</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder={t(lang, 'archive.search')} maxLength={100} />
          <button className="btn btn-secondary" type="submit">{t(lang, 'archive.searchButton')}</button>
        </form>
      </div>
      {stories.length === 0 ? (
        <p className="panel">{t(lang, 'archive.empty')}</p>
      ) : (
        <div className="feed-grid">
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} lang={lang} translated={cards.titles[s.id]}
              snippet={cards.snippets[s.id]} kind={cards.kinds[s.id]} />
          ))}
        </div>
      )}
      {hasMore && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-secondary" href={`/archive?${more}`}>{t(lang, 'feed.more')}</Link>
        </div>
      )}
    </div>
  );
}

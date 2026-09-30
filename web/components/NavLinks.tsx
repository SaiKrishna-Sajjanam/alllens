'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';
import { ArchiveIcon, BookmarkIcon, FeedIcon, PersonIcon } from './Icons';

export default function NavLinks({ lang, signedIn }: { lang: Lang; signedIn: boolean }) {
  const path = usePathname() ?? '';
  const current = (prefix: string) => (path === prefix || path.startsWith(`${prefix}/`) ? 'page' : undefined);
  return (
    <nav className="tabbar" aria-label={t(lang, 'nav.menu')}>
      <Link href="/feed" aria-current={current('/feed') ?? (path.startsWith('/story') ? 'page' : undefined)}>
        <FeedIcon />
        {t(lang, 'nav.feed')}
      </Link>
      <Link href="/following" aria-current={current('/following')}>
        <BookmarkIcon />
        {t(lang, 'nav.following')}
      </Link>
      <Link href="/archive" aria-current={current('/archive')}>
        <ArchiveIcon />
        {t(lang, 'nav.archive')}
      </Link>
      <Link className="extra" href="/sources" aria-current={current('/sources')}>
        {t(lang, 'nav.sources')}
      </Link>
      <Link href={signedIn ? '/settings' : '/login'} aria-current={current(signedIn ? '/settings' : '/login')}>
        <PersonIcon />
        {signedIn ? t(lang, 'nav.settings') : t(lang, 'nav.signin')}
      </Link>
    </nav>
  );
}

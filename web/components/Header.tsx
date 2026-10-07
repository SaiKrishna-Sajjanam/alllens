import Link from 'next/link';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';
import { SearchIcon } from './Icons';
import LanguagePicker from './LanguagePicker';
import Logo from './Logo';
import NavLinks from './NavLinks';
import ThemeToggle from './ThemeToggle';

/** Logo, menu, search, light/dark and the app language: the language picker is on every screen size. */
export default function Header({ lang, signedIn }: { lang: Lang; signedIn: boolean }) {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="inner">
        <Link href="/feed" className="brand"><Logo label={t(lang, 'brand')} /></Link>
        <NavLinks lang={lang} signedIn={signedIn} />
        <form className="header-search" action="/search" role="search">
          <label className="search-box">
            <SearchIcon size={18} />
            <span className="visually-hidden">{t(lang, 'search.label')}</span>
            <input type="search" name="q" placeholder={t(lang, 'search.placeholder')} minLength={2} maxLength={100} />
          </label>
        </form>
        <div className="header-actions">
          <Link href="/search" className="icon-btn search-link" aria-label={t(lang, 'search.label')}>
            <SearchIcon />
          </Link>
          <ThemeToggle labels={{ dark: t(lang, 'theme.dark'), light: t(lang, 'theme.light') }} />
          <LanguagePicker lang={lang} />
        </div>
      </div>
    </header>
  );
}

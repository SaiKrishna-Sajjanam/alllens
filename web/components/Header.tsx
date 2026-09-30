import Link from 'next/link';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';
import LanguagePicker from './LanguagePicker';
import Logo from './Logo';
import NavLinks from './NavLinks';

export default function Header({ lang, signedIn }: { lang: Lang; signedIn: boolean }) {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="inner">
        <Link href="/feed" className="brand"><Logo label={t(lang, 'brand')} /></Link>
        <NavLinks lang={lang} signedIn={signedIn} />
        <div className="header-actions">
          <LanguagePicker lang={lang} />
        </div>
      </div>
    </header>
  );
}

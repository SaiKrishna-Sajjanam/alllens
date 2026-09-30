import Link from 'next/link';
import { setUiLanguage } from '@/app/actions';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';
import NavLinks from './NavLinks';

export default function Header({ lang, signedIn }: { lang: Lang; signedIn: boolean }) {
  const other: Lang = lang === 'en' ? 'te' : 'en';
  return (
    <header className="site-header">
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="inner">
        <Link href="/feed" className="brand">{t(lang, 'brand')}</Link>
        <NavLinks lang={lang} signedIn={signedIn} />
        <div className="header-actions">
          <form action={setUiLanguage.bind(null, other)}>
            <button type="submit" className="btn btn-secondary btn-small" lang={other} aria-label={t(lang, 'lang.switchLabel')}>
              {t(lang, 'lang.switch')}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

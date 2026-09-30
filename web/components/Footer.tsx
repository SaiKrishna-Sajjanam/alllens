import Link from 'next/link';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

export default function Footer({ lang }: { lang: Lang }) {
  return (
    <footer className="site-footer">
      <div className="inner">
        <p>{t(lang, 'footer.rule')}</p>
        <nav aria-label="Footer">
          <Link href="/about">{t(lang, 'footer.about')}</Link>
          <Link href="/sources">{t(lang, 'footer.sources')}</Link>
          <Link href="/grievance">{t(lang, 'footer.grievance')}</Link>
          <Link href="/privacy">{t(lang, 'footer.privacy')}</Link>
          <Link href="/terms">{t(lang, 'footer.terms')}</Link>
        </nav>
      </div>
    </footer>
  );
}

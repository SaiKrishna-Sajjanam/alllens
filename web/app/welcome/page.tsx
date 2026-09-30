import Link from 'next/link';
import PrefsForm from '@/components/PrefsForm';
import { getViewer } from '@/lib/data';
import { t } from '@/lib/i18n';

export const metadata = { title: 'Welcome' };

export default async function WelcomePage() {
  const viewer = await getViewer();
  const lang = viewer.prefs.uiLanguage;
  return (
    <div className="narrow stack-lg">
      <div className="stack">
        <h1>{t(lang, 'welcome.title')}</h1>
        <p className="muted">{t(lang, 'welcome.intro')}</p>
        {!viewer.user && <Link href="/login" className="small">{t(lang, 'welcome.signin')}</Link>}
      </div>
      <PrefsForm initial={viewer.prefs} lang={lang} mode="welcome" signedIn={!!viewer.user} />
    </div>
  );
}

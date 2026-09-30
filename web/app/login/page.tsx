import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { getViewer } from '@/lib/data';
import { PHONE_LOGIN, SITE_URL } from '@/lib/env';
import { t } from '@/lib/i18n';
import { safeNextPath } from '@/lib/paths';

export const metadata = { title: 'Sign in' };

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.next === 'string' ? sp.next : null);
  const viewer = await getViewer();
  if (viewer.user) redirect(next);
  const lang = viewer.prefs.uiLanguage;
  return (
    <div className="narrow stack-lg" style={{ maxWidth: 440 }}>
      <div className="stack">
        <h1>{t(lang, 'login.title')}</h1>
        <p className="muted">{t(lang, 'login.intro')}</p>
      </div>
      <div className="panel">
        <LoginForm lang={lang} next={next} siteUrl={SITE_URL} phoneEnabled={PHONE_LOGIN}
          configured={viewer.configured} initialError={sp.error === '1'} />
      </div>
    </div>
  );
}

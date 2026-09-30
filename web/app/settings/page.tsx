import Link from 'next/link';
import { deleteAccount, signOut } from '@/app/actions';
import PrefsForm from '@/components/PrefsForm';
import { getViewer } from '@/lib/data';
import { t } from '@/lib/i18n';

export const metadata = { title: 'Settings' };

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function SettingsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const lang = viewer.prefs.uiLanguage;
  return (
    <div className="narrow stack-lg">
      <h1>{t(lang, 'settings.title')}</h1>
      <section className="stack" aria-labelledby="reading">
        <h2 id="reading">{t(lang, 'settings.reading')}</h2>
        <PrefsForm initial={viewer.prefs} lang={lang} mode="settings" signedIn={!!viewer.user} />
      </section>

      <section className="panel stack" aria-labelledby="account">
        <h2 id="account">{t(lang, 'settings.account')}</h2>
        {viewer.user ? (
          <>
            <p>{t(lang, 'settings.signedInAs', { email: viewer.user.email ?? '' })}</p>
            <form action={signOut}>
              <button className="btn btn-secondary" type="submit">{t(lang, 'settings.signOut')}</button>
            </form>
            <hr className="divider" />
            <form action={deleteAccount} className="stack">
              <label className="field">
                <strong>{t(lang, 'settings.delete')}</strong>
                <span className="small muted">{t(lang, 'settings.deleteConfirm')}</span>
                <input name="confirm" type="text" autoComplete="off" pattern="DELETE" required aria-describedby="delete-note" />
              </label>
              {sp.delete === 'failed' && <p role="alert" style={{ color: 'var(--danger)' }}>{t(lang, 'login.error')}</p>}
              <button className="btn btn-danger" type="submit">{t(lang, 'settings.deleteButton')}</button>
              <p id="delete-note" className="small muted">{t(lang, 'settings.inactive')}</p>
            </form>
          </>
        ) : (
          <>
            <p className="muted">{t(lang, 'settings.guest')}</p>
            <Link className="btn btn-primary" href="/login?next=/settings">{t(lang, 'nav.signin')}</Link>
          </>
        )}
      </section>
    </div>
  );
}

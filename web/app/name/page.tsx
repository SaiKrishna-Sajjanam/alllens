import { redirect } from 'next/navigation';
import NameForm from '@/components/NameForm';
import { amIRestricted } from '@/lib/admin';
import { getViewer } from '@/lib/data';
import { suggestedName } from '@/lib/displayName';
import { t } from '@/lib/i18n';
import { safeNextPath } from '@/lib/paths';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Your name', robots: { index: false, follow: false } };

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

/** Asked once, right after the first Google sign-in: the name the app greets the reader with. */
export default async function NamePage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.next === 'string' ? sp.next : null);
  const viewer = await getViewer();
  if (!viewer.user) redirect(`/login?next=${encodeURIComponent('/name')}`);
  // A restricted account cannot save anything, so it is not asked.
  if (viewer.user.name || (await amIRestricted())) redirect(next);
  const lang = viewer.prefs.uiLanguage;
  const { data: { user } } = await (await createClient()).auth.getUser();
  return (
    <div className="narrow stack-lg" style={{ maxWidth: 440 }}>
      <div className="stack">
        <h1>{t(lang, 'name.title')}</h1>
        <p className="muted">{t(lang, 'name.intro')}</p>
      </div>
      <div className="panel">
        <NameForm lang={lang} from="ask" next={next} initial={suggestedName(user?.user_metadata, viewer.user.email)} />
      </div>
    </div>
  );
}

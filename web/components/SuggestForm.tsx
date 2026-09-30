'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { suggestSource, type SuggestState } from '@/app/actions';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

export default function SuggestForm({ lang, signedIn }: { lang: Lang; signedIn: boolean }) {
  const [state, action, pending] = useActionState<SuggestState, FormData>(suggestSource, { status: 'idle' });
  if (!signedIn) {
    return (
      <p className="small">
        <Link href="/login?next=/sources">{t(lang, 'suggest.signIn')}</Link>
      </p>
    );
  }
  if (state.status === 'ok') return <p role="status">{t(lang, 'suggest.thanks')}</p>;
  return (
    <form action={action} className="stack">
      <label className="field">
        {t(lang, 'suggest.name')}
        <input name="name" type="text" required minLength={2} maxLength={200} />
      </label>
      <label className="field">
        {t(lang, 'suggest.url')}
        <input name="url" type="url" maxLength={500} placeholder="https://" />
      </label>
      <label className="field">
        {t(lang, 'suggest.note')}
        <textarea name="note" maxLength={1000} />
      </label>
      {state.status === 'error' && <p role="alert" className="small" style={{ color: 'var(--danger)' }}>{t(lang, 'suggest.error')}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending}>{t(lang, 'suggest.send')}</button>
    </form>
  );
}

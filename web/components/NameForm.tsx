'use client';
import { useActionState } from 'react';
import { saveName, type NameState } from '@/app/actions';
import { NAME_MAX } from '@/lib/displayName';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

/** The reader's display name: asked once after signing in (from="ask"), changeable in Settings. */
export default function NameForm({ lang, initial, from, next = '/feed' }: {
  lang: Lang; initial: string; from: 'ask' | 'settings'; next?: string;
}) {
  const [state, action, pending] = useActionState<NameState, FormData>(saveName, { status: 'idle' });
  return (
    <form action={action} className="stack">
      <input type="hidden" name="from" value={from} />
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <strong>{t(lang, 'name.label')}</strong>
        <span className="small muted">{t(lang, 'name.note')}</span>
        <input name="name" type="text" required maxLength={NAME_MAX} defaultValue={initial}
          autoComplete="name" autoFocus={from === 'ask'} />
      </label>
      {state.status === 'empty' && <p role="alert" className="small" style={{ color: 'var(--danger)' }}>{t(lang, 'name.empty')}</p>}
      {state.status === 'failed' && <p role="alert" className="small" style={{ color: 'var(--danger)' }}>{t(lang, 'login.error')}</p>}
      {state.status === 'saved' && <p role="status" className="small">{t(lang, 'name.saved')}</p>}
      <button className={from === 'ask' ? 'btn btn-primary' : 'btn btn-secondary'} type="submit" disabled={pending}>
        {t(lang, from === 'ask' ? 'name.continue' : 'name.save')}
      </button>
    </form>
  );
}

'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { savePrefs } from '@/app/actions';
import { STATES, placeName } from '@/lib/catalog';
import { t } from '@/lib/i18n';
import type { Lang, Prefs } from '@/lib/types';

/** Switch state from the State tab at any time. Every state and union territory, A-Z; saved like any other preference. */
export default function StatePicker({ prefs, lang }: { prefs: Prefs; lang: Lang }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function change(state: string) {
    start(async () => {
      const res = await savePrefs({ ...prefs, state });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="stack" style={{ gap: 6 }} aria-busy={pending}>
      <label className="field" htmlFor="state-tab">
        <span className="field-label">{t(lang, 'prefs.state')}</span>
        <select id="state-tab" value={prefs.state} disabled={pending} onChange={(e) => change(e.target.value)}>
          {!prefs.state && <option value="">{t(lang, 'prefs.chooseState')}</option>}
          {STATES.map((s) => <option key={s} value={s}>{placeName(s, lang)}</option>)}
        </select>
      </label>
      {!prefs.state && <p className="small muted">{t(lang, 'feed.chooseState')}</p>}
    </div>
  );
}

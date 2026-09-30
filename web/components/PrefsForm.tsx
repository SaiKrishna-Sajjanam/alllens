'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { savePrefs } from '@/app/actions';
import { AI_ASSISTANTS } from '@/lib/ai';
import { STATES, placeName } from '@/lib/catalog';
import { UI_LANGUAGES, isLang, t } from '@/lib/i18n';
import type { Lang, Prefs } from '@/lib/types';

interface Props {
  initial: Prefs;
  lang: Lang;
  mode: 'welcome' | 'settings';
}

/** The reader's few choices. Topics, news languages and kinds of sources are not among them:
 *  International and National are the same for everyone (topics are buttons on the feed). */
export default function PrefsForm({ initial, lang, mode }: Props) {
  const [p, setP] = useState<Prefs>(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (patch: Partial<Prefs>) => {
    setSaved(false);
    setP((cur) => ({ ...cur, ...patch }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await savePrefs(p);
      if (!res.ok) return;
      if (mode === 'welcome') router.push('/feed');
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <form className="stack-lg" onSubmit={submit}>
      <fieldset className="form-section" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label">{t(lang, 'prefs.places')}</legend>
        <label className="field" htmlFor="state">
          <span>{t(lang, 'prefs.state')}</span>
          <select id="state" value={p.state} onChange={(e) => set({ state: e.target.value })}>
            {!p.state && <option value="">{t(lang, 'prefs.chooseState')}</option>}
            {STATES.map((s) => <option key={s} value={s}>{placeName(s, lang)}</option>)}
          </select>
        </label>
        <p className="small muted">{t(lang, 'prefs.statePilot')}</p>
      </fieldset>

      <div className="card stack">
        <label className="check">
          <input type="checkbox" checked={p.hideCrime} onChange={(e) => set({ hideCrime: e.target.checked })} />
          <span className="stack" style={{ gap: 0 }}>
            {t(lang, 'prefs.hideCrime')}
            <span className="small muted">{t(lang, 'prefs.hideCrimeHint')}</span>
          </span>
        </label>
      </div>

      {mode === 'settings' && (
        <div className="card stack">
          <span className="field-label">{t(lang, 'settings.app')}</span>
          <label className="field" htmlFor="ui-lang">
            {t(lang, 'settings.ui')}
            <select id="ui-lang" value={p.uiLanguage}
              onChange={(e) => { if (isLang(e.target.value)) set({ uiLanguage: e.target.value }); }}>
              {UI_LANGUAGES.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.name}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="ai">
            {t(lang, 'settings.ai')}
            <select id="ai" value={p.aiAssistant} onChange={(e) => set({ aiAssistant: e.target.value })}>
              {AI_ASSISTANTS.map((a) => (
                <option key={a.id} value={a.id}>{a.id === 'other' ? t(lang, 'ai.other') : a.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="stack">
        <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
          {pending ? t(lang, 'common.loading') : mode === 'welcome' ? t(lang, 'prefs.save') : t(lang, 'prefs.saveSettings')}
        </button>
        {saved && <p className="small" role="status">{t(lang, 'prefs.saved')}</p>}
      </div>
    </form>
  );
}

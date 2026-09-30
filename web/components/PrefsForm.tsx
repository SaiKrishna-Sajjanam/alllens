'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { savePrefs } from '@/app/actions';
import { AI_ASSISTANTS } from '@/lib/ai';
import { LANGUAGES, SOURCE_GROUPS, STATES, TOPICS, placeName, topicName } from '@/lib/catalog';
import { UI_LANGUAGES, isLang, t } from '@/lib/i18n';
import { DEFAULT_PREFS } from '@/lib/prefs';
import type { Lang, Prefs } from '@/lib/types';

interface Props {
  initial: Prefs;
  lang: Lang;
  mode: 'welcome' | 'settings';
}

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

const hasAll = (list: string[], all: readonly string[]) => all.length > 0 && all.every((v) => list.includes(v));

/** "All" chip: selects every option; when all are already selected, a second tap clears them. */
function AllChip({ lang, on, onClick, soft }: { lang: Lang; on: boolean; onClick: () => void; soft?: boolean }) {
  return (
    <button type="button" className={soft ? 'chip soft' : 'chip'} aria-pressed={on} onClick={onClick}>
      {t(lang, 'story.all')}
    </button>
  );
}

export default function PrefsForm({ initial, lang, mode }: Props) {
  const [p, setP] = useState<Prefs>(initial);
  const [custom, setCustom] = useState('');
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (patch: Partial<Prefs>) => {
    setSaved(false);
    setP((cur) => ({ ...cur, ...patch }));
  };

  const topicIds = TOPICS.map((x) => x.id);
  const languageCodes = LANGUAGES.map((l) => l.code);

  function addCustom() {
    const v = custom.trim();
    if (v.length >= 2 && v.length <= 60 && !p.customTopics.includes(v) && p.customTopics.length < 20) {
      set({ customTopics: [...p.customTopics, v] });
    }
    setCustom('');
  }

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
        <legend className="field-label">{t(lang, 'prefs.topics')}</legend>
        <div className="chips">
          <AllChip lang={lang} on={hasAll(p.topics, topicIds)}
            onClick={() => set({ topics: hasAll(p.topics, topicIds) ? [] : topicIds })} />
          {TOPICS.map((topic) => (
            <button key={topic.id} type="button" className="chip" aria-pressed={p.topics.includes(topic.id)}
              onClick={() => set({ topics: toggle(p.topics, topic.id) })}>
              {topicName(topic.id, lang)}
            </button>
          ))}
        </div>
        <p className="small muted">{t(lang, 'prefs.topicsHint')}</p>
      </fieldset>

      <div className="form-section">
        <label className="field-label" htmlFor="custom-topic">{t(lang, 'prefs.custom')}</label>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input id="custom-topic" type="text" value={custom} maxLength={60} placeholder={t(lang, 'prefs.customPlaceholder')}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} />
          <button type="button" className="btn btn-secondary" onClick={addCustom}>{t(lang, 'prefs.add')}</button>
        </div>
        {p.customTopics.length > 0 && (
          <div className="chips">
            {p.customTopics.map((c) => (
              <button key={c} type="button" className="chip on" aria-label={t(lang, 'prefs.remove', { name: c })}
                onClick={() => set({ customTopics: p.customTopics.filter((x) => x !== c) })}>
                {c} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        )}
      </div>

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

      <fieldset className="form-section" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label">{t(lang, 'prefs.languages')}</legend>
        <div className="chips">
          {/* At least one language is always kept, so clearing "All" goes back to the default (English). */}
          <AllChip lang={lang} on={hasAll(p.languages, languageCodes)}
            onClick={() => set({ languages: hasAll(p.languages, languageCodes) ? DEFAULT_PREFS.languages : languageCodes })} />
          {LANGUAGES.map((l) => (
            <button key={l.code} type="button" className="chip" lang={l.code} aria-pressed={p.languages.includes(l.code)}
              onClick={() => {
                const next = toggle(p.languages, l.code);
                if (next.length) set({ languages: next });
              }}>
              {l.name}{l.code === 'en' ? ` · ${t(lang, 'prefs.default')}` : ''}
            </button>
          ))}
        </div>
        <p className="small muted">{t(lang, 'prefs.languagesHint')}</p>
      </fieldset>

      <fieldset className="form-section" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label">{t(lang, 'prefs.sourceTypes')}</legend>
        <div className="chips">
          <AllChip lang={lang} on={hasAll(p.sourceTypes, SOURCE_GROUPS)}
            onClick={() => set({ sourceTypes: hasAll(p.sourceTypes, SOURCE_GROUPS) ? [] : [...SOURCE_GROUPS] })} />
          {SOURCE_GROUPS.map((g) => (
            <button key={g} type="button" className="chip" aria-pressed={p.sourceTypes.includes(g)}
              onClick={() => set({ sourceTypes: toggle(p.sourceTypes, g) })}>
              {t(lang, `group.${g}` as 'group.tv')}
            </button>
          ))}
        </div>
        <p className="small muted">{t(lang, 'prefs.sourceTypesHint')}</p>
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

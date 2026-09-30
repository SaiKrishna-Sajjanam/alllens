'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { savePrefs } from '@/app/actions';
import { districtsOf } from '@/lib/catalog';
import { t } from '@/lib/i18n';
import { MAX_PLACES } from '@/lib/prefs';
import type { Lang, Prefs } from '@/lib/types';

const SHOWN = 8;

/** Multi-select of the state's districts, shown under the State tab. Saved like any other preference. */
export default function DistrictFilter({ prefs, lang }: { prefs: Prefs; lang: Lang }) {
  const districts = districtsOf(prefs.state);
  const ids = districts.map((d) => d.id);
  const [places, setPlaces] = useState(prefs.places);
  const [expanded, setExpanded] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const allOn = ids.length > 0 && ids.every((id) => places.includes(id));
  const visible = expanded ? districts : [...districts.slice(0, SHOWN), ...districts.slice(SHOWN).filter((d) => places.includes(d.id))];

  function save(next: string[]) {
    const kept = next.slice(0, MAX_PLACES);
    setPlaces(kept);
    start(async () => {
      const res = await savePrefs({ ...prefs, places: kept });
      if (res.ok) router.refresh();
    });
  }

  return (
    <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 6 }} aria-busy={pending}>
      <legend className="field-label">{t(lang, 'feed.districts')}</legend>
      <div className="chips">
        <button type="button" className="chip soft" aria-pressed={allOn} disabled={pending}
          onClick={() => save(allOn ? [] : ids)}>
          {t(lang, 'story.all')}
        </button>
        {visible.map((d) => {
          const on = places.includes(d.id);
          return (
            <button key={d.id} type="button" className="chip soft" aria-pressed={on} disabled={pending}
              onClick={() => save(on ? places.filter((p) => p !== d.id) : [...places, d.id])}>
              {lang === 'te' ? d.te : d.en}
            </button>
          );
        })}
        {!expanded && districts.length > SHOWN && (
          <button type="button" className="chip dashed" onClick={() => setExpanded(true)}>
            + {districts.length - SHOWN}
          </button>
        )}
      </div>
      <p className="small muted">{t(lang, 'feed.districtsHint')}</p>
    </fieldset>
  );
}

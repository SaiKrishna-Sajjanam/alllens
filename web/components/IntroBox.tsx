'use client';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

/** First visit only (no earlier visit recorded): what Vuaz is, in three lines. Closing it hides it now;
 *  from the next visit on it is not shown at all. */
export default function IntroBox({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <section className="intro-box" aria-labelledby="intro-title">
      <h2 id="intro-title">{t(lang, 'intro.title')}</h2>
      <ol>
        <li>{t(lang, 'intro.one')}</li>
        <li>{t(lang, 'intro.two')}</li>
        <li>{t(lang, 'intro.three')}</li>
      </ol>
      <button type="button" className="btn btn-secondary btn-small intro-close" onClick={() => setOpen(false)}
        aria-label={t(lang, 'common.close')}>×</button>
    </section>
  );
}

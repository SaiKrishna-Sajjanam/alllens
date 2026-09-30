'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setUiLanguage } from '@/app/actions';
import { UI_LANGUAGES, isLang, t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

/** Interface language, each option written in its own script. */
export default function LanguagePicker({ lang }: { lang: Lang }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <label className="lang-picker">
      <span className="visually-hidden">{t(lang, 'settings.ui')}</span>
      <select value={lang} disabled={pending} aria-label={t(lang, 'settings.ui')}
        onChange={(e) => {
          const next = e.target.value;
          if (!isLang(next)) return;
          start(async () => {
            await setUiLanguage(next);
            router.refresh();
          });
        }}>
        {UI_LANGUAGES.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.name}</option>)}
      </select>
    </label>
  );
}

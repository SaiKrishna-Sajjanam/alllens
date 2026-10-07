'use client';
import { useEffect, useState } from 'react';
import { THEME_COOKIE } from '@/lib/prefs';

/** Light or dark, the reader's choice; until they choose, the device's setting. The choice is kept
 *  in a cookie so the page is drawn in it straight away (app/layout.tsx). */
export default function ThemeToggle({ labels }: { labels: { dark: string; light: string } }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const chosen = document.documentElement.dataset.theme;
    setDark(chosen ? chosen === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);
  function flip() {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setDark(!dark);
  }
  return (
    <button type="button" className="icon-btn" onClick={flip} aria-label={dark ? labels.light : labels.dark}
      title={dark ? labels.light : labels.dark}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round" aria-hidden="true">
        {dark
          ? <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8" />
          : <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />}
      </svg>
    </button>
  );
}

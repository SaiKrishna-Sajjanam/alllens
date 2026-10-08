'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Pages counted on the admin page, by the first part of the address; anything else is "other".
const PAGES = new Set(['feed', 'story', 'compare', 'watch', 'search', 'archive', 'following', 'sources',
  'settings', 'about', 'login', 'welcome']);
const NOT_COUNTED = new Set(['admin', 'auth', 'api']);

/** Adds 1 to today's count for this page (admin page statistics). Only four facts are sent: which
 *  page, website or installed app, phone/tablet/laptop, and the app language. No id, cookie,
 *  address or account: a visit is counted, never recorded. */
const installed = () => window.matchMedia('(display-mode: standalone)').matches
  || document.referrer.startsWith('android-app://');   // the Play Store app opens the site this way

/** Store-free storage access: private windows and blocked site data simply count nothing. */
function flag(store: 'local' | 'session', key: string, set = false): boolean {
  try {
    const s = store === 'local' ? window.localStorage : window.sessionStorage;
    const had = s.getItem(key) === '1';
    if (set) s.setItem(key, '1');
    return had;
  } catch {
    return true;
  }
}

export default function ViewCounter({ url, apiKey }: { url: string; apiKey: string }) {
  const pathname = usePathname();
  const rpc = (name: string, body: object) => fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey, Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);   // a missed count never matters to the reader

  // Funnel (admin page): the first page of a session counts as a first or returning visit (the device
  // keeps only a yes/no note), and taps on a link to an outlet's original report are counted.
  useEffect(() => {
    if (!url || !apiKey) return;
    const platform = installed() ? 'app' : 'web';
    if (!flag('session', 'vuaz_session', true)) {
      void rpc('count_event', { event: flag('local', 'vuaz_seen', true) ? 'visit_return' : 'visit_first', platform });
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[data-count="original"]');
      if (a) void rpc('count_event', { event: 'open_original', platform });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, apiKey]);

  useEffect(() => {
    if (!url || !apiKey) return;
    const first = pathname.split('/')[1] || 'feed';
    if (NOT_COUNTED.has(first)) return;
    const width = Math.min(window.screen.width, window.innerWidth);
    const body = {
      page: PAGES.has(first) ? first : 'other',
      platform: installed() ? 'app' : 'web',
      device: width < 760 ? 'phone' : width < 1100 ? 'tablet' : 'laptop',
      lang: document.documentElement.lang || 'en',
    };
    void rpc('count_view', body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, url, apiKey]);
  return null;
}

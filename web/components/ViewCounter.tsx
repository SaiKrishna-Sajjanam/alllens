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
export default function ViewCounter({ url, apiKey }: { url: string; apiKey: string }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!url || !apiKey) return;
    const first = pathname.split('/')[1] || 'feed';
    if (NOT_COUNTED.has(first)) return;
    const installed = window.matchMedia('(display-mode: standalone)').matches
      || document.referrer.startsWith('android-app://');   // the Play Store app opens the site this way
    const width = Math.min(window.screen.width, window.innerWidth);
    const body = {
      page: PAGES.has(first) ? first : 'other',
      platform: installed ? 'app' : 'web',
      device: width < 760 ? 'phone' : width < 1100 ? 'tablet' : 'laptop',
      lang: document.documentElement.lang || 'en',
    };
    fetch(`${url}/rest/v1/rpc/count_view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey, Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);   // a missed count never matters to the reader
  }, [pathname, url, apiKey]);
  return null;
}

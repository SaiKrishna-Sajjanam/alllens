'use client';
import { useEffect } from 'react';

const KEY = 'vuaz-scroll';
const IN_APP = 'vuaz-in-app';

const read = (): Record<string, number> => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
};

/** Coming back to a page puts the reader where they left it, on every page of the site: the
 *  scroll position is noted when they leave (tapping a link, or the page closing) and restored
 *  when they return with Back, once the page has grown tall enough to scroll there. */
export default function ScrollMemory() {
  useEffect(() => {
    const remember = () => {
      try {
        const saved = read();
        saved[location.pathname + location.search] = window.scrollY;
        const keys = Object.keys(saved);
        for (const k of keys.slice(0, Math.max(0, keys.length - 50))) delete saved[k];   // keep it small
        sessionStorage.setItem(KEY, JSON.stringify(saved));
      } catch {
        // storage blocked (private mode on some phones): Back still works, just from the top
      }
    };

    // Any tap on a link inside the site: note where the reader is, and which page they went to from here.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest('a');
      if (!a || a.target === '_blank' || a.origin !== location.origin || a.hasAttribute('data-back')) return;
      remember();
      try { sessionStorage.setItem(IN_APP, a.pathname + a.search); } catch { /* see above */ }
    };

    let stop = () => {};
    const onBack = () => {
      stop();
      const target = read()[location.pathname + location.search];
      if (!target) return;
      // The page may still be loading: keep trying for a few seconds until it is tall enough,
      // and give up the moment the reader scrolls or taps themselves.
      let frame = 0;
      const until = Date.now() + 4000;
      const cancel = () => stop();
      const tick = () => {
        const room = document.documentElement.scrollHeight - window.innerHeight;
        if (room >= target - 2) {
          window.scrollTo(0, target);
          if (Math.abs(window.scrollY - target) < 2 && Date.now() > until - 3000) return stop();
        }
        if (Date.now() < until) frame = requestAnimationFrame(tick);
        else stop();
      };
      stop = () => {
        cancelAnimationFrame(frame);
        for (const ev of ['wheel', 'touchstart', 'keydown', 'mousedown'] as const) window.removeEventListener(ev, cancel);
        stop = () => {};
      };
      for (const ev of ['wheel', 'touchstart', 'keydown', 'mousedown'] as const) window.addEventListener(ev, cancel, { passive: true });
      frame = requestAnimationFrame(tick);
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onBack);
    window.addEventListener('pagehide', remember);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onBack);
      window.removeEventListener('pagehide', remember);
      stop();
    };
  }, []);
  return null;
}

/** Whether the reader reached this page by tapping a link on another page of the site. */
export function cameFromInsideSite(): boolean {
  try {
    return sessionStorage.getItem(IN_APP) === location.pathname + location.search && window.history.length > 1;
  } catch {
    return false;
  }
}

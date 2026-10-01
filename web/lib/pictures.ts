// The outlet's own picture, in the lightest version the outlet itself offers (still loaded from
// its site, never copied). Phones download every card picture, and some outlets attach 1,200-
// pixel originals or multi-megabyte animated GIFs. The collector also leaves out pictures over
// 500 KB (pipeline/common.py picture_too_heavy).

export function lightPicture(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  if (/\.gif$/i.test(u.pathname)) return null;                       // animated, often several MB
  if (u.hostname.endsWith('thgim.com')) {                           // The Hindu: 480-pixel version
    u.pathname = u.pathname.replace('/LANDSCAPE_1200/', '/LANDSCAPE_480/');
  } else if (u.hostname === 'images.indianexpress.com') {           // Indian Express: width 480
    u.searchParams.set('w', '480');
  }
  return u.toString();
}

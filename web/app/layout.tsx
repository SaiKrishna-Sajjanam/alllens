import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ScrollMemory from '@/components/ScrollMemory';
import ViewCounter from '@/components/ViewCounter';
import { cookies } from 'next/headers';
import { getViewer } from '@/lib/data';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import { THEME_COOKIE } from '@/lib/prefs';
import { isRtl } from '@/lib/i18n';
import './globals.css';

const serif = localFont({ src: [{ path: '../node_modules/@fontsource/newsreader/files/newsreader-latin-500-normal.woff2', weight: '500' }, { path: '../node_modules/@fontsource/newsreader/files/newsreader-latin-600-normal.woff2', weight: '600' }], variable: '--font-serif', display: 'swap', declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' }] });
const sans = localFont({ src: [{ path: '../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2', weight: '400' }, { path: '../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2', weight: '500' }, { path: '../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2', weight: '600' }], variable: '--font-sans', display: 'swap', declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' }] });
// Fonts ship with the app (npm @fontsource packages), so building never depends on reaching Google Fonts.
// One font per Indian script, each limited to its script's letters (unicode-range) and not preloaded:
// a browser only downloads the ones whose letters appear on the page. (next/font needs options written out literally.)
const telugu = localFont({ src: [{ path: '../node_modules/@fontsource/noto-sans-telugu/files/noto-sans-telugu-telugu-400-normal.woff2', weight: '400' }, { path: '../node_modules/@fontsource/noto-sans-telugu/files/noto-sans-telugu-telugu-600-normal.woff2', weight: '600' }], variable: '--font-telugu', display: 'swap', declarations: [{ prop: 'unicode-range', value: 'U+0951-0952,U+0964-0965,U+0C00-0C7F,U+1CDA,U+1CF2,U+200C-200D,U+25CC' }], preload: false });
const deva = localFont({ src: [{ path: '../node_modules/@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff2', weight: '400' }, { path: '../node_modules/@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-600-normal.woff2', weight: '600' }], variable: '--font-deva', display: 'swap', declarations: [{ prop: 'unicode-range', value: 'U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF,U+11B00-11B09' }], preload: false });
const bengali = localFont({ src: [{ path: '../node_modules/@fontsource/noto-sans-bengali/files/noto-sans-bengali-bengali-400-normal.woff2', weight: '400' }, { path: '../node_modules/@fontsource/noto-sans-bengali/files/noto-sans-bengali-bengali-600-normal.woff2', weight: '600' }], variable: '--font-bengali', display: 'swap', declarations: [{ prop: 'unicode-range', value: 'U+0951-0952,U+0964-0965,U+0980-09FE,U+1CD0,U+1CD2,U+1CD5-1CD6,U+1CD8,U+1CE1,U+1CEA,U+1CED,U+1CF2,U+1CF5-1CF7,U+200C-200D,U+20B9,U+25CC,U+A8F1' }], preload: false });
const tamil = localFont({ src: [{ path: '../node_modules/@fontsource/noto-sans-tamil/files/noto-sans-tamil-tamil-400-normal.woff2', weight: '400' }, { path: '../node_modules/@fontsource/noto-sans-tamil/files/noto-sans-tamil-tamil-600-normal.woff2', weight: '600' }], variable: '--font-tamil', display: 'swap', declarations: [{ prop: 'unicode-range', value: 'U+0964-0965,U+0B82-0BFA,U+200C-200D,U+20B9,U+25CC' }], preload: false });
const kannada = localFont({ src: [{ path: '../node_modules/@fontsource/noto-sans-kannada/files/noto-sans-kannada-kannada-400-normal.woff2', weight: '400' }, { path: '../node_modules/@fontsource/noto-sans-kannada/files/noto-sans-kannada-kannada-600-normal.woff2', weight: '600' }], variable: '--font-kannada', display: 'swap', declarations: [{ prop: 'unicode-range', value: 'U+0951-0952,U+0964-0965,U+0C80-0CF3,U+1CD0,U+1CD2-1CD3,U+1CDA,U+1CF2,U+1CF4,U+200C-200D,U+20B9,U+25CC,U+A830-A835' }], preload: false });
const malayalam = localFont({ src: [{ path: '../node_modules/@fontsource/noto-sans-malayalam/files/noto-sans-malayalam-malayalam-400-normal.woff2', weight: '400' }, { path: '../node_modules/@fontsource/noto-sans-malayalam/files/noto-sans-malayalam-malayalam-600-normal.woff2', weight: '600' }], variable: '--font-malayalam', display: 'swap', declarations: [{ prop: 'unicode-range', value: 'U+0307,U+0323,U+0951-0952,U+0964-0965,U+0D00-0D7F,U+1CDA,U+1CF2,U+200C-200D,U+20B9,U+25CC,U+A830-A832' }], preload: false });
const gujarati = localFont({ src: [{ path: '../node_modules/@fontsource/noto-sans-gujarati/files/noto-sans-gujarati-gujarati-400-normal.woff2', weight: '400' }, { path: '../node_modules/@fontsource/noto-sans-gujarati/files/noto-sans-gujarati-gujarati-600-normal.woff2', weight: '600' }], variable: '--font-gujarati', display: 'swap', declarations: [{ prop: 'unicode-range', value: 'U+0951-0952,U+0964-0965,U+0A80-0AFF,U+200C-200D,U+20B9,U+25CC,U+A830-A839' }], preload: false });
const gurmukhi = localFont({ src: [{ path: '../node_modules/@fontsource/noto-sans-gurmukhi/files/noto-sans-gurmukhi-gurmukhi-400-normal.woff2', weight: '400' }, { path: '../node_modules/@fontsource/noto-sans-gurmukhi/files/noto-sans-gurmukhi-gurmukhi-600-normal.woff2', weight: '600' }], variable: '--font-gurmukhi', display: 'swap', declarations: [{ prop: 'unicode-range', value: 'U+0951-0952,U+0964-0965,U+0A01-0A76,U+200C-200D,U+20B9,U+25CC,U+262C,U+A830-A839' }], preload: false });
const oriya = localFont({ src: [{ path: '../node_modules/@fontsource/noto-sans-oriya/files/noto-sans-oriya-oriya-400-normal.woff2', weight: '400' }, { path: '../node_modules/@fontsource/noto-sans-oriya/files/noto-sans-oriya-oriya-600-normal.woff2', weight: '600' }], variable: '--font-oriya', display: 'swap', declarations: [{ prop: 'unicode-range', value: 'U+0951-0952,U+0964-0965,U+0B01-0B77,U+1CDA,U+1CF2,U+200C-200D,U+20B9,U+25CC' }], preload: false });
const arabic = localFont({ src: [{ path: '../node_modules/@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff2', weight: '400' }, { path: '../node_modules/@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-600-normal.woff2', weight: '600' }], variable: '--font-arabic', display: 'swap', declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+102E0-102FB,U+10E60-10E7E,U+10EC2-10EC4,U+10EFC-10EFF,U+1EE00-1EE03,U+1EE05-1EE1F,U+1EE21-1EE22,U+1EE24,U+1EE27,U+1EE29-1EE32,U+1EE34-1EE37,U+1EE39,U+1EE3B,U+1EE42,U+1EE47,U+1EE49,U+1EE4B,U+1EE4D-1EE4F,U+1EE51-1EE52,U+1EE54,U+1EE57,U+1EE59,U+1EE5B,U+1EE5D,U+1EE5F,U+1EE61-1EE62,U+1EE64,U+1EE67-1EE6A,U+1EE6C-1EE72,U+1EE74-1EE77,U+1EE79-1EE7C,U+1EE7E,U+1EE80-1EE89,U+1EE8B-1EE9B,U+1EEA1-1EEA3,U+1EEA5-1EEA9,U+1EEAB-1EEBB,U+1EEF0-1EEF1' }], preload: false });
const fonts = [serif, sans, telugu, deva, bengali, tamil, kannada, malayalam, gujarati, gurmukhi, oriya, arabic]
  .map((f) => f.variable).join(' ');

export const metadata: Metadata = {
  title: { default: 'Vuaz', template: '%s · Vuaz' },
  description: 'Every public version of the news, side by side, with a link to each original. No summaries, no rankings.',
  applicationName: 'Vuaz',
  appleWebApp: { capable: true, title: 'Vuaz', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f1e8' },
    { media: '(prefers-color-scheme: dark)', color: '#15140f' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const lang = viewer.prefs.uiLanguage;
  // Light or dark when the reader picked one (components/ThemeToggle.tsx); otherwise the device decides.
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  return (
    <html lang={lang} dir={isRtl(lang) ? 'rtl' : 'ltr'} className={fonts}
      data-theme={theme === 'dark' || theme === 'light' ? theme : undefined}>
      <body>
        <Header lang={lang} signedIn={!!viewer.user} />
        <main id="main" className="container">{children}</main>
        <Footer lang={lang} />
        <ScrollMemory />
        <ViewCounter url={SUPABASE_URL} apiKey={SUPABASE_ANON_KEY} />
      </body>
    </html>
  );
}

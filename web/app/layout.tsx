import type { Metadata, Viewport } from 'next';
import {
  IBM_Plex_Sans, Newsreader, Noto_Naskh_Arabic, Noto_Sans_Bengali, Noto_Sans_Devanagari, Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi, Noto_Sans_Kannada, Noto_Sans_Malayalam, Noto_Sans_Oriya, Noto_Sans_Tamil, Noto_Sans_Telugu,
} from 'next/font/google';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { getViewer } from '@/lib/data';
import { isRtl } from '@/lib/i18n';
import './globals.css';

const serif = Newsreader({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-serif', display: 'swap' });
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans', display: 'swap' });
// One font per Indian script. Not preloaded: a browser only downloads the ones whose letters appear on the page.
// (next/font needs each call's options written out literally.)
const telugu = Noto_Sans_Telugu({ subsets: ['telugu'], weight: ['400', '600'], variable: '--font-telugu', display: 'swap', preload: false });
const deva = Noto_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400', '600'], variable: '--font-deva', display: 'swap', preload: false });
const bengali = Noto_Sans_Bengali({ subsets: ['bengali'], weight: ['400', '600'], variable: '--font-bengali', display: 'swap', preload: false });
const tamil = Noto_Sans_Tamil({ subsets: ['tamil'], weight: ['400', '600'], variable: '--font-tamil', display: 'swap', preload: false });
const kannada = Noto_Sans_Kannada({ subsets: ['kannada'], weight: ['400', '600'], variable: '--font-kannada', display: 'swap', preload: false });
const malayalam = Noto_Sans_Malayalam({ subsets: ['malayalam'], weight: ['400', '600'], variable: '--font-malayalam', display: 'swap', preload: false });
const gujarati = Noto_Sans_Gujarati({ subsets: ['gujarati'], weight: ['400', '600'], variable: '--font-gujarati', display: 'swap', preload: false });
const gurmukhi = Noto_Sans_Gurmukhi({ subsets: ['gurmukhi'], weight: ['400', '600'], variable: '--font-gurmukhi', display: 'swap', preload: false });
const oriya = Noto_Sans_Oriya({ subsets: ['oriya'], weight: ['400', '600'], variable: '--font-oriya', display: 'swap', preload: false });
const arabic = Noto_Naskh_Arabic({ subsets: ['arabic'], weight: ['400', '600'], variable: '--font-arabic', display: 'swap', preload: false });
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
  return (
    <html lang={lang} dir={isRtl(lang) ? 'rtl' : 'ltr'} className={fonts}>
      <body>
        <Header lang={lang} signedIn={!!viewer.user} />
        <main id="main" className="container">{children}</main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}

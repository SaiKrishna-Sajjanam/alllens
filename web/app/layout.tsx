import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, Newsreader, Noto_Sans_Telugu } from 'next/font/google';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { getViewer } from '@/lib/data';
import './globals.css';

const serif = Newsreader({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-serif', display: 'swap' });
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans', display: 'swap' });
const telugu = Noto_Sans_Telugu({ subsets: ['telugu'], weight: ['400', '600'], variable: '--font-telugu', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'All-Lens News', template: '%s · All-Lens' },
  description: 'Every public version of the news, side by side, with a link to each original. No summaries, no rankings.',
  applicationName: 'All-Lens',
  appleWebApp: { capable: true, title: 'All-Lens', statusBarStyle: 'default' },
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
    <html lang={lang} className={`${serif.variable} ${sans.variable} ${telugu.variable}`}>
      <body>
        <Header lang={lang} signedIn={!!viewer.user} />
        <main id="main" className="container">{children}</main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}

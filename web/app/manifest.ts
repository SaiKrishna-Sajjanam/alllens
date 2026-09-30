import type { MetadataRoute } from 'next';

/** Lets phones install the website as an app (home-screen icon, full screen). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vuaz',
    short_name: 'Vuaz',
    description: 'Every public version of the news, side by side, at your time.',
    start_url: '/feed',
    display: 'standalone',
    background_color: '#f5f1e8',
    theme_color: '#1d4e89',
    lang: 'en-IN',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

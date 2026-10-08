import Link from 'next/link';
import { placeName } from '@/lib/catalog';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';
import type { Sky, Weather } from '@/lib/weatherData';

/** Line icon for a kind of sky, same stroke style as components/Icons.tsx. */
export function SkyIcon({ sky, size = 22 }: { sky: Sky | null; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  const cloud = <path d="M7 18h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 11.5 3.3 3.3 0 0 0 7 18z" />;
  switch (sky) {
    case 'clear':
      return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
    case 'partly':
      return <svg {...p}><path d="M8 3v1.5M3.5 8H5M4.8 4.8l1 1M12 6.5A4 4 0 0 0 6.2 10" /><path d="M9 20h8a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.6A2.8 2.8 0 0 0 9 20z" /></svg>;
    case 'fog':
      return <svg {...p}><path d="M4 9h16M3 13h18M5 17h14" /></svg>;
    case 'rain':
    case 'heavyRain':
      return <svg {...p}><path d="M7 15h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 8.5 3.3 3.3 0 0 0 7 15z" /><path d={sky === 'rain' ? 'M9 18l-1 2M15 18l-1 2' : 'M8 18l-1 3M12 18l-1 3M16 18l-1 3'} /></svg>;
    case 'thunder':
      return <svg {...p}><path d="M7 15h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 8.5 3.3 3.3 0 0 0 7 15z" /><path d="M12 15l-2 4h3l-2 3" /></svg>;
    case 'snow':
      return <svg {...p}><path d="M7 15h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 8.5 3.3 3.3 0 0 0 7 15z" /><path d="M9 19h.01M12 21h.01M15 19h.01" /></svg>;
    default:
      return <svg {...p}>{cloud}</svg>;
  }
}

export const skyName = (sky: Sky | null, lang: Lang) => (sky ? t(lang, `sky.${sky}`) : '');

/** State tab: the weather at the reader's state capital, linking to every state's. */
export default function WeatherStrip({ state, weather, lang }: { state: string; weather: (Weather & { city: string }) | null; lang: Lang }) {
  if (!weather) return null;
  return (
    <Link href="/weather" className="weather-strip">
      <SkyIcon sky={weather.sky} />
      <span className="weather-now">{weather.now}°</span>
      <span className="weather-text">
        <span>{[skyName(weather.sky, lang), placeName(state, lang)].filter(Boolean).join(' · ')}</span>
        <span className="small muted">{t(lang, 'weather.range', { low: weather.low, high: weather.high })} · MET Norway</span>
      </span>
      <span className="weather-cta small">{t(lang, 'weather.allStates')} →</span>
    </Link>
  );
}

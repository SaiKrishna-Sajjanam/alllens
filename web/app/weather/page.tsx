import { placeName } from '@/lib/catalog';
import { getViewer } from '@/lib/data';
import { formatTime, t } from '@/lib/i18n';
import { allWeather } from '@/lib/weather';
import { SkyIcon, skyName } from '@/components/WeatherStrip';

export const metadata = { title: 'Weather' };

/** Every state's and union territory's capital, A to Z in the reader's language (all treated alike). */
export default async function WeatherPage() {
  const [viewer, all] = await Promise.all([getViewer(), allWeather()]);
  const lang = viewer.prefs.uiLanguage;
  const ids = Object.keys(all).sort((a, b) => placeName(a, lang).localeCompare(placeName(b, lang), lang));
  const updated = Object.values(all).map((w) => w?.updated).filter(Boolean).sort().at(-1);
  return (
    <div className="narrow stack-lg">
      <div className="stack">
        <h1>{t(lang, 'weather.pageTitle')}</h1>
        <p className="small muted">{t(lang, 'weather.note')}</p>
      </div>
      <ul className="weather-list">
        {ids.map((id) => {
          const w = all[id];
          return (
            <li key={id} className={id === viewer.prefs.state ? 'mine' : undefined}>
              <SkyIcon sky={w?.sky ?? null} />
              <span className="weather-text">
                <strong>{placeName(id, lang)}</strong>
                <span className="small muted">{w ? [w.city, skyName(w.sky, lang)].filter(Boolean).join(' · ') : t(lang, 'weather.unavailable')}</span>
              </span>
              {w && (
                <span className="weather-temps">
                  <strong>{w.now}°</strong>
                  <span className="small muted">{w.low}°–{w.high}°</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="small muted">
        {updated ? `${t(lang, 'weather.updated', { time: formatTime(updated, lang) })} · ` : ''}
        <a href="https://api.met.no/" target="_blank" rel="noopener noreferrer">{t(lang, 'weather.credit')}</a>
        {' · '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
      </p>
    </div>
  );
}

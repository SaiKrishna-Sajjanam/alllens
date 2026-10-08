import 'server-only';
import { SITE_URL } from './env';
import { publicCache } from './supabase/public';
import { CAPITALS, summarise, type Weather } from './weatherData';

// MET Norway asks every client to identify itself with a contact (a website is enough), to cache,
// and not to send many requests at once. Answers are kept 30 minutes; nothing about the reader is sent.
const USER_AGENT = `Vuaz/1.0 ${SITE_URL || 'https://github.com/SaiKrishna-Sajjanam/alllens'}`;

// A failure throws, so it is not kept: the next page view asks again.
const forecast = publicCache('weather-v1', async (lat: number, lon: number): Promise<Weather> => {
  const res = await fetch(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`,
    { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(6000), cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`MET Norway ${res.status}`);
  const w = summarise(await res.json());
  if (!w) throw new Error('MET Norway: no forecast');
  return w;
}, 1800);

/** Weather at a state's or union territory's capital, or null (unknown state, or MET Norway unreachable). */
export async function stateWeather(state: string): Promise<(Weather & { city: string }) | null> {
  const cap = CAPITALS[state];
  if (!cap) return null;
  try {
    return { ...(await forecast(cap.lat, cap.lon)), city: cap.city };
  } catch {
    return null;   // no weather is better than a slow or broken page
  }
}

/** Every state's and union territory's capital, four requests at a time. */
export async function allWeather(): Promise<Record<string, (Weather & { city: string }) | null>> {
  const ids = Object.keys(CAPITALS);
  const out: Record<string, (Weather & { city: string }) | null> = {};
  for (let i = 0; i < ids.length; i += 4) {
    const part = ids.slice(i, i + 4);
    const got = await Promise.all(part.map(stateWeather));
    part.forEach((id, k) => { out[id] = got[k]; });
  }
  return out;
}

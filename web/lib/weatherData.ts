// Weather at each state's and union territory's capital (never the reader's location), from MET Norway's
// Locationforecast (api.met.no, free, CC BY 4.0). Pure parts here; fetching is in lib/weather.ts.

/** Capital of each state/UT (places.json ids), coordinates to 4 decimals at most (MET Norway's rule). */
export const CAPITALS: Record<string, { city: string; lat: number; lon: number }> = {
  tg: { city: 'Hyderabad', lat: 17.385, lon: 78.4867 },
  ap: { city: 'Amaravati', lat: 16.5131, lon: 80.5165 },
  ar: { city: 'Itanagar', lat: 27.0844, lon: 93.6053 },
  as: { city: 'Dispur', lat: 26.1433, lon: 91.7898 },
  br: { city: 'Patna', lat: 25.5941, lon: 85.1376 },
  cg: { city: 'Raipur', lat: 21.2514, lon: 81.6296 },
  ga: { city: 'Panaji', lat: 15.4909, lon: 73.8278 },
  gj: { city: 'Gandhinagar', lat: 23.2156, lon: 72.6369 },
  hr: { city: 'Chandigarh', lat: 30.7333, lon: 76.7794 },
  hp: { city: 'Shimla', lat: 31.1048, lon: 77.1734 },
  jh: { city: 'Ranchi', lat: 23.3441, lon: 85.3096 },
  ka: { city: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  kl: { city: 'Thiruvananthapuram', lat: 8.5241, lon: 76.9366 },
  mp: { city: 'Bhopal', lat: 23.2599, lon: 77.4126 },
  mh: { city: 'Mumbai', lat: 19.076, lon: 72.8777 },
  mn: { city: 'Imphal', lat: 24.817, lon: 93.9368 },
  ml: { city: 'Shillong', lat: 25.5788, lon: 91.8933 },
  mz: { city: 'Aizawl', lat: 23.7271, lon: 92.7176 },
  nl: { city: 'Kohima', lat: 25.6751, lon: 94.1086 },
  od: { city: 'Bhubaneswar', lat: 20.2961, lon: 85.8245 },
  pb: { city: 'Chandigarh', lat: 30.7333, lon: 76.7794 },
  rj: { city: 'Jaipur', lat: 26.9124, lon: 75.7873 },
  sk: { city: 'Gangtok', lat: 27.3389, lon: 88.6065 },
  tn: { city: 'Chennai', lat: 13.0827, lon: 80.2707 },
  tr: { city: 'Agartala', lat: 23.8315, lon: 91.2868 },
  up: { city: 'Lucknow', lat: 26.8467, lon: 80.9462 },
  uk: { city: 'Dehradun', lat: 30.3165, lon: 78.0322 },
  wb: { city: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  an: { city: 'Sri Vijaya Puram', lat: 11.6234, lon: 92.7265 },
  ch: { city: 'Chandigarh', lat: 30.7333, lon: 76.7794 },
  dn: { city: 'Daman', lat: 20.3974, lon: 72.8328 },
  dl: { city: 'New Delhi', lat: 28.6139, lon: 77.209 },
  jk: { city: 'Srinagar', lat: 34.0837, lon: 74.7973 },
  la: { city: 'Leh', lat: 34.1526, lon: 77.5771 },
  ld: { city: 'Kavaratti', lat: 10.5669, lon: 72.642 },
  py: { city: 'Puducherry', lat: 11.9416, lon: 79.8083 },
};

/** The few kinds of weather we name (MET Norway has ~40 symbol codes; we convert them to these). */
export type Sky = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'heavyRain' | 'thunder' | 'snow';

/** MET Norway symbol code (e.g. "partlycloudy_day", "heavyrainshowersandthunder") -> our word. */
export function skyOf(code: string | null | undefined): Sky | null {
  const c = (code ?? '').replace(/_(day|night|polartwilight)$/, '');
  if (!c) return null;
  if (c.includes('thunder')) return 'thunder';
  if (c.includes('snow') || c.includes('sleet')) return 'snow';
  if (c.includes('heavyrain')) return 'heavyRain';
  if (c.includes('rain')) return 'rain';
  if (c === 'fog') return 'fog';
  if (c === 'cloudy') return 'cloudy';
  if (c === 'partlycloudy' || c === 'fair') return 'partly';
  if (c === 'clearsky') return 'clear';
  return null;
}

export interface Weather {
  /** Temperature now, °C, rounded. */
  now: number;
  sky: Sky | null;
  /** Lowest and highest temperature in the next 24 hours, °C, rounded. */
  low: number;
  high: number;
  /** When MET Norway made the forecast (ISO). */
  updated: string;
}

interface Step {
  time: string;
  data: {
    instant: { details: { air_temperature?: number } };
    next_1_hours?: { summary?: { symbol_code?: string } };
    next_6_hours?: { summary?: { symbol_code?: string } };
  };
}

/** Locationforecast "compact" JSON -> now, kind of sky, and the next 24 hours' low and high. */
export function summarise(json: unknown, now = new Date()): Weather | null {
  const props = (json as { properties?: { meta?: { updated_at?: string }; timeseries?: Step[] } })?.properties;
  const steps = (props?.timeseries ?? []).filter((s) => typeof s.data?.instant?.details?.air_temperature === 'number');
  if (!steps.length) return null;
  const end = now.getTime() + 24 * 3_600_000;
  const current = steps.find((s) => Date.parse(s.time) >= now.getTime() - 3_600_000) ?? steps[0];
  const day = steps.filter((s) => Date.parse(s.time) >= now.getTime() - 3_600_000 && Date.parse(s.time) <= end);
  const temps = (day.length ? day : [current]).map((s) => s.data.instant.details.air_temperature!);
  const symbol = current.data.next_1_hours?.summary?.symbol_code ?? current.data.next_6_hours?.summary?.symbol_code;
  return {
    now: Math.round(current.data.instant.details.air_temperature!),
    sky: skyOf(symbol),
    low: Math.round(Math.min(...temps)),
    high: Math.round(Math.max(...temps)),
    updated: props?.meta?.updated_at ?? current.time,
  };
}

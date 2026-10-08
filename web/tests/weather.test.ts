import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAPITALS, skyOf, summarise } from '../lib/weatherData';
import { STATE_IDS } from '../lib/names';

test('every state and union territory has a capital, coordinates within 4 decimals', () => {
  assert.deepEqual(Object.keys(CAPITALS).sort(), [...STATE_IDS].sort());
  for (const { lat, lon } of Object.values(CAPITALS)) {
    assert.equal(Number(lat.toFixed(4)), lat);
    assert.equal(Number(lon.toFixed(4)), lon);
  }
});

test('MET Norway symbol codes become a few plain words', () => {
  assert.equal(skyOf('clearsky_day'), 'clear');
  assert.equal(skyOf('fair_night'), 'partly');
  assert.equal(skyOf('partlycloudy_day'), 'partly');
  assert.equal(skyOf('cloudy'), 'cloudy');
  assert.equal(skyOf('lightrainshowers_day'), 'rain');
  assert.equal(skyOf('heavyrain'), 'heavyRain');
  assert.equal(skyOf('rainandthunder'), 'thunder');
  assert.equal(skyOf('lightsleet'), 'snow');
  assert.equal(skyOf(undefined), null);
});

test('summarise: temperature now, sky now, low and high over the next 24 hours', () => {
  const now = new Date('2026-10-08T06:00:00Z');
  const step = (h: number, temp: number, symbol?: string) => ({
    time: new Date(now.getTime() + h * 3_600_000).toISOString(),
    data: { instant: { details: { air_temperature: temp } }, ...(symbol ? { next_1_hours: { summary: { symbol_code: symbol } } } : {}) },
  });
  const json = { properties: { meta: { updated_at: '2026-10-08T05:30:00Z' },
    timeseries: [step(-2, 20), step(0, 30.6, 'partlycloudy_day'), step(6, 33.2), step(12, 24.4), step(30, 10)] } };
  assert.deepEqual(summarise(json, now), { now: 31, sky: 'partly', low: 24, high: 33, updated: '2026-10-08T05:30:00Z' });
  assert.equal(summarise({}, now), null);
});

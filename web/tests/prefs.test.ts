import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { districtsOf } from '../lib/catalog';
import { DEFAULT_PREFS, MAX_PLACES, cleanPrefs, decodePrefsCookie, encodePrefsCookie, prefsFromProfile, profileFromPrefs } from '../lib/prefs';

test('unknown or hostile values fall back to safe defaults', () => {
  const p = cleanPrefs({
    topics: ['politics', 'not-a-topic', 42, 'politics'],
    places: ['tg-warangal', 'tg', 'mars'],
    languages: ['xx'],
    uiLanguage: 'fr',
    catchupTime: '25:99',
    aiAssistant: 'javascript:alert(1)',
    feedSort: 'popularity',
    customTopics: ['  Infosys  ', 'x', 'a'.repeat(100)],
    hideCrime: 'yes',
  });
  assert.deepEqual(p.topics, ['politics']);
  assert.deepEqual(p.places, ['tg-warangal']);
  assert.deepEqual(p.languages, ['en']);
  assert.equal(p.uiLanguage, 'en');
  assert.equal(p.catchupTime, DEFAULT_PREFS.catchupTime);
  assert.equal(p.aiAssistant, 'chatgpt');
  assert.equal(p.feedSort, 'sources');
  assert.deepEqual(p.customTopics, ['Infosys']);
  assert.equal(p.hideCrime, false);
});

test('cookie and profile round trips keep choices', () => {
  const p = cleanPrefs({ topics: ['sports'], languages: ['te', 'en'], places: ['tg-hyderabad'], catchupTime: '07:15', uiLanguage: 'te' });
  assert.deepEqual(decodePrefsCookie(encodePrefsCookie(p)), p);
  assert.equal(decodePrefsCookie('%%%not-json'), null);
  const row = profileFromPrefs('u1', p);
  assert.deepEqual(prefsFromProfile({ ...row, catchup_time: '07:15:00' }), p);
});

test('"All" districts are kept, within the database limit', () => {
  const all = districtsOf('tg').map((d) => d.id);
  const p = cleanPrefs({ places: all });
  assert.deepEqual(p.places, all);
  assert.deepEqual(decodePrefsCookie(encodePrefsCookie(p))?.places, all);
  const migration = readFileSync(new URL('../../supabase/migrations/20261001000300_places_limit.sql', import.meta.url), 'utf8');
  assert.match(migration, new RegExp(`cardinality\\(places\\) <= ${MAX_PLACES}\\b`));
});

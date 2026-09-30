import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LANGUAGES } from '../lib/catalog';
import { DEFAULT_PREFS, cleanPrefs, decodePrefsCookie, encodePrefsCookie, prefsFromProfile, profileFromPrefs } from '../lib/prefs';

test('unknown or hostile values fall back to safe defaults', () => {
  const p = cleanPrefs({
    topics: ['politics', 'not-a-topic', 42, 'politics'],
    state: 'tg-warangal',
    languages: ['xx'],
    uiLanguage: 'fr',
    aiAssistant: 'javascript:alert(1)',
    feedSort: 'popularity',
    customTopics: ['  Infosys  ', 'x', 'a'.repeat(100)],
    hideCrime: 'yes',
  });
  assert.deepEqual(p.topics, ['politics']);
  assert.equal(p.state, '', 'a district is not a state; no state until the reader picks one');
  assert.deepEqual(p.languages, ['en']);
  assert.equal(p.uiLanguage, 'en');
  assert.equal(p.aiAssistant, 'chatgpt');
  assert.equal(p.feedSort, 'sources');
  assert.deepEqual(p.customTopics, ['Infosys']);
  assert.equal(p.hideCrime, false);
});

test('cookie and profile round trips keep choices', () => {
  const p = cleanPrefs({ topics: ['sports'], languages: ['te', 'en'], state: 'kl', uiLanguage: 'te' });
  assert.deepEqual(decodePrefsCookie(encodePrefsCookie(p)), p);
  assert.equal(decodePrefsCookie('%%%not-json'), null);
  const row = profileFromPrefs('u1', p);
  assert.deepEqual(prefsFromProfile(row), p);
});

test('any state or union territory, all alike, none by default; any interface language', () => {
  assert.equal(DEFAULT_PREFS.state, '', 'no state is preferred');
  const tn = cleanPrefs({ state: 'tn', uiLanguage: 'ta' });
  assert.equal(tn.state, 'tn');
  assert.equal(tn.uiLanguage, 'ta');
  assert.equal(cleanPrefs({ state: 'dl' }).state, 'dl');
  assert.equal(cleanPrefs({ state: 'atlantis' }).state, '');
  assert.equal(cleanPrefs({ uiLanguage: 'ur' }).uiLanguage, 'ur');
  assert.ok(!('places' in tn), 'no district level');
  assert.deepEqual(profileFromPrefs('u1', tn).places, [], 'the old column is kept empty');
});

test('news in every language we collect; "All" keeps them all', () => {
  const codes = LANGUAGES.map((l) => l.code);
  assert.ok(codes.length >= 13 && codes[0] === 'en');
  assert.deepEqual(cleanPrefs({ languages: codes }).languages, codes);
});

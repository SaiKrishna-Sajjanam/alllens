import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_PREFS, cleanPrefs, decodePrefsCookie, encodePrefsCookie, prefsFromProfile, profileFromPrefs } from '../lib/prefs';
import { titleHash } from '../lib/titlehash';
import { TOPICS } from '../lib/catalog';

test('unknown or hostile values fall back to safe defaults', () => {
  const p = cleanPrefs({
    state: 'tg-warangal',
    uiLanguage: 'fr',
    aiAssistant: 'javascript:alert(1)',
    feedSort: 'popularity',
    hideCrime: 'yes',
  });
  assert.equal(p.state, '', 'a district is not a state; no state until the reader picks one');
  assert.equal(p.uiLanguage, 'en');
  assert.equal(p.aiAssistant, 'chatgpt');
  assert.equal(p.feedSort, 'latest');
  assert.equal(p.hideCrime, false);
});

test('nothing saved narrows the news: old topic, language and source-kind choices are dropped', () => {
  const old = cleanPrefs({ topics: ['sports'], customTopics: ['Infosys'], languages: ['te'], sourceTypes: ['tv'], state: 'kl' });
  assert.deepEqual(Object.keys(old).sort(), ['aiAssistant', 'feedSort', 'hideCrime', 'state', 'topicOrder', 'uiLanguage']);
  assert.equal(old.state, 'kl');
  const row = profileFromPrefs('u1', old);
  assert.deepEqual([row.topics, row.custom_topics, row.languages, row.source_types], [[], [], [], []]);
});

test('cookie and profile round trips keep choices', () => {
  const p = cleanPrefs({ state: 'kl', uiLanguage: 'te', hideCrime: true });
  assert.deepEqual(decodePrefsCookie(encodePrefsCookie(p)), p);
  assert.equal(decodePrefsCookie('%%%not-json'), null);
  assert.deepEqual(prefsFromProfile(profileFromPrefs('u1', p)), p);
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

test('headline wording check matches the pipeline (pipeline/translate.py title_hash)', () => {
  assert.equal(titleHash('హైదరాబాద్‌లో భారీ వర్షం'), '550051f53119');
});

test('topic order: the reader’s order first, every topic exactly once, unknown ids dropped', () => {
  const all = TOPICS.map((x) => x.id);
  assert.deepEqual(cleanPrefs({}).topicOrder, all);
  const p = cleanPrefs({ topicOrder: ['space', 'sports', 'space', 'nonsense', 42] });
  assert.deepEqual(p.topicOrder.slice(0, 2), ['space', 'sports']);
  assert.deepEqual([...p.topicOrder].sort(), [...all].sort());
  assert.deepEqual(prefsFromProfile(profileFromPrefs('u1', p)).topicOrder, p.topicOrder);
});

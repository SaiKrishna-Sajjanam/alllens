import assert from 'node:assert/strict';
import { test } from 'node:test';
import { districtsOf, groupsOf, PLACES } from '../lib/catalog';
import { formatTime, t } from '../lib/i18n';

test('every English string has a Telugu version with the same placeholders', async () => {
  const src = await import('../lib/i18n');
  const keys = ['brand', 'feed.sources', 'story.count', 'ai.copied', 'following.newSince', 'story.wire'] as const;
  for (const k of keys) {
    const en = t('en', k, { n: 1, s: 2, name: 'X', source: 'Y', time: 'Z', email: 'E' });
    const te = t('te', k, { n: 1, s: 2, name: 'X', source: 'Y', time: 'Z', email: 'E' });
    assert.ok(!/\{\w+\}/.test(en) && !/\{\w+\}/.test(te), `${k} placeholders filled`);
  }
  assert.ok(src.isLang('te') && !src.isLang('fr'));
});

test('dates show in India time', () => {
  assert.match(formatTime('2026-09-29T15:15:00Z', 'en'), /29 Sept?,? 8:45\s?pm/i);
});

test('Telangana has 33 districts, Hyderabad listed first', () => {
  const d = districtsOf('tg');
  assert.equal(d.length, 33);
  assert.equal(d[0].id, 'tg-hyderabad');
  assert.ok(PLACES.every((p) => p.te && p.en));
});

test('source kinds', () => {
  assert.deepEqual(groupsOf('tv_digital'), ['tv', 'digital']);
  assert.deepEqual(groupsOf('newspaper_tv'), ['newspaper', 'tv']);
  assert.deepEqual(groupsOf('community'), ['community']);
  assert.deepEqual(groupsOf('tv_video'), ['tv', 'video'], 'a TV channel on YouTube');
  assert.deepEqual(groupsOf('government_video'), ['video', 'government']);
  assert.deepEqual(groupsOf(null), ['digital']);
});

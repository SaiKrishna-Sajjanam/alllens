import assert from 'node:assert/strict';
import { test } from 'node:test';
import { translateUrl } from '../lib/translate';

test('"Translate" hands the original link to Google Translate, only when the language differs', () => {
  const url = 'https://www.thehindu.com/news/national/some-story/article1.ece?x=1&y=2';
  const link = translateUrl(url, 'en', 'te')!;
  assert.ok(link.startsWith('https://translate.google.com/translate?'));
  const q = new URL(link).searchParams;
  assert.equal(q.get('tl'), 'te');
  assert.equal(q.get('sl'), 'auto');
  assert.equal(q.get('u'), url, 'the original address, unchanged');
  assert.equal([...q.keys()].length, 3, 'nothing else is added (no text of ours)');

  assert.equal(translateUrl(url, 'te', 'te'), null, 'already in the reader language');
  assert.equal(translateUrl('javascript:alert(1)', 'en', 'te'), null);
  assert.ok(translateUrl(url, null, 'hi'), 'unknown article language: offer it');
});

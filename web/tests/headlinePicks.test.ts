import assert from 'node:assert/strict';
import { test } from 'node:test';
import { headlinePicks } from '../lib/feed';
import type { Article } from '../lib/types';

const art = (id: string, source: string, language: string, hour: number, title = `Headline ${id}`): Article => ({
  id, source_id: source, title, snippet: null, url: `https://${source}.test/${id}`,
  published_at: `2026-10-08T${String(hour).padStart(2, '0')}:00:00Z`, fetched_at: '2026-10-08T23:00:00Z',
  title_updated_at: null, language, wire_key: null, primary_place: null, sources: null,
});

test('headlinePicks: earliest per language first, then other outlets, one each, no repeated headline', () => {
  const list = [
    art('a', 'hindu', 'en', 1), art('b', 'hindu', 'en', 2), art('c', 'eenadu', 'te', 3),
    art('d', 'ndtv', 'en', 4, 'Headline a'), art('e', 'toi', 'en', 5), art('f', 'aajtak', 'hi', 9), art('g', 'mint', 'en', 6),
  ];
  // en (a), te (c), hi (f) first; then the earliest other outlet: d repeats a's headline, so e.
  assert.deepEqual(headlinePicks(list).map((x) => x.id), ['a', 'c', 'e', 'f']);
  assert.deepEqual(headlinePicks(list, 2).map((x) => x.id), ['a', 'c']);
  assert.deepEqual(headlinePicks([art('x', 's', 'en', 1)]).map((x) => x.id), ['x']);
});

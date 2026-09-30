import assert from 'node:assert/strict';
import { test } from 'node:test';
import { districtsOf } from '../lib/catalog';
import { demoData } from '../lib/demo';
import {
  districtFilter, filterArticles, inTab, matchesInterests, normaliseTab, pickLabel, seededShuffle, sortArticles,
  sortStories, tabsFor, toggleCompare, wireCounts,
} from '../lib/feed';
import { DEFAULT_PREFS } from '../lib/prefs';
import type { Article, Prefs, Story } from '../lib/types';

const { stories, articles } = demoData(Date.parse('2026-10-01T12:00:00Z'));
const prefs: Prefs = { ...DEFAULT_PREFS, languages: ['en', 'te'], places: ['tg-hyderabad', 'tg-karimnagar'] };
const byId = (id: string) => stories.find((s) => s.id === id)!;

test('tabs: International, National (all India), State narrowed by chosen districts', () => {
  const world: Story = { ...byId('demo-kohli'), id: 'w', places: [], scope: 'international' };
  assert.deepEqual(tabsFor(prefs, 'en', { international: 'I', national: 'N' }).map((x) => x.id), ['international', 'national', 'state']);
  assert.equal(normaliseTab('india'), 'national', 'old links still work');
  assert.equal(normaliseTab('tg-hyderabad'), 'national', 'districts are no longer tabs');

  assert.ok(inTab(world, 'international', prefs));
  assert.ok(!inTab(world, 'national', prefs) && !inTab(world, 'state', prefs));
  for (const s of stories) assert.ok(inTab(s, 'national', prefs) && !inTab(s, 'international', prefs), `${s.id} is Indian news`);

  // Chosen districts (Hyderabad, Karimnagar) narrow the State tab.
  assert.ok(inTab(byId('demo-alwal'), 'state', prefs));
  assert.ok(inTab(byId('demo-cmtour'), 'state', prefs));
  assert.ok(!inTab(byId('demo-power'), 'state', prefs), 'state-wide story outside the chosen districts');
  assert.ok(!inTab(byId('demo-kathua'), 'state', prefs));
  // None chosen, or all chosen: the whole state.
  const whole = [{ ...prefs, places: [] }, { ...prefs, places: districtsOf('tg').map((d) => d.id) }];
  for (const p of whole) {
    assert.deepEqual(districtFilter(p), []);
    assert.ok(inTab(byId('demo-power'), 'state', p));
    assert.ok(!inTab(byId('demo-kathua'), 'state', p));
  }
});

test('interests: topics, own words, languages, crime filter are the reader\'s choice', () => {
  const custom = new Set<string>();
  const politics = { ...prefs, topics: ['politics'] };
  assert.ok(matchesInterests(byId('demo-cwc'), politics, custom, false));
  assert.ok(!matchesInterests(byId('demo-kohli'), politics, custom, false));
  assert.ok(matchesInterests(byId('demo-kohli'), politics, custom, true), 'show all topics');
  assert.ok(matchesInterests(byId('demo-kohli'), politics, new Set(['demo-kohli']), false), 'own interest match');
  assert.ok(!matchesInterests(byId('demo-alwal'), { ...prefs, hideCrime: true }, custom, true));
  assert.ok(!matchesInterests(byId('demo-alwal'), { ...prefs, languages: ['en'] }, custom, true), 'Telugu-only story, English reader');
  assert.ok(matchesInterests(byId('demo-kathua'), { ...prefs, languages: ['en'] }, custom, true));
  assert.ok(!matchesInterests(byId('demo-kohli'), { ...prefs, sourceTypes: ['newspaper'] }, custom, true));
  assert.ok(matchesInterests(byId('demo-kohli'), { ...prefs, sourceTypes: ['tv'] }, custom, true));
});

test('feed order is mechanical: sources, latest, or a stable random', () => {
  const bySources = sortStories(stories, 'sources', 'x');
  for (let i = 1; i < bySources.length; i++) assert.ok(bySources[i - 1].source_count >= bySources[i].source_count);
  const latest = sortStories(stories, 'latest', 'x');
  for (let i = 1; i < latest.length; i++) {
    assert.ok(Date.parse(latest[i - 1].last_article_at!) >= Date.parse(latest[i].last_article_at!));
  }
  assert.deepEqual(sortStories(stories, 'random', 'seed-1').map((s) => s.id), sortStories(stories, 'random', 'seed-1').map((s) => s.id));
  assert.notDeepEqual(seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 'a'), seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 'b'));
  assert.equal(new Set(sortStories(stories, 'random', 'z').map((s) => s.id)).size, stories.length);
});

test('story label is a source headline, in the reader language when available', () => {
  const kathua = byId('demo-kathua');
  const en = pickLabel(kathua, ['en']);
  assert.equal(en.source_name, 'ThePrint');
  const te = pickLabel(kathua, ['te', 'en']);
  assert.equal(te.source_name, 'NTV Telugu');
  const texts = articles.map((a) => a.title);
  assert.ok(texts.includes(en.title) && texts.includes(te.title), 'labels are unchanged headlines');
});

test('article filters, order and compare selection', () => {
  const kathua = articles.filter((a) => a.story_id === 'demo-kathua');
  assert.equal(filterArticles(kathua, 'tv', 'all').length, 1);
  assert.equal(filterArticles(kathua, 'all', 'te').length, 1);
  const earliest = sortArticles(kathua, 'earliest', 's');
  assert.equal(earliest[0].sources?.name, 'ThePrint');
  assert.equal(sortArticles(kathua, 'latest', 's')[0].sources?.name, 'NTV Telugu');
  assert.deepEqual(toggleCompare(['a', 'b', 'c'], 'd'), ['a', 'b', 'c'], 'max 3');
  assert.deepEqual(toggleCompare(['a', 'b'], 'a'), ['b']);
});

test('wire copies are counted mechanically', () => {
  const base = articles[0];
  const three: Article[] = [
    { ...base, id: '1', wire_key: 'k' }, { ...base, id: '2', wire_key: 'k' }, { ...base, id: '3', wire_key: null },
  ];
  const w = wireCounts(three);
  assert.equal(w.get('1'), 1);
  assert.equal(w.get('2'), 1);
  assert.equal(w.get('3'), undefined);
});

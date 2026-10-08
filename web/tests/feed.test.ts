import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sectionOf } from '../lib/catalog';
import { demoData } from '../lib/demo';
import {
  bySection,
  isNew,
  filterArticles, inTab, labelLanguage, matchesFilters, normaliseTab, normaliseTopic, pickLabel, seededShuffle, sortArticles,
  sortStories, tabsFor, toggleCompare, wireCounts,
} from '../lib/feed';
import { DEFAULT_PREFS } from '../lib/prefs';
import type { Article, Prefs, Story } from '../lib/types';

const { stories, articles } = demoData(Date.parse('2026-10-01T12:00:00Z'));
const prefs: Prefs = { ...DEFAULT_PREFS, state: 'tg' };
const byId = (id: string) => stories.find((s) => s.id === id)!;

test('tabs: International, National (all India), State (any state, all alike; none until chosen)', () => {
  const world: Story = { ...byId('demo-kohli'), id: 'w', places: [], scope: 'international' };
  const labels = { international: 'I', national: 'N', state: 'Your state' };
  assert.deepEqual(tabsFor(prefs, 'en', labels).map((x) => x.id), ['international', 'national', 'state']);
  assert.equal(tabsFor(prefs, 'en', labels)[2].label, 'Telangana');
  assert.equal(tabsFor({ ...prefs, state: '' }, 'en', labels)[2].label, 'Your state');
  assert.equal(normaliseTab('india'), 'national', 'old links still work');
  assert.equal(normaliseTab('tg-hyderabad'), 'national', 'districts are no longer tabs');

  assert.ok(inTab(world, 'international', prefs));
  assert.ok(!inTab(world, 'national', prefs) && !inTab(world, 'state', prefs));
  for (const s of stories) assert.ok(inTab(s, 'national', prefs) && !inTab(s, 'international', prefs), `${s.id} is Indian news`);

  // The whole state, one level only.
  for (const id of ['demo-alwal', 'demo-cmtour', 'demo-power']) assert.ok(inTab(byId(id), 'state', prefs), id);
  assert.ok(!inTab(byId('demo-kathua'), 'state', prefs));
  // Switching state switches the tab; no state chosen shows nothing there yet.
  assert.ok(inTab(byId('demo-kathua'), 'state', { ...prefs, state: 'jk' }));
  assert.ok(!inTab(byId('demo-alwal'), 'state', { ...prefs, state: 'jk' }));
  assert.ok(!stories.some((s) => inTab(s, 'state', { ...prefs, state: '' })));
});

test('the same news for everyone: only a tapped topic button and the optional hide-crime narrow it', () => {
  // Every story shows for every reader, whatever language its sources wrote in.
  for (const s of stories) assert.ok(matchesFilters(s, DEFAULT_PREFS, null), s.id);
  assert.ok(matchesFilters(byId('demo-alwal'), DEFAULT_PREFS, null), 'Telugu-only story, any reader');
  // Topic buttons: this visit only (from the URL); unknown ones mean All.
  assert.ok(matchesFilters(byId('demo-cwc'), prefs, 'politics'));
  assert.ok(!matchesFilters(byId('demo-kohli'), prefs, 'politics'));
  assert.equal(normaliseTopic('politics'), 'politics');
  assert.equal(normaliseTopic('not-a-topic'), null);
  assert.equal(normaliseTopic(undefined), null);
  // Hide crime (and accidents) is the reader's own comfort choice, off by default.
  assert.equal(DEFAULT_PREFS.hideCrime, false);
  assert.ok(!matchesFilters(byId('demo-alwal'), { ...prefs, hideCrime: true }, null));
  const crash = { ...byId('demo-kohli'), topics: ['accidents'] };
  assert.ok(!matchesFilters(crash, { ...prefs, hideCrime: true }, null), 'hide crime also hides accidents');
  assert.ok(matchesFilters(crash, { ...prefs, hideCrime: true }, 'accidents'), 'tapping Accidents shows them');
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

test('story label: a source headline written in the app language, else the earliest (then shown translated)', () => {
  const kathua = byId('demo-kathua');
  const en = pickLabel(kathua, 'en');
  assert.equal(en.source_name, 'ThePrint');
  const te = pickLabel(kathua, 'te');
  assert.equal(te.source_name, 'NTV Telugu', 'a Telugu reader gets the Telugu outlet own headline');
  assert.equal(labelLanguage(kathua, te), 'te');
  const ta = pickLabel(kathua, 'ta');
  assert.equal(ta.source_name, 'ThePrint', 'no Tamil report: the earliest headline, which the page translates');
  assert.equal(labelLanguage(kathua, ta), 'en');
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

test('New: for 60 minutes after Vuaz first collected the story', () => {
  const now = Date.parse('2026-10-07T12:00:00Z');
  const story = (at: string | null) => ({ created_at: at, first_published_at: '2026-10-07T02:00:00Z' }) as Story;
  assert.equal(isNew(story('2026-10-07T11:05:00Z'), now), true, 'collected 55 minutes ago');
  assert.equal(isNew(story('2026-10-07T10:59:00Z'), now), false, 'collected 61 minutes ago');
  assert.equal(isNew(story('2026-10-07T12:10:00Z'), now), false, 'a time in the future is not trusted');
  assert.equal(isNew(story(null), now), false);
});

test('story page sections: each report in exactly one section, sections in a fixed order', () => {
  assert.equal(sectionOf('tv_video'), 'video', 'a TV channel’s YouTube feed is listed under YouTube');
  assert.equal(sectionOf('newspaper_tv'), 'newspaper');
  assert.equal(sectionOf('tv_digital'), 'tv');
  assert.equal(sectionOf('business'), 'digital');
  assert.equal(sectionOf('community'), 'community');
  const a = (id: string, type: string) => ({ id, sources: { type } }) as Article;
  const sections = bySection([a('1', 'tv_video'), a('2', 'digital'), a('3', 'newspaper'), a('4', 'tv')]);
  assert.deepEqual(sections.map(([g, list]) => [g, list.map((x) => x.id)]),
    [['newspaper', ['3']], ['tv', ['4']], ['digital', ['2']], ['video', ['1']]]);
});

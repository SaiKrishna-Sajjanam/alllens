import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { STATE_IDS, TOPIC_IDS, NAME_TABLES } from '../lib/names';
import { PLACES, TOPICS } from '../lib/catalog';
import { UI_LANGUAGES } from '../lib/i18n';

// Parse the dictionaries straight from the source so a missing key or a mismatched
// {placeholder} is caught even though TypeScript also checks keys.
const src = readFileSync(new URL('../lib/i18n.ts', import.meta.url), 'utf8');
const block = (text: string, name: string) => text.split(`const ${name}`)[1].split('\n};')[0];
const entries = (b: string) =>
  Object.fromEntries([...b.matchAll(/^\s*'?([\w.]+)'?:\s*'((?:[^'\\]|\\.)*)'/gm)].map((m) => [m[1], m[2]]));
const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const en = entries(block(src, 'en'));
const dicts: Record<string, Record<string, string>> = { te: entries(block(src, 'te')) };
const localeDir = new URL('../lib/locales/', import.meta.url);
for (const f of readdirSync(localeDir)) {
  const code = f.replace(/\.ts$/, '');
  dicts[code] = entries(block(readFileSync(new URL(f, localeDir), 'utf8'), code));
}

test('every interface language has every English key, with the same placeholders', () => {
  assert.ok(Object.keys(en).length > 150);
  assert.deepEqual(Object.keys(dicts).sort(), UI_LANGUAGES.map((l) => l.code).filter((c) => c !== 'en').sort());
  for (const [code, d] of Object.entries(dicts)) {
    assert.deepEqual(Object.keys(d).sort(), Object.keys(en).sort(), `${code}: keys differ from English`);
    for (const k of Object.keys(en)) {
      assert.deepEqual(ph(d[k]), ph(en[k]), `${code}: placeholders differ in ${k}`);
      assert.ok(d[k].length > 0, `${code}: empty text for ${k}`);
    }
  }
});

test('the database accepts exactly the interface languages', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261001000400_ui_languages.sql', import.meta.url), 'utf8');
  const allowed = [...sql.matchAll(/'(\w\w)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(allowed, UI_LANGUAGES.map((l) => l.code).sort());
});

test('state and topic names cover every state/UT and topic, in every extra language', () => {
  assert.deepEqual([...STATE_IDS].sort(), PLACES.filter((p) => p.kind === 'state').map((p) => p.id).sort());
  assert.deepEqual([...TOPIC_IDS].sort(), TOPICS.map((x) => x.id).sort());
  for (const [lang, names] of Object.entries(NAME_TABLES.STATES)) assert.equal(names.length, STATE_IDS.length, lang);
  for (const [lang, names] of Object.entries(NAME_TABLES.TOPICS)) assert.equal(names.length, TOPIC_IDS.length, lang);
});

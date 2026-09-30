import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Parse the dictionaries straight from the source so a missing Telugu key or
// a mismatched {placeholder} is caught even though TypeScript also checks keys.
const src = readFileSync(new URL('../lib/i18n.ts', import.meta.url), 'utf8');
const block = (name: string) => src.split(`const ${name}`)[1].split('\n};')[0];
const entries = (b: string) =>
  Object.fromEntries([...b.matchAll(/^\s*'?([\w.]+)'?:\s*'((?:[^'\\]|\\.)*)'/gm)].map((m) => [m[1], m[2]]));

test('Telugu dictionary matches English keys and placeholders', () => {
  const en = entries(block('en'));
  const te = entries(block('te'));
  assert.ok(Object.keys(en).length > 150);
  assert.deepEqual(Object.keys(te).sort(), Object.keys(en).sort());
  for (const k of Object.keys(en)) {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(ph(te[k]), ph(en[k]), `placeholders differ in ${k}`);
    assert.ok(te[k].length > 0, `empty Telugu text for ${k}`);
  }
});

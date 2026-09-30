import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tidySetting } from '../lib/env';

test('settings pasted into a dashboard are tidied: line breaks, spaces, quotes, NAME=', () => {
  const url = 'https://abcd.supabase.co';
  assert.equal(tidySetting('X', `${url}\r`), url);
  assert.equal(tidySetting('X', ` ${url} \n`), url);
  assert.equal(tidySetting('X', `"${url}"`), url);
  assert.equal(tidySetting('X', `'${url}'`), url);
  assert.equal(tidySetting('NEXT_PUBLIC_SUPABASE_URL', `NEXT_PUBLIC_SUPABASE_URL=${url}`), url);
  assert.equal(tidySetting('X', undefined), '');
  assert.equal(tidySetting('X', url), url, 'a clean value is unchanged');
});

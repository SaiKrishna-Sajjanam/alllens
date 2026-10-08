import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NAME_MAX, cleanName, greetingKey, suggestedName } from '../lib/displayName';

test('cleanName tidies spaces, drops control characters and keeps at most 40 letters', () => {
  assert.equal(cleanName('  Sai   Krishna \n'), 'Sai Krishna');
  assert.equal(cleanName('Sai\u0000Krishna'), 'Sai Krishna');
  assert.equal(cleanName('   '), null);
  assert.equal(cleanName(42), null);
  assert.equal(cleanName('సాయి కృష్ణ'), 'సాయి కృష్ణ');
  assert.equal([...(cleanName('a'.repeat(60)) ?? '')].length, NAME_MAX);
});

test('suggestedName uses the name Google shares, else the email before "@"', () => {
  assert.equal(suggestedName({ full_name: 'Sai Krishna' }, 'sai@example.com'), 'Sai Krishna');
  assert.equal(suggestedName({ name: ' Ravi ' }, 'ravi@example.com'), 'Ravi');
  assert.equal(suggestedName({}, 'reader.one@example.com'), 'reader.one');
  assert.equal(suggestedName(null, null), '');
});

test('greetingKey: welcome first, welcome back after hours away, otherwise the time of day (India)', () => {
  const evening = new Date('2026-10-08T14:00:00Z');   // 19:30 in India
  const morning = new Date('2026-10-08T03:30:00Z');   // 09:00 in India
  const hoursAgo = (h: number, from: Date) => new Date(from.getTime() - h * 3_600_000).toISOString();
  assert.equal(greetingKey('Sai', null, evening), 'feed.welcomeName');
  assert.equal(greetingKey('Sai', hoursAgo(7, evening), evening), 'feed.welcomeBackName');
  assert.equal(greetingKey('Sai', hoursAgo(1, evening), evening), 'feed.eveningName');
  assert.equal(greetingKey('Sai', hoursAgo(1, morning), morning), 'feed.morningName');
  // Guests and readers without a name keep the plain greeting.
  assert.equal(greetingKey(null, null, evening), 'feed.evening');
  assert.equal(greetingKey(null, hoursAgo(30, morning), morning), 'feed.morning');
});

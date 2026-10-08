import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ownKind } from '../lib/ownKind';

test("ownKind reads the outlet's own mark from its web address or feed categories", () => {
  // Web addresses seen in live feeds (2026-10-08).
  assert.equal(ownKind('https://www.thehindu.com/opinion/op-ed/ai-companions/article1.ece', ['Comment']), 'opinion');
  assert.equal(ownKind('https://telanganatoday.com/editorial-raising-repo-rate', []), 'editorial');
  assert.equal(ownKind('https://www.aajtak.in/opinion-analysis-/story/rbi-repo-rate', []), 'opinion');
  assert.equal(ownKind('https://www.ntnews.com/editorial/congress-accused', ['News']), 'editorial');
  assert.equal(ownKind('https://www.kannadaprabha.com/columns/2026/Oct/08/debt', ['ಅಂಕಣಗಳು']), 'opinion');
  assert.equal(ownKind('https://example.com/story', ['Analysis']), 'analysis');
  // News reports carry no mark; a word inside a headline's web address is not a section.
  assert.equal(ownKind('https://www.ntnews.com/telangana/bc-welfare-demands-obc-column-in-census-25310', ['News']), null);
  assert.equal(ownKind('https://example.com/india/opinion-poll-shows-lead', []), null);
  assert.equal(ownKind('not a url', null), null);
});

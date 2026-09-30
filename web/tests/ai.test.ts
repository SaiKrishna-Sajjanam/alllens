import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AI_ASSISTANTS, askTarget, linksText } from '../lib/ai';

const urls = ['https://theprint.in/a', 'https://ntvtelugu.com/b'];

test('only the links are handed over, never a prompt of ours', () => {
  for (const a of AI_ASSISTANTS) {
    const target = askTarget(a.id, urls);
    assert.equal(target.text, urls.join('\n'));
    if (target.href && a.prefill) {
      const q = new URL(target.href).searchParams.get('q');
      assert.equal(q, urls.join('\n'), `${a.id} must carry the links and nothing else`);
    }
  }
});

test('assistants without prefill copy the links instead', () => {
  assert.equal(askTarget('gemini', urls).copy, true);
  assert.equal(askTarget('other', urls).href, null);
  assert.equal(askTarget('chatgpt', urls).copy, false);
});

test('non-web links are dropped', () => {
  assert.equal(linksText(['javascript:alert(1)', 'https://ok.example/x']), 'https://ok.example/x');
});

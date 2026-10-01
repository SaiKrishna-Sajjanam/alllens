import assert from 'node:assert/strict';
import { test } from 'node:test';
import { plainText } from '../lib/plaintext';

test('web-page code from a feed never shows as text', () => {
  const abp = '<p style="text-align: justify;">ప్రధానమంత్రి <a title="Narendra Modi" href="https://www.abplive.com/topic/narendra-modi">నరేంద్ర మోదీ</a> అమెరికా అధ్యక్షుడు <a title="Donald Trump" href="https://www.abplive.com/topic/donald-trump"';
  assert.equal(plainText(abp), 'ప్రధానమంత్రి నరేంద్ర మోదీ అమెరికా అధ్యక్షుడు');
  assert.equal(plainText('&lt;p&gt;Escaped twice&lt;/p&gt;'), 'Escaped twice');
  assert.equal(plainText('Rs 5 < 6 & more'), 'Rs 5 < 6 & more');
  assert.equal(plainText(null), null);
});

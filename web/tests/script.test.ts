import assert from 'node:assert/strict';
import { test } from 'node:test';
import { textLanguage, writtenIn } from '../lib/script';

test('a headline counts as written in a language by its own letters', () => {
  assert.equal(writtenIn('Modi-Trump: మోదీ-ట్రంప్ ఫోన్ కాల్.. ట్రేడ్, డిఫెన్స్', 'te'), true);
  assert.equal(writtenIn('CEC Gyanesh Kumar Resignation Demands | @SakshiTV', 'te'), false);
  assert.equal(writtenIn('Heavy rain in Hyderabad', 'en'), true);
  assert.equal(writtenIn('హైదరాబాద్‌లో భారీ వర్షం', 'en'), false);
});

test('an English title on a Telugu channel is English, so a Telugu reader gets it translated', () => {
  assert.equal(textLanguage('CEC Gyanesh Kumar Resignation Demands | @SakshiTV', 'te'), 'en');
  assert.equal(textLanguage('హైదరాబాద్‌లో భారీ వర్షం', 'te'), 'te');
  assert.equal(textLanguage('গুৱাহাটীত প্ৰবল বৰষুণ', 'as'), 'as');
});

// Review sheets for native speakers: one CSV per interface language, opened in Excel or Google Sheets.
// Columns: where it is used, English, the current draft, and an empty column for the reviewer's correction.
// Run:  cd web && node --import tsx scripts/translation-review.ts   (writes ../docs/translation-review/)
import fs from 'node:fs';
import path from 'node:path';
import { placeName, topicName } from '../lib/catalog';
import { KEYS, UI_LANGUAGES, t } from '../lib/i18n';
import { STATE_IDS, TOPIC_IDS } from '../lib/names';
import type { Lang } from '../lib/types';

const out = path.join(__dirname, '..', '..', 'docs', 'translation-review');
fs.mkdirSync(out, { recursive: true });
const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;

for (const { code, name } of UI_LANGUAGES.filter((l) => l.code !== 'en')) {
  const lang = code as Lang;
  const rows: string[][] = [['Where (key)', 'English', `${name}: current draft`, 'Your correction (leave empty if fine)', 'Notes']];
  for (const key of KEYS.filter((k) => k !== 'brand')) {   // the name Vuaz stays as it is
    const en = t('en', key);
    const draft = t(lang, key);
    rows.push([key, en, draft === en && /[a-z]{3}/i.test(en) ? '' : draft, '', draft === en ? 'not translated yet' : '']);
  }
  for (const id of TOPIC_IDS) rows.push([`topic name: ${id}`, topicName(id, 'en'), topicName(id, lang), '', '']);
  for (const id of STATE_IDS) rows.push([`state name: ${id}`, placeName(id, 'en'), placeName(id, lang), '', '']);
  // A byte-order mark so Excel opens Indian scripts correctly.
  fs.writeFileSync(path.join(out, `${code}.csv`), '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n', 'utf8');
}
console.log(`wrote ${UI_LANGUAGES.length - 1} sheets to ${out}`);

import { createHash } from 'node:crypto';

/** Which wording of a headline was translated: sha256, first 12 hex characters.
 *  Must match title_hash() in pipeline/translate.py (a test in each checks the same value). */
export function titleHash(title: string): string {
  return createHash('sha256').update(title, 'utf8').digest('hex').slice(0, 12);
}

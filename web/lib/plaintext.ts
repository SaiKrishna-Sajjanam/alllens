// Feed text without web-page code. The collector cleans it (pipeline/common.py strip_html); this
// also cleans reports stored before it handled feeds that escape their HTML twice.

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const TAG = /<\/?[A-Za-z][^<>]*>/g;
const CUT_TAG = /<\/?[A-Za-z][^<>]*$/;   // a tag cut off at the end of a shortened summary

const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, e: string) => ENTITIES[e]);

export function plainText(text: string): string;
export function plainText(text: string | null): string | null;
export function plainText(text: string | null): string | null {
  if (text == null || (!text.includes('<') && !text.includes('&'))) return text;
  let out = text;
  for (let i = 0; i < 3 && (TAG.test(out) || CUT_TAG.test(out) || /&(lt|gt|amp);/.test(out)); i++) {
    TAG.lastIndex = 0;
    out = decode(out.replace(TAG, ' ').replace(CUT_TAG, ''));
  }
  TAG.lastIndex = 0;
  return out.replace(TAG, ' ').replace(CUT_TAG, '').replace(/\s+/g, ' ').trim();
}

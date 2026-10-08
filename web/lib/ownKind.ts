// A report's own kind, as the outlet itself marks it: an opinion piece, an editorial or an analysis.
// Read only from the outlet's own web address (/opinion/, /editorial/ ...) and the categories in its
// feed; never judged by us (rule 1). News reports carry no such mark and get none.

export type OwnKind = 'opinion' | 'editorial' | 'analysis';

// Path sections outlets use, e.g. thehindu.com/opinion/op-ed/..., ntnews.com/editorial/...,
// telanganatoday.com/editorial-raising-..., aajtak.in/opinion-analysis-/...
// A whole section anywhere in the path ("/opinion/"), or a first section starting with the word
// ("/editorial-raising-..."); not a later headline slug ("/india/opinion-poll-...").
const section = (words: string) => new RegExp(`(?:/(?:${words})(?:/|$)|^/(?:${words})-)`, 'i');
const PATH: [RegExp, OwnKind][] = [
  [section('editorials?'), 'editorial'],
  [section('opinions?|op-ed|columns?|blogs?|viewpoint'), 'opinion'],
  [section('analysis|news-analysis'), 'analysis'],
];

// Feed categories (English and the outlets' own languages), compared whole, in lower case.
const CATEGORIES: Record<string, OwnKind> = {
  editorial: 'editorial', editorials: 'editorial', 'సంపాదకీయం': 'editorial', 'संपादकीय': 'editorial',
  'தலையங்கம்': 'editorial', 'ಸಂಪಾದಕೀಯ': 'editorial', 'മുഖപ്രസംഗം': 'editorial', 'সম্পাদকীয়': 'editorial',
  opinion: 'opinion', opinions: 'opinion', 'op-ed': 'opinion', oped: 'opinion', comment: 'opinion',
  column: 'opinion', columns: 'opinion', 'magazine/column': 'opinion', 'view point': 'opinion', viewpoint: 'opinion',
  blog: 'opinion', blogs: 'opinion', 'ಅಂಕಣಗಳು': 'opinion', 'ಅಂಕಣ': 'opinion', 'విశ్లేషణ': 'analysis',
  'विचार': 'opinion', 'राय': 'opinion', 'ओपिनियन': 'opinion', 'कॉलम': 'opinion',
  analysis: 'analysis', 'news analysis': 'analysis', 'विश्लेषण': 'analysis',
};

export function ownKind(url: string | null | undefined, categories: string[] | null | undefined): OwnKind | null {
  for (const c of categories ?? []) {
    const kind = CATEGORIES[c.trim().toLowerCase()];
    if (kind) return kind;
  }
  let path = '';
  try {
    path = url ? new URL(url).pathname : '';
  } catch {
    return null;
  }
  for (const [rx, kind] of PATH) if (rx.test(path)) return kind;
  return null;
}

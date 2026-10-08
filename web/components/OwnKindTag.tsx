import { t } from '@/lib/i18n';
import { ownKind, type OwnKind } from '@/lib/ownKind';
import type { Lang } from '@/lib/types';

/** The outlet's own mark on a report: Opinion, Editorial or Analysis (never our judgement). */
export default function OwnKindTag({ kind, lang }: { kind: OwnKind | null | undefined; lang: Lang }) {
  if (!kind) return null;
  return <span className="tag own-kind">{t(lang, `kind.${kind}`)}</span>;
}

export const reportKind = (a: { url: string; categories?: string[] | null }) => ownKind(a.url, a.categories);

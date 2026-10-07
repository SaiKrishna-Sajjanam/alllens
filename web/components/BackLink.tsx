'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BackIcon } from './Icons';
import { cameFromInsideSite } from './ScrollMemory';

/** "Back" goes back to exactly where the reader was (same tab, topic, page and scroll position).
 *  Opened from outside the site (a shared link), it leads to `fallback` instead. */
export default function BackLink({ fallback, label, icon = true }: { fallback: string; label: string; icon?: boolean }) {
  const router = useRouter();
  return (
    <Link href={fallback} data-back className={icon ? 'row' : undefined}
      style={icon ? { minHeight: 44, textDecoration: 'none', fontWeight: 500 } : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || !cameFromInsideSite()) return;
        e.preventDefault();
        router.back();
      }}>
      {icon && <BackIcon />}
      {label}
    </Link>
  );
}

'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toggleFollow } from '@/app/actions';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

export default function FollowButton({ storyId, initial, signedIn, lang }: {
  storyId: string; initial: boolean; signedIn: boolean; lang: Lang;
}) {
  const [following, setFollowing] = useState(initial);
  const [pending, start] = useTransition();
  if (!signedIn) {
    return (
      <Link className="btn btn-secondary btn-small" href={`/login?next=/story/${storyId}`}>
        {t(lang, 'story.signInToFollow')}
      </Link>
    );
  }
  return (
    <button type="button" className="chip soft" aria-pressed={following} disabled={pending}
      onClick={() => start(async () => {
        const res = await toggleFollow(storyId, !following);
        if (res.ok) setFollowing(res.following);
      })}>
      {following ? t(lang, 'story.following') : t(lang, 'story.follow')}
    </button>
  );
}

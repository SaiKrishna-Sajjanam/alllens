'use client';
import Link from 'next/link';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import type { Lang } from '@/lib/types';

interface Props {
  lang: Lang;
  next: string;
  siteUrl: string;
  configured: boolean;
  initialError: boolean;
  /** Public Supabase address and key (safe in the browser), from the server. */
  supabaseUrl: string;
  supabaseKey: string;
}

/** Google sign-in only: the app never sends email. Everything also works without an account. */
export default function LoginForm({ lang, next, siteUrl, configured, initialError, supabaseUrl, supabaseKey }: Props) {
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  if (!configured) return <p className="notice">{t(lang, 'login.notConfigured')}</p>;

  async function google() {
    setBusy(true);
    setError(false);
    const origin = typeof window !== 'undefined' ? window.location.origin : siteUrl;
    const { error: err } = await createClient(supabaseUrl, supabaseKey).auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (err) setError(true);
  }

  return (
    <div className="stack-lg">
      <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void google()}>
        {t(lang, 'login.google')}
      </button>
      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{t(lang, 'login.error')}</p>}
      <Link href="/feed" className="small">{t(lang, 'login.guest')}</Link>
    </div>
  );
}

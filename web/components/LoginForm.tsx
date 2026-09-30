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
  phoneEnabled: boolean;
  configured: boolean;
  initialError: boolean;
}

export default function LoginForm({ lang, next, siteUrl, phoneEnabled, configured, initialError }: Props) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  if (!configured) return <p className="notice">{t(lang, 'login.notConfigured')}</p>;

  const origin = typeof window !== 'undefined' ? window.location.origin : siteUrl;
  const nextParam = encodeURIComponent(next);

  async function run(fn: () => Promise<{ error: unknown }>, onOk?: () => void) {
    setBusy(true);
    setError(false);
    const { error: err } = await fn();
    setBusy(false);
    if (err) setError(true);
    else onOk?.();
  }

  const supabase = createClient();

  return (
    <div className="stack-lg">
      <button type="button" className="btn btn-secondary btn-block" disabled={busy}
        onClick={() => run(() => supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${origin}/auth/callback?next=${nextParam}` },
        }))}>
        {t(lang, 'login.google')}
      </button>

      <div className="row muted small" aria-hidden="true" style={{ justifyContent: 'center' }}>— {t(lang, 'login.or')} —</div>

      {sent ? (
        <p className="notice" role="status">{t(lang, 'login.sent')}</p>
      ) : (
        <form className="stack" onSubmit={(e) => {
          e.preventDefault();
          void run(() => supabase.auth.signInWithOtp({
            email: email.trim(),
            options: { emailRedirectTo: `${origin}/auth/confirm?next=${nextParam}` },
          }), () => setSent(true));
        }}>
          <label className="field">
            {t(lang, 'login.email')}
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{t(lang, 'login.sendLink')}</button>
        </form>
      )}

      {phoneEnabled && (
        <>
          <div className="row muted small" aria-hidden="true" style={{ justifyContent: 'center' }}>— {t(lang, 'login.or')} —</div>
          {!codeSent ? (
            <form className="stack" onSubmit={(e) => {
              e.preventDefault();
              void run(() => supabase.auth.signInWithOtp({ phone: phone.replace(/\s+/g, '') }), () => setCodeSent(true));
            }}>
              <label className="field">
                {t(lang, 'login.phone')}
                <input type="tel" autoComplete="tel" required pattern="\+?[0-9 ]{10,15}" value={phone}
                  onChange={(e) => setPhone(e.target.value)} />
              </label>
              <p className="small muted">{t(lang, 'login.phoneHint')}</p>
              <button className="btn btn-secondary btn-block" type="submit" disabled={busy}>{t(lang, 'login.sendCode')}</button>
            </form>
          ) : (
            <form className="stack" onSubmit={(e) => {
              e.preventDefault();
              void run(() => supabase.auth.verifyOtp({ phone: phone.replace(/\s+/g, ''), token: code.trim(), type: 'sms' }),
                () => { window.location.href = `/auth/finish?next=${nextParam}`; });
            }}>
              <label className="field">
                {t(lang, 'login.code')}
                <input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
              </label>
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{t(lang, 'login.verify')}</button>
            </form>
          )}
        </>
      )}

      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{t(lang, 'login.error')}</p>}
      <Link href="/feed" className="small">{t(lang, 'login.guest')}</Link>
    </div>
  );
}

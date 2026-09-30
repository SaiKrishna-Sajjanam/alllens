import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { ensureProfile, safeNext } from '@/lib/profile';
import { createClient } from '@/lib/supabase/server';

/**
 * Email sign-in links land here. Works even when the link is opened on a
 * different device from the one that asked for it. The Supabase "Magic Link"
 * email template must point here (see docs/SETUP.md).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(searchParams.get('next'));
  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error && data.user) {
      await ensureProfile(supabase, data.user.id);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=1`);
}

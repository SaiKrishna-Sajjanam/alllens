import { NextResponse } from 'next/server';
import { ensureProfile, safeNext } from '@/lib/profile';
import { createClient } from '@/lib/supabase/server';

/** Google (and other OAuth) sign-in lands here with a one-time code. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await ensureProfile(supabase, data.user.id);
      // No name yet: ask for one first. (An error means the database is older than display names.)
      const { data: row, error: nameError } = await supabase
        .from('profiles').select('display_name').eq('user_id', data.user.id).maybeSingle();
      if (!nameError && !row?.display_name) return NextResponse.redirect(`${origin}/name?next=${encodeURIComponent(next)}`);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=1`);
}

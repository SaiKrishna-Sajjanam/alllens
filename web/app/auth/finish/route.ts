import { NextResponse } from 'next/server';
import { ensureProfile, safeNext } from '@/lib/profile';
import { createClient } from '@/lib/supabase/server';

/** After phone sign-in (verified in the browser): carry guest choices over, then continue. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await ensureProfile(supabase, user.id);
  return NextResponse.redirect(`${origin}${safeNext(searchParams.get('next'))}`);
}

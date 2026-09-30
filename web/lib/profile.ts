import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { PREFS_COOKIE, decodePrefsCookie, profileFromPrefs } from './prefs';

/** First sign-in: carry the choices made as a guest over to the new account. */
export async function ensureProfile(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data } = await supabase.from('profiles').select('user_id').eq('user_id', userId).maybeSingle();
  if (data) return;
  const guest = decodePrefsCookie((await cookies()).get(PREFS_COOKIE)?.value);
  if (!guest) return;
  await supabase.from('profiles').insert({ ...profileFromPrefs(userId, guest), last_seen_at: new Date().toISOString() });
}

export { safeNextPath as safeNext } from './paths';

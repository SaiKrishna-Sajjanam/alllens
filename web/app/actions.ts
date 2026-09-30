'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isConfigured } from '@/lib/env';
import { isLang } from '@/lib/i18n';
import {
  PREFS_COOKIE, UI_COOKIE, VISIT_COOKIE, cleanPrefs, decodePrefsCookie, encodePrefsCookie, profileFromPrefs,
} from '@/lib/prefs';
import { createClient } from '@/lib/supabase/server';
import type { Lang } from '@/lib/types';

const YEAR = 60 * 60 * 24 * 365;
const cookieOpts = { path: '/', maxAge: YEAR, sameSite: 'lax' as const, httpOnly: true, secure: process.env.NODE_ENV === 'production' };

async function currentUser() {
  if (!isConfigured()) return { supabase: null, user: null };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Save the reader's choices: on this device always, and to their account when signed in. */
export async function savePrefs(input: unknown): Promise<{ ok: boolean }> {
  const prefs = cleanPrefs(input);
  const jar = await cookies();
  jar.set(PREFS_COOKIE, encodePrefsCookie(prefs), cookieOpts);
  jar.set(UI_COOKIE, prefs.uiLanguage, cookieOpts);
  const { supabase, user } = await currentUser();
  if (supabase && user) {
    const { error } = await supabase
      .from('profiles')
      .upsert({ ...profileFromPrefs(user.id, prefs), updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) return { ok: false };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Called once a feed has been shown, so the next visit can show what is new since. */
export async function markVisited(): Promise<void> {
  const now = new Date().toISOString();
  const { supabase, user } = await currentUser();
  if (supabase && user) {
    await supabase.from('profiles').update({ last_visit_at: now, last_seen_at: now }).eq('user_id', user.id);
    return;
  }
  (await cookies()).set(VISIT_COOKIE, now, cookieOpts);
}

export async function setUiLanguage(lang: Lang): Promise<void> {
  if (!isLang(lang)) return;
  const jar = await cookies();
  jar.set(UI_COOKIE, lang, cookieOpts);
  const saved = decodePrefsCookie(jar.get(PREFS_COOKIE)?.value);
  if (saved) jar.set(PREFS_COOKIE, encodePrefsCookie({ ...saved, uiLanguage: lang }), cookieOpts);
  const { supabase, user } = await currentUser();
  if (supabase && user) await supabase.from('profiles').update({ ui_language: lang }).eq('user_id', user.id);
  revalidatePath('/', 'layout');
}

export async function toggleFollow(storyId: string, follow: boolean): Promise<{ ok: boolean; following: boolean }> {
  const { supabase, user } = await currentUser();
  if (!supabase || !user || !/^[\w-]{1,80}$/.test(storyId)) return { ok: false, following: !follow };
  if (follow) {
    const { data: story } = await supabase.from('stories').select('article_count').eq('id', storyId).maybeSingle();
    const { error } = await supabase
      .from('follows')
      .upsert({ user_id: user.id, story_id: storyId, seen_article_count: story?.article_count ?? 0 }, { onConflict: 'user_id,story_id' });
    if (error) return { ok: false, following: false };
  } else {
    const { error } = await supabase.from('follows').delete().eq('user_id', user.id).eq('story_id', storyId);
    if (error) return { ok: false, following: true };
  }
  revalidatePath(`/story/${storyId}`);
  revalidatePath('/following');
  return { ok: true, following: follow };
}

export type SuggestState = { status: 'idle' | 'ok' | 'error' | 'signin' };

export async function suggestSource(_prev: SuggestState, form: FormData): Promise<SuggestState> {
  const { supabase, user } = await currentUser();
  if (!supabase || !user) return { status: 'signin' };
  const name = String(form.get('name') ?? '').trim().slice(0, 200);
  const url = String(form.get('url') ?? '').trim().slice(0, 500);
  const note = String(form.get('note') ?? '').trim().slice(0, 1000);
  if (name.length < 2 || (url && !/^https?:\/\/\S+$/i.test(url))) return { status: 'error' };
  const { error } = await supabase.from('source_suggestions').insert({ user_id: user.id, name, url: url || null, note: note || null });
  return { status: error ? 'error' : 'ok' };
}

export async function signOut(): Promise<void> {
  const { supabase } = await currentUser();
  if (supabase) await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/feed');
}

export async function deleteAccount(form: FormData): Promise<void> {
  if (String(form.get('confirm') ?? '').trim() !== 'DELETE') redirect('/settings?delete=confirm');
  const { supabase, user } = await currentUser();
  if (!supabase || !user) redirect('/settings');
  const { error } = await supabase.rpc('delete_my_account');
  if (error) redirect('/settings?delete=failed');
  await supabase.auth.signOut();
  const jar = await cookies();
  for (const name of [PREFS_COOKIE, VISIT_COOKIE, UI_COOKIE]) jar.delete(name);
  revalidatePath('/', 'layout');
  redirect('/welcome');
}

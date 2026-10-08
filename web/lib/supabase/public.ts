import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../env';

let client: SupabaseClient | null = null;

/** Supabase client for public news data (stories, articles, sources, translations): no reader cookies,
 *  so its answers are the same for everyone and can be cached. Row-level security still applies (it
 *  reads as an anonymous visitor). Anything personal (follows, profile) uses ./server instead. */
export function publicClient(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

/** News is collected about once an hour and is the same for every reader, so a public read is kept
 *  for a few minutes and shared by everyone who asks the same question: most clicks then need no
 *  database trip at all. Keyed by the function's name and its arguments. */
export function publicCache<A extends unknown[], R>(name: string, fn: (...args: A) => Promise<R>, seconds = 300) {
  return unstable_cache(fn, ['public-v1', name], { revalidate: seconds });
}

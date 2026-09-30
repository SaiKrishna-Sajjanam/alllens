import { createBrowserClient } from '@supabase/ssr';

/** Supabase client for the browser (sign-in form). The server passes the public address and key
 *  (read while it runs), so the browser does not depend on what the build saw. */
export function createClient(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey);
}

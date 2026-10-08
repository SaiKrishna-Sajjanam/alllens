import 'server-only';
import { isConfigured } from './env';
import { createClient } from './supabase/server';

// The admin page's data. Every call goes through a database function that checks the signed-in
// reader's role itself (supabase/migrations/20261008000100_admin.sql), so nothing here can be
// reached by someone who is not an admin, even by calling the API directly.

export type AdminRole = 'super' | 'admin';

export interface Count { name: string; n: number }
export interface AdminStats {
  days: number;
  accounts: number;
  active_7d: number;
  restricted: number;
  admins: number;
  views: number;
  signups: number;
  deleted: number;
  by_day: { day: string; web: number; app: number; signup: number; deleted: number }[];
  by_page: Count[];
  by_platform: Count[];
  by_device: Count[];
  by_lang: Count[];
  account_langs: Count[];
  account_states: Count[];
  most_followed: { id: string; label: string; n: number }[];
}

export interface Account {
  user_id: string;
  email: string | null;
  role: AdminRole | null;
  restricted: boolean;
  reason: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  since?: string | null;
}

/** The signed-in reader's admin role, or null (not signed in, or not an admin). */
export async function getAdminRole(): Promise<AdminRole | null> {
  if (!isConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc('my_admin_role');
  return data === 'super' || data === 'admin' ? data : null;
}

export async function getAdminStats(days: number): Promise<AdminStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_stats', { days });
  return error ? null : (data as AdminStats);
}

/** Every admin and every restricted account. */
export async function getAdminPeople(): Promise<Account[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('admin_people');
  return (data ?? []) as Account[];
}

/** Accounts whose email contains the text (at least 2 characters). */
export async function findAccounts(q: string): Promise<Account[]> {
  const text = q.trim().slice(0, 200);
  if (text.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc('admin_find_accounts', { q: text });
  return (data ?? []) as Account[];
}

/** Whether the signed-in reader's account is restricted (follows, settings and suggestions refused). */
export async function amIRestricted(): Promise<boolean> {
  if (!isConfigured()) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc('am_i_restricted');
  return data === true;
}

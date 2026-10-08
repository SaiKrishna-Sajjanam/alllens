'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// The database checks the role on every call (only the super admin changes admins; any admin
// restricts accounts), so these actions only pass the request on and report the answer.

export interface AdminActionState { ok: boolean; message: string | null }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function call(fn: string, args: Record<string, unknown>): Promise<AdminActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin');
  return { ok: true, message: null };
}

export async function setAdmin(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  const target = String(form.get('user_id') ?? '');
  if (!UUID.test(target)) return { ok: false, message: 'Unknown account' };
  return call('admin_set_admin', { target, make_admin: form.get('make') === 'true' });
}

export async function setRestricted(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  const target = String(form.get('user_id') ?? '');
  if (!UUID.test(target)) return { ok: false, message: 'Unknown account' };
  return call('admin_set_restricted', {
    target,
    do_restrict: form.get('restrict') === 'true',
    why: String(form.get('reason') ?? '').slice(0, 500) || null,
  });
}

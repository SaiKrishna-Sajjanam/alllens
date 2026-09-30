import { NextResponse } from 'next/server';
import { isConfigured, runtimeSetting, tidySetting } from '@/lib/env';

export const dynamic = 'force-dynamic';

const SHAPES: Record<string, (v: string) => boolean> = {
  NEXT_PUBLIC_SUPABASE_URL: (v) => /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(v),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: (v) => v.length > 20 && !/\s/.test(v),
  TRANSLATE_URL: (v) => /^https:\/\/script\.google\.com\/\S+\/exec$/.test(v),
  TRANSLATE_TOKEN: (v) => v.length >= 20 && !/\s/.test(v),
};

/** What is wrong with a setting, in words; never its value. */
function describe(name: string): string {
  const raw = runtimeSetting(name);
  if (raw === undefined) return 'missing';
  if (!raw.trim()) return 'empty';
  const notes: string[] = [];
  if (raw !== raw.trim()) notes.push(/[\r\n]/.test(raw) ? 'line break at the start or end' : 'space at the start or end');
  if (raw.trim().startsWith(`${name}=`)) notes.push(`starts with "${name}="`);
  if (/^["'`]|["'`]$/.test(raw.trim())) notes.push('quotes around it');
  const ok = SHAPES[name](tidySetting(name, raw));
  if (!notes.length) return ok ? 'ok' : `wrong format (${raw.trim().length} characters, does not look like a ${name.includes('URL') ? 'web address of the right kind' : 'key'})`;
  return ok ? `ok after tidying (${notes.join(', ')})` : `wrong format (${notes.join(', ')})`;
}

/** Is each setting present and in the right shape? Words only, never values. */
export function GET() {
  return NextResponse.json({
    site: isConfigured() ? 'live news (Supabase connected)' : 'sample stories (Supabase not connected)',
    settings: Object.fromEntries(Object.keys(SHAPES).map((n) => [n, describe(n)])),
  });
}

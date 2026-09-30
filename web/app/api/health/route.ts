import { NextResponse } from 'next/server';
import { isConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

type Check = 'ok' | 'missing' | 'empty' | 'wrong format';

/** Read a setting while the site runs (bracket access, so the build does not bake it in). */
function runtime(name: string): string | undefined {
  return process.env[name];
}

function check(value: string | undefined, ok: (v: string) => boolean): Check {
  if (value === undefined) return 'missing';
  if (!value.trim()) return 'empty';
  return ok(value) ? 'ok' : 'wrong format';
}

const clean = (v: string) => v === v.trim() && !/["'\s]/.test(v);

/**
 * Is each setting present and in the right shape? Says only ok / missing / empty / wrong format,
 * never a value. "builtIn" is what the build baked into the pages (NEXT_PUBLIC_ settings are fixed
 * at build time, so after changing them the site must be built again).
 */
export function GET() {
  return NextResponse.json({
    builtIn: { supabase: isConfigured() ? 'ok' : 'not set when the site was built' },
    settingsNow: {
      NEXT_PUBLIC_SUPABASE_URL: check(runtime('NEXT_PUBLIC_SUPABASE_URL'),
        (v) => clean(v) && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(v)),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: check(runtime('NEXT_PUBLIC_SUPABASE_ANON_KEY'), (v) => clean(v) && v.length > 20),
      TRANSLATE_URL: check(runtime('TRANSLATE_URL'), (v) => clean(v) && /^https:\/\/script\.google\.com\/.+\/exec$/.test(v)),
      TRANSLATE_TOKEN: check(runtime('TRANSLATE_TOKEN'), (v) => clean(v) && v.length >= 20),
    },
  });
}

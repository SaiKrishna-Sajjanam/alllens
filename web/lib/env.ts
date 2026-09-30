// Settings. See .env.example.
//
// Read while the site runs (on the server), with the copy baked in at build time as the fallback:
// a setting changed in Vercel then works without depending on what the build saw. Values are
// tidied, because pasting into a dashboard easily adds an invisible line break or space at the
// end, quotes, or the "NAME=" part of a .env line.

/** The value without surrounding spaces or line breaks, quotes, or a leading "NAME=". */
export function tidySetting(name: string, raw: string | undefined): string {
  let v = (raw ?? '').trim();
  if (v.startsWith(`${name}=`)) v = v.slice(name.length + 1).trim();
  v = v.replace(/^["'`]+|["'`]+$/g, '').trim();
  return v;
}

/** The setting as the running server sees it (bracket access: the build does not bake it in). */
export function runtimeSetting(name: string): string | undefined {
  return typeof process !== 'undefined' && process.env ? process.env[name] : undefined;
}

function setting(name: string, builtIn: string | undefined): string {
  return tidySetting(name, runtimeSetting(name) || builtIn);
}

// Public settings (safe in the browser; the database's security rules decide what they can do).
export const SUPABASE_URL = setting('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, '');
export const SUPABASE_ANON_KEY =
  setting('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  setting('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
// On Vercel the site's own address is provided automatically (NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL),
// so NEXT_PUBLIC_SITE_URL is only needed for a custom domain.
const VERCEL_URL = setting('NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL', process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL);
export const SITE_URL = (
  setting('NEXT_PUBLIC_SITE_URL', process.env.NEXT_PUBLIC_SITE_URL) ||
  (VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:3000')
).replace(/\/$/, '');
export const GRIEVANCE_OFFICER = process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER ?? '[NAME OF GRIEVANCE OFFICER]';
export const GRIEVANCE_EMAIL = process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL ?? '[grievance@yourdomain]';
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '[hello@yourdomain]';

/** Until Supabase is connected the app runs on sample stories, so it can be explored right away. */
export function isConfigured(): boolean {
  return SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;
}

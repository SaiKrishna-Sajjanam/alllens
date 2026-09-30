// Public settings (safe in the browser). See .env.example.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const PHONE_LOGIN = process.env.NEXT_PUBLIC_ENABLE_PHONE_LOGIN === 'true';
export const GRIEVANCE_OFFICER = process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER ?? '[NAME OF GRIEVANCE OFFICER]';
export const GRIEVANCE_EMAIL = process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL ?? '[grievance@yourdomain]';
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '[hello@yourdomain]';

/** Until Supabase is connected the app runs on sample stories, so it can be explored right away. */
export function isConfigured(): boolean {
  return SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;
}

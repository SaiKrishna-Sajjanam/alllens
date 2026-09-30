// Public settings (safe in the browser). See .env.example.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
// On Vercel the site's own address is provided automatically (NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL),
// so NEXT_PUBLIC_SITE_URL is only needed for a custom domain.
const VERCEL_URL = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? (VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:3000')
).replace(/\/$/, '');
export const GRIEVANCE_OFFICER = process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER ?? '[NAME OF GRIEVANCE OFFICER]';
export const GRIEVANCE_EMAIL = process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL ?? '[grievance@yourdomain]';
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '[hello@yourdomain]';

/** Until Supabase is connected the app runs on sample stories, so it can be explored right away. */
export function isConfigured(): boolean {
  return SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;
}

// The reader's display name (asked once after signing in) and the greeting at the top of the feed.
// Same limits as the database check in supabase/migrations/20261008000200_display_name.sql.

export const NAME_MAX = 40;

/** A name as the reader typed it, tidied: spaces collapsed, control characters removed; null if empty. */
export function cleanName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const s = input.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim();
  return s ? [...s].slice(0, NAME_MAX).join('').trim() : null;
}

/** What the name box starts with: the name Google shares, else the part of the email before "@". */
export function suggestedName(meta: Record<string, unknown> | null | undefined, email: string | null | undefined): string {
  for (const key of ['full_name', 'name', 'given_name']) {
    const name = cleanName(meta?.[key]);
    if (name) return name;
  }
  return cleanName(email?.split('@')[0]) ?? '';
}

export type GreetingKey =
  | 'feed.morning' | 'feed.afternoon' | 'feed.evening'
  | 'feed.morningName' | 'feed.afternoonName' | 'feed.eveningName'
  | 'feed.welcomeName' | 'feed.welcomeBackName';

/** Hours away after which "Welcome back" replaces "Good evening". */
export const WELCOME_BACK_HOURS = 6;

/** The feed heading: "Welcome, {name}" on the first visit, "Welcome back, {name}" after some hours away,
 *  otherwise good morning/afternoon/evening (India time), with the name when the reader has one. */
export function greetingKey(name: string | null, lastVisit: string | null, now = new Date()): GreetingKey {
  const hour = Number(now.toLocaleString('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }));
  const part = hour >= 4 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : 'evening';
  if (!name) return `feed.${part}`;
  if (!lastVisit) return 'feed.welcomeName';
  const away = now.getTime() - Date.parse(lastVisit);
  if (away >= WELCOME_BACK_HOURS * 3_600_000) return 'feed.welcomeBackName';
  return `feed.${part}Name`;
}

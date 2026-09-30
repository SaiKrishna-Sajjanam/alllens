/** Only allow redirects to our own pages (no //evil.example or https://...). */
export function safeNextPath(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/feed';
}

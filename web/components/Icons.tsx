// Small stroke icons (decorative; every use sits next to text or has an aria-label).
type P = { size?: number };
const base = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
});
export const FeedIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>
);
export const BookmarkIcon = ({ size = 22 }: P) => <svg {...base(size)}><path d="M6 3h12v18l-6-4-6 4z" /></svg>;
export const ArchiveIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10h14V9M10 13h4" /></svg>
);
export const PersonIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
);
export const ExternalIcon = ({ size = 14 }: P) => <svg {...base(size)}><path d="M7 17L17 7M8 7h9v9" /></svg>;
export const BackIcon = ({ size = 18 }: P) => <svg {...base(size)}><path d="M15 18l-6-6 6-6" /></svg>;

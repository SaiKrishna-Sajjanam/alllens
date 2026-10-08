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
export const WatchIcon = ({ size = 22 }: P) => (
  <svg {...base(size)}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9v6l5-3z" /></svg>
);
export const ClockIcon = ({ size = 16 }: P) => <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
export const TrendIcon = ({ size = 16 }: P) => <svg {...base(size)}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>;
export const SearchIcon = ({ size = 20 }: P) => <svg {...base(size)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
export const ArrangeIcon = ({ size = 16 }: P) => <svg {...base(size)}><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>;

/** One small drawing per topic (ids from pipeline/data/topics.json); a topic without one gets a dot. */
const TOPIC_PATHS: Record<string, string> = {
  politics: 'M3 21h18M5 21V10m14 11V10M9 21V10m6 11V10M12 3l9 5H3z',
  business: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  tech: 'M7 7h10v10H7zM10 2v3m4-3v3M10 19v3m4-3v3M2 10h3m-3 4h3m14-4h3m-3 4h3',
  cinema: 'M4 9h16v11H4zM4 9l3-5h3l-3 5m3 0l3-5h3l-3 5m3 0l3-5h1',
  sports: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  space: 'M12 2c4 3 5 8 3 13H9C7 10 8 5 12 2zM9 15l-3 3m9-3l3 3M12 8.5v.01',
  gaming: 'M6 8h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5 2l-2-2H9l-2 2a3 3 0 0 1-5-2v-1a4 4 0 0 1 4-4zM8 11v3M6.5 12.5h3M15 12h.01M17 14h.01',
  education: 'M2 9l10-5l10 5l-10 5zM6 11v5c3 2 9 2 12 0v-5',
  auto: 'M3 15l2-6h14l2 6v4H3zM7 19v2m10-2v2M6.5 15h.01M17.5 15h.01',
  lifestyle: 'M12 20s-8-5-8-11a4 4 0 0 1 8-1a4 4 0 0 1 8 1c0 6-8 11-8 11z',
  fashion: 'M8 3l4 2l4-2l5 4l-3 3l-2-1v12H8V9l-2 1l-3-3z',
  food: 'M3 11h18a9 9 0 0 1-18 0zM8 7c0-2 2-2 2-4m4 4c0-2 2-2 2-4',
  travel: 'M2 16l20-8l-6 12l-3-5zM13 15l-3 5',
  health: 'M3 12h4l2-5l4 10l2-5h6',
  farming: 'M12 21v-9M12 12c0-4-3-7-8-7c0 4 3 7 8 7zm0 0c0-3 2-6 7-6c0 3-2 6-7 6z',
  environment: 'M7 18h10a4 4 0 0 0 0-8a6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z',
  religion: 'M4 14c0 3 4 5 8 5s8-2 8-5zM12 14V9M12 4c1.5 2 1.5 3 0 5c-1.5-2-1.5-3 0-5',
  crime: 'M12 3l8 3v6c0 5-4 8-8 9c-4-1-8-4-8-9V6zM12 8v5M12 16h.01',
  accidents: 'M12 3l10 18H2zM12 10v5M12 18h.01',
};
export const TopicIcon = ({ id, size = 16 }: P & { id: string }) => (
  <svg {...base(size)}><path d={TOPIC_PATHS[id] ?? 'M12 11.5v1'} /></svg>
);

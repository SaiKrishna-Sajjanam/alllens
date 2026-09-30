import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="narrow stack">
      <h1>Page not found</h1>
      <p className="muted">It may have been removed: stories are kept for 30 days.</p>
      <Link className="btn btn-primary" href="/feed">Go to your feed</Link>
    </div>
  );
}

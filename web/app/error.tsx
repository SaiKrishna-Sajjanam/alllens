'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="narrow stack">
      <h1>Something went wrong</h1>
      <p className="muted">Please try again. If it keeps happening, the news service may be briefly unavailable.</p>
      <button className="btn btn-primary" type="button" onClick={() => reset()}>Try again</button>
    </div>
  );
}

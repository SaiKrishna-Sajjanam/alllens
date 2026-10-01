// Shown the moment a link or button is tapped, while the next page is prepared.
export default function Loading() {
  return (
    <div className="loading" role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card loading-card">
          <div className="loading-block loading-picture" />
          <div className="loading-block loading-line" />
          <div className="loading-block loading-line short" />
        </div>
      ))}
    </div>
  );
}

'use client';
import { useState } from 'react';

export interface QuickPanel {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

/** Phones and tablets: "Most covered", "Just in" and videos as buttons near the top of the feed, each
 *  opening its list in place (one at a time; tap again to close). On a laptop the same lists sit in the
 *  right-hand column instead, so this row is hidden there. */
export default function QuickPanels({ panels, label }: { panels: QuickPanel[]; label: string }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!panels.length) return null;
  const current = panels.find((x) => x.id === open);
  return (
    <div className="quick-panels">
      <div className="quick-row" role="group" aria-label={label}>
        {panels.map((x) => (
          <button key={x.id} type="button" className="chip quick-chip" aria-expanded={open === x.id}
            aria-controls={`quick-${x.id}`} onClick={() => setOpen(open === x.id ? null : x.id)}>
            {x.icon}
            <span>{x.label}</span>
            <svg className="quick-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
        ))}
      </div>
      {current && (
        <div id={`quick-${current.id}`} className="side-card quick-body">
          {current.content}
        </div>
      )}
    </div>
  );
}

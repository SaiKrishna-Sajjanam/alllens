'use client';
import { useEffect, useState } from 'react';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}

/** "Install the app": the browser's own install prompt where it offers one (Android, desktop Chrome
 *  and Edge), the Share-menu steps on iPhone, and nothing once Vuaz already runs as an app. */
export default function InstallCard({ labels }: { labels: { title: string; body: string; button: string; ios: string } }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [mode, setMode] = useState<'hidden' | 'prompt' | 'ios'>('hidden');
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) setMode('ios');
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
      setMode('prompt');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  if (mode === 'hidden') return null;
  return (
    <section className="side-card install-card" aria-label={labels.title}>
      <h2>{labels.title}</h2>
      <p className="small muted">{labels.body}</p>
      {mode === 'prompt' && prompt ? (
        <button type="button" className="btn btn-primary btn-small" style={{ alignSelf: 'flex-start' }}
          onClick={async () => { await prompt.prompt(); setMode('hidden'); }}>
          {labels.button}
        </button>
      ) : (
        <p className="small">{labels.ios}</p>
      )}
    </section>
  );
}

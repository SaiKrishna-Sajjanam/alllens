'use client';
import { useEffect, useRef, useState } from 'react';
import { AI_ASSISTANTS, askTarget, assistantById } from '@/lib/ai';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

interface Props {
  urls: string[];
  lang: Lang;
  preferred: string;
  label?: string;
  block?: boolean;
}

/**
 * Opens the reader's own AI assistant with only the link(s). We add nothing:
 * no question, no prompt, no summary. The reader asks whatever they want there.
 */
export default function AskAI({ urls, lang, preferred, label, block }: Props) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  async function go(id: string) {
    setOpen(false);
    const target = askTarget(id, urls);
    if (target.copy) {
      try {
        await navigator.clipboard.writeText(target.text);
      } catch {
        /* clipboard blocked: the reader can still copy from the source page */
      }
      setToast(t(lang, 'ai.copied', { name: assistantById(id).name }));
    }
    if (target.href) window.open(target.href, '_blank', 'noopener,noreferrer');
  }

  const ordered = [assistantById(preferred), ...AI_ASSISTANTS.filter((a) => a.id !== preferred)];
  return (
    <div className="ask" ref={ref}>
      <button type="button" className={`btn btn-secondary btn-small${block ? ' btn-block' : ''}`}
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label ?? t(lang, 'ai.ask')}
      </button>
      {open && (
        <div className="ask-menu" role="menu" aria-label={t(lang, 'ai.openWith')}>
          {ordered.map((a) => (
            <button key={a.id} type="button" role="menuitem" onClick={() => go(a.id)}>
              {a.id === 'other' ? t(lang, 'ai.other') : a.name}
            </button>
          ))}
          <p className="note">{t(lang, 'ai.note')}</p>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { savePrefs } from '@/app/actions';
import { topicName } from '@/lib/catalog';
import { ArrangeIcon, TopicIcon } from './Icons';
import { t } from '@/lib/i18n';
import type { Lang, Prefs } from '@/lib/types';

interface Props {
  prefs: Prefs;
  lang: Lang;
  /** The topic on screen: the one tapped on this visit, or the reader's first topic. */
  topic: string;
  /** Where each topic button leads. */
  hrefs: Record<string, string>;
}

/** The topic buttons, in the reader's own order; the feed shows one topic at a time and opens on the
 *  first (Politics unless the reader moved another to the front). "Arrange" lets the reader drag
 *  them into any order and save it. */
export default function TopicBar({ prefs, lang, topic, hrefs }: Props) {
  const [arranging, setArranging] = useState(false);
  const [order, setOrder] = useState(prefs.topicOrder);
  const [dragging, setDragging] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const row = useRef<HTMLDivElement>(null);

  // Keep the chosen topic's button in view in the sideways-scrolling row (moves the row, not the page).
  useEffect(() => {
    const el = row.current;
    const chip = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !chip) return;
    const left = chip.offsetLeft - el.offsetLeft;
    // Only when it is out of sight, so Arrange (first in the row) stays visible whenever it can.
    if (left < el.scrollLeft || left + chip.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollLeft = left - 48;
  }, [topic, arranging]);

  // Pick and place with a mouse, a finger or a pen: the topic picked up moves to wherever the
  // pointer is, and the others make room. Arrow keys do the same from the keyboard.
  function pickUp(e: React.PointerEvent, id: string) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.releasePointerCapture?.(e.pointerId);   // let the list see where the pointer goes
    setDragging(id);
  }

  function dragOver(e: React.PointerEvent) {
    if (!dragging) return;
    const over = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest('[data-topic]');
    const target = over?.getAttribute('data-topic');
    if (!target || target === dragging) return;
    setOrder((cur) => {
      const next = cur.filter((x) => x !== dragging);
      next.splice(cur.indexOf(target), 0, dragging);
      return next;
    });
  }

  function drop() {
    setDragging(null);
  }

  function keyMove(e: React.KeyboardEvent, i: number) {
    const rtl = document.documentElement.dir === 'rtl';
    const by = e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : e.key === 'ArrowRight' ? (rtl ? -1 : 1) : 0;
    const j = i + by;
    if (!by || j < 0 || j >= order.length) return;
    e.preventDefault();
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    const list = e.currentTarget.closest('ol');
    requestAnimationFrame(() => list?.querySelectorAll('button')[j]?.focus());
  }

  function save() {
    start(async () => {
      const res = await savePrefs({ ...prefs, topicOrder: order });
      if (!res.ok) return;
      setArranging(false);
      router.refresh();
    });
  }

  if (!arranging) {
    return (
      <div className="stack" style={{ gap: 6 }}>
        {/* Arrange sits in the row with the topics, first, so it is always in view. */}
        <div ref={row} className="filter-row topic-row" role="group" aria-label={t(lang, 'prefs.topics')}>
          <button type="button" className="chip arrange-chip" onClick={() => setArranging(true)}>
            <ArrangeIcon />
            {t(lang, 'feed.arrange')}
          </button>
          {order.map((id) => (
            <Link key={id} href={hrefs[id]} className="chip" aria-pressed={topic === id ? 'true' : 'false'}>
              <TopicIcon id={id} />
              {topicName(id, lang)}
            </Link>
          ))}
        </div>
        <p className="small muted topic-hint">{t(lang, 'feed.hintTopic', { topic: topicName(topic, lang) })}</p>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <p className="small muted" id="arrange-hint">{t(lang, 'feed.arrangeHint')}</p>
      <ol className="filter-row topic-arrange" aria-label={t(lang, 'prefs.topicOrder')}
        onPointerMove={dragOver} onPointerUp={drop} onPointerCancel={drop} onPointerLeave={drop}>
        {order.map((id, i) => (
          <li key={id} data-topic={id}>
            <button type="button" className={id === dragging ? 'chip dragging' : 'chip'} aria-describedby="arrange-hint"
              onPointerDown={(e) => pickUp(e, id)} onKeyDown={(e) => keyMove(e, i)}>
              <span aria-hidden="true" className="grip">⠿</span>
              <TopicIcon id={id} />
              {topicName(id, lang)}
            </button>
          </li>
        ))}
      </ol>
      <div className="row">
        <button type="button" className="btn btn-primary btn-small" onClick={save} disabled={pending}>
          {pending ? t(lang, 'common.loading') : t(lang, 'prefs.saveSettings')}
        </button>
        <button type="button" className="btn btn-secondary btn-small" disabled={pending}
          onClick={() => { setOrder(prefs.topicOrder); setArranging(false); }}>
          {t(lang, 'common.close')}
        </button>
      </div>
    </div>
  );
}

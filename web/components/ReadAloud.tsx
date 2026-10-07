'use client';
import { useEffect, useId, useState } from 'react';
import { languageName } from '@/lib/catalog';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

/** One report to read out: exactly the words on screen (the source's own, or Google's marked
 *  translation of them), in the language they are written in. */
export interface Spoken {
  source: string;
  title: string;
  titleLang: string | null | undefined;
  snippet?: string | null;
  snippetLang?: string | null;
}

const OTHER_STARTED = 'vuaz-read-aloud';
const bcp47 = (code: string) => `${code}-IN`;
const voiceFor = (voices: SpeechSynthesisVoice[], code: string) =>
  voices.find((v) => v.lang.replace('_', '-').toLowerCase() === bcp47(code).toLowerCase())
  ?? voices.find((v) => v.lang.toLowerCase().startsWith(code));

/** Reads reports aloud with the phone's own voice, word for word: the source's name, its
 *  headline and its opening lines. Nothing is added, shortened or reworded. */
export default function ReadAloud({ items, lang, label }: { items: Spoken[]; lang: Lang; label: 'listen.all' | 'listen.one' }) {
  const id = useId();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    setSupported(true);
    const other = (e: Event) => { if ((e as CustomEvent<string>).detail !== id) setSpeaking(false); };
    window.addEventListener(OTHER_STARTED, other);
    return () => {
      window.removeEventListener(OTHER_STARTED, other);
      window.speechSynthesis.cancel();
    };
  }, [id]);

  if (!supported || !items.length) return null;

  function stop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function start() {
    const synth = window.speechSynthesis;
    synth.cancel();
    window.dispatchEvent(new CustomEvent(OTHER_STARTED, { detail: id }));
    const voices = synth.getVoices();
    const parts: { text: string; lang: string }[] = [];
    for (const it of items) {
      parts.push({ text: t(lang, 'listen.from', { source: it.source }), lang });
      parts.push({ text: it.title, lang: it.titleLang || lang });
      if (it.snippet) parts.push({ text: it.snippet, lang: it.snippetLang || it.titleLang || lang });
    }
    // Some phones lack a voice for a language; say so rather than leave the reader guessing.
    setMissing(voices.length ? [...new Set(parts.map((p) => p.lang))].filter((l) => !voiceFor(voices, l)) : []);
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p.text);
      u.lang = bcp47(p.lang);
      const voice = voiceFor(voices, p.lang);
      if (voice) u.voice = voice;
      if (i === parts.length - 1) u.onend = () => setSpeaking(false);
      synth.speak(u);
    });
    setSpeaking(true);
  }

  return (
    <span className="read-aloud">
      <button type="button" className="btn btn-secondary btn-small" aria-pressed={speaking} onClick={speaking ? stop : start}>
        <span aria-hidden="true">{speaking ? '■' : '🔊'}</span>&nbsp;{t(lang, speaking ? 'listen.stop' : label)}
      </button>
      {speaking && missing.length > 0 && (
        <span className="small muted" role="status">
          {t(lang, 'listen.noVoice', { language: missing.map((l) => languageName(l)).join(', ') })}
        </span>
      )}
    </span>
  );
}

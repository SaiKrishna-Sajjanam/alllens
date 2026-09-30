// "Ask your AI": open the reader's own assistant with ONLY the article link(s).
// We never add a question, prompt or summary (product rule 2).

export interface Assistant {
  id: string;
  name: string;
  /** URL that opens the assistant; `{q}` is replaced by the links when the assistant supports prefilling. */
  url: string;
  prefill: boolean;
}

export const AI_ASSISTANTS: Assistant[] = [
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/?q={q}', prefill: true },
  { id: 'claude', name: 'Claude', url: 'https://claude.ai/new?q={q}', prefill: true },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai/search?q={q}', prefill: true },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app', prefill: false },
  { id: 'copilot', name: 'Copilot', url: 'https://copilot.microsoft.com/', prefill: false },
  { id: 'other', name: 'Other', url: '', prefill: false },
];

export function assistantById(id: string): Assistant {
  return AI_ASSISTANTS.find((a) => a.id === id) ?? AI_ASSISTANTS[0];
}

/** The text handed to the assistant: the links, one per line, nothing else. */
export function linksText(urls: string[]): string {
  return urls.filter((u) => /^https?:\/\//.test(u)).join('\n');
}

/** Where to send the reader, and whether the links must be copied for them to paste. */
export function askTarget(assistantId: string, urls: string[]): { href: string | null; copy: boolean; text: string } {
  const a = assistantById(assistantId);
  const text = linksText(urls);
  if (!a.url) return { href: null, copy: true, text };
  if (a.prefill) return { href: a.url.replace('{q}', encodeURIComponent(text)), copy: false, text };
  return { href: a.url, copy: true, text };
}

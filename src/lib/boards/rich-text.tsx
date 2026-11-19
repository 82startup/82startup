import { Fragment, type ReactNode } from "react";

// Post and comment text is plain text. Two things are honoured: **bold** on a single line, and http(s) addresses,
// which become links that open in a new tab. React escapes every piece, so nothing a member types becomes HTML.
export type RichPart = { kind: "text" | "bold" | "link"; text: string; href?: string };

const BOLD = /\*\*([^*\n]+?)\*\*/g;
const URL_RE = /https?:\/\/[^\s<>"'`]+/g;
// Punctuation that usually ends a sentence rather than the address.
const TRAILING = /[.,;:!?)\]}'"]+$/;

function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function splitLinks(text: string, bold: boolean): RichPart[] {
  const parts: RichPart[] = [];
  const plain = bold ? "bold" : "text";
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    let raw = m[0];
    const trail = raw.match(TRAILING)?.[0] ?? "";
    if (trail) raw = raw.slice(0, -trail.length);
    const href = safeHref(raw);
    if (!href) continue;
    if (m.index > last) parts.push({ kind: plain, text: text.slice(last, m.index) });
    parts.push({ kind: "link", text: raw, href });
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push({ kind: plain, text: text.slice(last) });
  return parts;
}

export function parseRichText(text: string): RichPart[] {
  const parts: RichPart[] = [];
  let last = 0;
  for (const m of text.matchAll(BOLD)) {
    if (m.index > last) parts.push(...splitLinks(text.slice(last, m.index), false));
    parts.push(...splitLinks(m[1], true));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(...splitLinks(text.slice(last), false));
  return parts;
}

export function RichText({ text }: { text: string }): ReactNode {
  return parseRichText(text).map((p, i) => {
    if (p.kind === "link") return <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow ugc">{p.text}</a>;
    if (p.kind === "bold") return <strong key={i}>{p.text}</strong>;
    return <Fragment key={i}>{p.text}</Fragment>;
  });
}

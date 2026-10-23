import Markdown, { type Components } from "react-markdown";
import { safeImageUrl, safeLinkUrl, shiftedHeading } from "@/lib/events/markdown";

const HEADING_CLASS = "mb-2 mt-4 font-semibold";

const heading =
  (depth: number): Components["h1"] =>
  function Heading({ children }) {
    const Tag = shiftedHeading(depth);
    return <Tag className={`${HEADING_CLASS} ${depth === 1 ? "text-xl" : "text-lg"}`}>{children}</Tag>;
  };

// react-markdown is run with raw HTML switched off, and its own address filter stays on; these components check again.
const components: Components = {
  h1: heading(1),
  h2: heading(2),
  h3: heading(3),
  h4: heading(4),
  h5: heading(5),
  h6: heading(6),
  p: ({ children }) => <p className="mb-3 whitespace-pre-line break-words">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal pl-6">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="mb-3 border-l-4 pl-4 text-zinc-600 dark:text-zinc-400">{children}</blockquote>,
  pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded bg-zinc-100 p-3 text-sm dark:bg-zinc-900">{children}</pre>,
  a({ href, children }) {
    const safe = safeLinkUrl(href);
    return safe ? (
      <a href={safe} target="_blank" rel="noopener noreferrer nofollow" className="break-words underline">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    );
  },
  img({ src, alt }) {
    const safe = typeof src === "string" ? safeImageUrl(src) : null;
    if (!safe) return <span>{alt ?? ""}</span>;
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Luma-hosted picture; no image optimizer configured
      <img src={safe} alt={alt ?? ""} loading="lazy" referrerPolicy="no-referrer" className="my-3 h-auto max-w-full rounded" />
    );
  },
};

// The event description as written in Luma. Falls back to the plain text when there is no formatted description.
export function EventDescription({ markdown, fallback }: { markdown: string; fallback: string }) {
  if (!markdown.trim()) return fallback ? <p className="whitespace-pre-line">{fallback}</p> : null;
  return (
    <div className="break-words">
      <Markdown skipHtml components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}

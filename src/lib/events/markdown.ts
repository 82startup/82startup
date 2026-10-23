// Rules for showing an event description written in Luma. The text is untrusted (whoever edits the event wrote it), so only
// these things are let through.

const LINK_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);
// Luma's own picture hosts. A picture from anywhere else would tell its owner who reads the page, so it is not loaded.
const IMAGE_HOSTS = new Set(["images.lumacdn.com", "cdn.lu.ma"]);

function parse(value: string | null | undefined): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null; // not an absolute address (relative, empty, garbage)
  }
}

export function safeLinkUrl(href: string | null | undefined): string | null {
  const url = parse(href);
  return url && LINK_PROTOCOLS.has(url.protocol) ? url.href : null;
}

export function safeImageUrl(src: string | null | undefined): string | null {
  const url = parse(src);
  if (!url || url.protocol !== "https:" || url.username || url.password) return null;
  return IMAGE_HOSTS.has(url.hostname.toLowerCase()) ? url.href : null;
}

// A heading in the description moves down one level (never past h6), so the page keeps its single h1.
export function shiftedHeading(depth: number): "h2" | "h3" | "h4" | "h5" | "h6" {
  return `h${Math.min(Math.max(depth, 1) + 1, 6)}` as "h2" | "h3" | "h4" | "h5" | "h6";
}

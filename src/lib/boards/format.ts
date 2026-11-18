export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// The first `max` characters of a text on one line, with an ellipsis when it was cut.
export function previewText(body: string, max: number): string {
  const text = body.replace(/\s+/g, " ").trim();
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}

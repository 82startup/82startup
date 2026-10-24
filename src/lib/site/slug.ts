const MAX = 80;

// Lower-case latin words joined by dashes; "speaker" when the name has none (for example a Korean name); a number is added until it is free.
export function makeSpeakerSlug(name: string, taken: ReadonlySet<string>): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX - 6)
      .replace(/-+$/, "") || "speaker";
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

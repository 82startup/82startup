import { describe, expect, it } from "vitest";
import { makeSpeakerSlug } from "./slug";

describe("makeSpeakerSlug", () => {
  it("makes lower-case words joined by dashes", () => {
    expect(makeSpeakerSlug("Ada  Lee!", new Set())).toBe("ada-lee");
    expect(makeSpeakerSlug("  José O'Brien-Smith ", new Set())).toBe("jos-o-brien-smith");
  });
  it("falls back to 'speaker' for a name with no latin letters or digits", () => {
    expect(makeSpeakerSlug("김하나", new Set())).toBe("speaker");
    expect(makeSpeakerSlug("!!!", new Set())).toBe("speaker");
  });
  it("adds a number until the slug is free", () => {
    expect(makeSpeakerSlug("Ada Lee", new Set(["ada-lee"]))).toBe("ada-lee-2");
    expect(makeSpeakerSlug("Ada Lee", new Set(["ada-lee", "ada-lee-2"]))).toBe("ada-lee-3");
    expect(makeSpeakerSlug("김하나", new Set(["speaker"]))).toBe("speaker-2");
  });
  it("keeps the slug within 80 characters, even with a number", () => {
    const slug = makeSpeakerSlug("a".repeat(200), new Set(["a".repeat(70)]));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

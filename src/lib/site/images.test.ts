import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, checkImage, isSitePath, siteImagePath, siteImageUrl } from "./images";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const JPG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];
const bytes = (head: number[], size = head.length) => {
  const out = new Uint8Array(size);
  out.set(head);
  return out;
};
const ID = "11111111-2222-3333-4444-555555555555";

describe("checkImage", () => {
  it("accepts a PNG, a JPEG and a WebP by their content, with the right extension", () => {
    expect(checkImage(bytes(PNG))).toEqual({ ok: true, ext: "png" });
    expect(checkImage(bytes(JPG))).toEqual({ ok: true, ext: "jpg" });
    expect(checkImage(bytes(WEBP))).toEqual({ ok: true, ext: "webp" });
  });
  it("refuses an SVG, a GIF, text and an HTML page even when named like a picture", () => {
    const text = (s: string) => new TextEncoder().encode(s);
    for (const bad of [text("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), text("GIF89a......"), text("<html><script>x</script></html>"), text("hello world, not a picture")]) {
      expect(checkImage(bad)).toEqual({ ok: false, reason: "type" });
    }
  });
  it("refuses an empty file and one over 500 KB, accepts exactly 500 KB", () => {
    expect(checkImage(new Uint8Array(0))).toEqual({ ok: false, reason: "size" });
    expect(checkImage(bytes(PNG, MAX_IMAGE_BYTES + 1))).toEqual({ ok: false, reason: "size" });
    expect(checkImage(bytes(PNG, MAX_IMAGE_BYTES))).toMatchObject({ ok: true });
    expect(MAX_IMAGE_BYTES).toBe(512000);
  });
});

describe("site image paths", () => {
  it("builds sponsors/ and speakers/ paths with the id and extension", () => {
    expect(siteImagePath("sponsors", ID, "png")).toBe(`sponsors/${ID}.png`);
    expect(siteImagePath("speakers", ID, "jpg")).toBe(`speakers/${ID}.jpg`);
  });
  it("recognises only a path in the right folder with a uuid name", () => {
    expect(isSitePath("sponsors", `sponsors/${ID}.webp`)).toBe(true);
    for (const bad of [`speakers/${ID}.png`, `sponsors/${ID}.svg`, `sponsors/../${ID}.png`, "sponsors/x.png", "https://evil.test/a.png", "", null, undefined]) {
      expect(isSitePath("sponsors", bad)).toBe(false);
    }
  });
  it("builds the public address inside our own storage bucket", () => {
    expect(siteImageUrl("http://127.0.0.1:55321/", `sponsors/${ID}.png`)).toBe(`http://127.0.0.1:55321/storage/v1/object/public/site-images/sponsors/${ID}.png`);
  });
  it("gives no address for a missing or malformed path", () => {
    expect(siteImageUrl("http://x.test", null)).toBeNull();
    expect(siteImageUrl("http://x.test", "https://evil.test/a.png")).toBeNull();
    expect(siteImageUrl("http://x.test", "../etc/passwd")).toBeNull();
  });
});

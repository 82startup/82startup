export const SITE_BUCKET = "site-images";
export const MAX_IMAGE_BYTES = 512000; // 500 KB, the same limit the bucket enforces

export type ImageKind = "sponsors" | "speakers";
type Ext = "png" | "jpg" | "webp";

const PATH = /^(sponsors|speakers)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/;

// The kind of picture is read from the file's own first bytes (what the browser calls it is not trusted). SVG, GIF and anything else is refused.
export function checkImage(bytes: Uint8Array): { ok: true; ext: Ext } | { ok: false; reason: "type" | "size" } {
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return { ok: false, reason: "size" };
  const at = (i: number) => bytes[i];
  if (bytes.length >= 8 && at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return { ok: true, ext: "png" };
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return { ok: true, ext: "jpg" };
  if (bytes.length >= 12 && at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 && at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50) return { ok: true, ext: "webp" };
  return { ok: false, reason: "type" };
}

export function siteImagePath(kind: ImageKind, id: string, ext: Ext): string {
  return `${kind}/${id}.${ext}`;
}

export function isSitePath(kind: ImageKind, path: string | null | undefined): path is string {
  return typeof path === "string" && PATH.test(path) && path.startsWith(`${kind}/`);
}

// The public address of a picture in our own bucket, or null for anything that is not one of our paths.
export function siteImageUrl(baseUrl: string, path: string | null | undefined): string | null {
  if (typeof path !== "string" || !PATH.test(path)) return null;
  return `${baseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${SITE_BUCKET}/${path}`;
}

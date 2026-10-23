export const AVATAR_BUCKET = "avatars";
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024; // the picture a member picks
export const AVATAR_SIZE = 400; // pixels, square
export const TARGET_BYTES = 150 * 1024; // what the browser aims for
export const MAX_STORED_BYTES = 200 * 1024; // what the bucket accepts

const SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const QUALITIES = [0.82, 0.72, 0.62, 0.52] as const;
export const FIRST_QUALITY = QUALITIES[0];

const UUID_JPG = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;
const OBJECT_PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;
const PUBLIC_PREFIX = `/storage/v1/object/public/${AVATAR_BUCKET}/`;

export function checkSourceFile(file: { type: string; size: number }): "ok" | "type" | "size" {
  if (!SOURCE_TYPES.has(file.type)) return "type";
  if (file.size <= 0 || file.size > MAX_SOURCE_BYTES) return "size";
  return "ok";
}

// The largest centred square of a width x height picture, in whole pixels.
export function squareCrop(width: number, height: number): { sx: number; sy: number; size: number } {
  const size = Math.floor(Math.min(width, height));
  return { sx: Math.floor((width - size) / 2), sy: Math.floor((height - size) / 2), size };
}

// The next lower JPEG quality to try, or null at the floor (or for a value that is not a step).
export function nextQuality(quality: number): number | null {
  const index = (QUALITIES as readonly number[]).indexOf(quality);
  return index === -1 || index === QUALITIES.length - 1 ? null : QUALITIES[index + 1];
}

export function avatarPath(userId: string, id: string): string {
  return `${userId}/${id}.jpg`;
}

// Exactly <own account id>/<random lower-case uuid>.jpg: the only shape a member may store or point their profile at.
export function isOwnAvatarPath(path: string, userId: string): boolean {
  const prefix = `${userId}/`;
  return path.startsWith(prefix) && UUID_JPG.test(path.slice(prefix.length));
}

export function avatarPublicUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${PUBLIC_PREFIX}${path}`;
}

// The object path of one of this project's own avatar addresses, or null for anything else (so only our own uploads are ever deleted).
export function pathFromAvatarUrl(url: string | null | undefined, baseUrl: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== new URL(baseUrl).origin || !parsed.pathname.startsWith(PUBLIC_PREFIX)) return null;
    const path = parsed.pathname.slice(PUBLIC_PREFIX.length);
    return OBJECT_PATH.test(path) ? path : null;
  } catch {
    return null;
  }
}

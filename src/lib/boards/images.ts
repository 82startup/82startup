export const BOARD_IMAGE_BUCKET = "board-images";
export const BOARD_IMAGE_MAX_BYTES = 512000; // what the bucket accepts (500 KB)
export const BOARD_IMAGE_TARGET_BYTES = 400 * 1024; // what the browser aims for
export const BOARD_IMAGE_MAX_SIDE = 1600; // pixels, the long side

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
// Old posts use 1-4; new pictures get a random uuid so a replaced picture has a new address.
const FILE = `(?:[1-4]|${UUID})`;
const UUID_ONLY = new RegExp(`^${UUID}$`);
const ANY_PATH = new RegExp(`^${UUID}/${UUID}/${FILE}\\.jpg$`);

export function boardImagePath(userId: string, postId: string, fileId: string): string {
  return `${userId}/${postId}/${fileId}.jpg`;
}

// Exactly <own account id>/<this post id>/<1-4 or uuid>.jpg: the only shape a member may store for a post.
export function isOwnBoardImagePath(path: string, userId: string, postId: string): boolean {
  if (!UUID_ONLY.test(userId) || !UUID_ONLY.test(postId)) return false;
  return new RegExp(`^${userId}/${postId}/${FILE}\\.jpg$`).test(path);
}

export function isBoardImagePath(path: string): boolean {
  return ANY_PATH.test(path);
}

// The public address of a stored image, or null for anything that is not one of our paths.
export function boardImagePublicUrl(baseUrl: string, path: string): string | null {
  if (!isBoardImagePath(path)) return null;
  return `${baseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${BOARD_IMAGE_BUCKET}/${path}`;
}

// Scale a picture down so its long side is at most `max`, keeping the ratio. Never enlarges.
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= max) return { width, height };
  const scale = max / long;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

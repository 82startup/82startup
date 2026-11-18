export const BOARD_IMAGE_BUCKET = "board-images";
export const BOARD_IMAGE_MAX_BYTES = 512000; // what the bucket accepts (500 KB)
export const BOARD_IMAGE_TARGET_BYTES = 400 * 1024; // what the browser aims for
export const BOARD_IMAGE_MAX_SIDE = 1600; // pixels, the long side

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ANY_PATH = new RegExp(`^${UUID}/${UUID}/[1-4]\\.jpg$`);

export function boardImagePath(userId: string, postId: string, n: number): string {
  return `${userId}/${postId}/${n}.jpg`;
}

// Exactly <own account id>/<this post id>/<1-4>.jpg: the only shape a member may store for a post.
export function isOwnBoardImagePath(path: string, userId: string, postId: string): boolean {
  return new RegExp(`^${userId}/${postId}/[1-4]\\.jpg$`).test(path);
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

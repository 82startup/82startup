// Browser only. Reads the picked picture, cuts the largest centred square, draws it at 400 x 400 and saves it as a small JPEG.
// Drawing it again also drops the camera's hidden data (location, device). The original is never uploaded.
import { AVATAR_SIZE, FIRST_QUALITY, MAX_STORED_BYTES, TARGET_BYTES, nextQuality, squareCrop } from "./photo";

export class PhotoError extends Error {
  readonly kind: "decode" | "tooBig";
  constructor(kind: "decode" | "tooBig") {
    super(kind);
    this.name = "PhotoError";
    this.kind = kind;
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function makeAvatarBlob(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError("decode");
  }

  const { sx, sy, size } = squareCrop(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new PhotoError("decode");
  context.fillStyle = "#ffffff"; // JPEG has no transparency
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.drawImage(bitmap, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();

  let quality: number | null = FIRST_QUALITY;
  let last: Blob | null = null;
  while (quality !== null) {
    const blob = await toBlob(canvas, quality);
    if (!blob) throw new PhotoError("decode");
    last = blob;
    if (blob.size <= TARGET_BYTES) return blob;
    quality = nextQuality(quality);
  }
  if (last && last.size <= MAX_STORED_BYTES) return last;
  throw new PhotoError("tooBig");
}

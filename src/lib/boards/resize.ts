// Browser only. Draws the picked picture at most 1,600 px on the long side and saves it as a JPEG under 500 KB.
// Drawing it again also drops the camera's hidden data (location, device). The original is never uploaded.
import { FIRST_QUALITY, nextQuality } from "@/lib/profile/photo";
import { PhotoError } from "@/lib/profile/resize";
import { BOARD_IMAGE_MAX_BYTES, BOARD_IMAGE_MAX_SIDE, BOARD_IMAGE_TARGET_BYTES, fitWithin } from "./images";

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function makeBoardImageBlob(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError("decode");
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height, BOARD_IMAGE_MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new PhotoError("decode");
  context.fillStyle = "#ffffff"; // JPEG has no transparency
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality: number | null = FIRST_QUALITY;
  let last: Blob | null = null;
  while (quality !== null) {
    const blob = await toBlob(canvas, quality);
    if (!blob) throw new PhotoError("decode");
    last = blob;
    if (blob.size <= BOARD_IMAGE_TARGET_BYTES) return blob;
    quality = nextQuality(quality);
  }
  if (last && last.size <= BOARD_IMAGE_MAX_BYTES) return last;
  throw new PhotoError("tooBig");
}

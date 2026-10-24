// Browser only. Gets a picked picture ready for upload: a big picture is drawn smaller and saved again until it is under the limit, so nobody has to
// shrink pictures by hand. The original is never uploaded, and redrawing also drops the camera's hidden data (location, device).
import { checkSourceFile } from "@/lib/profile/photo";
import type { ImageKind } from "./images";
import { MAX_TARGET_BYTES, attemptsFor, fitWithin, keepsAsIs } from "./resize-plan";

export type PrepareError = "type" | "size" | "decode" | "tooBig";
export type Prepared = { ok: true; file: File; changed: boolean } | { ok: false; error: PrepareError };

const EXTENSION = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareSiteImage(file: File, kind: ImageKind): Promise<Prepared> {
  const source = checkSourceFile(file);
  if (source !== "ok") return { ok: false, error: source };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { ok: false, error: "decode" };
  }

  try {
    if (keepsAsIs(kind, { size: file.size, width: bitmap.width, height: bitmap.height })) return { ok: true, file, changed: false };

    for (const attempt of attemptsFor(kind)) {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, attempt.max);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return { ok: false, error: "decode" };
      if (attempt.type === "image/jpeg") {
        context.fillStyle = "#ffffff"; // JPEG has no transparency
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await toBlob(canvas, attempt.type, attempt.quality);
      // A browser that cannot save this format answers with another one (for example PNG for WebP): skip that attempt.
      if (!blob || blob.type !== attempt.type) continue;
      if (blob.size <= MAX_TARGET_BYTES) {
        const name = file.name.replace(/\.[^.]*$/, "") || "picture";
        return { ok: true, file: new File([blob], `${name}.${EXTENSION[attempt.type]}`, { type: attempt.type }), changed: true };
      }
    }
    return { ok: false, error: "tooBig" };
  } finally {
    bitmap.close();
  }
}

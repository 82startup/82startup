import type { ImageKind } from "./images";

// What the browser aims for: under the 500 KB the bucket accepts, with some room.
export const MAX_TARGET_BYTES = 480_000;

export type Attempt = { type: "image/jpeg" | "image/png" | "image/webp"; quality: number; max: number };

const LIMITS = { speakers: 1000, sponsors: 800 } as const;

// The largest size that fits inside max x max, in whole pixels, with the same proportions. Never bigger than the original.
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// The ways to save a picture, in the order they are tried until one is small enough. A speaker photo is a JPEG; a logo stays a PNG (it may be
// transparent), then WebP (also transparent, and smaller), then a smaller size.
export function attemptsFor(kind: ImageKind): Attempt[] {
  if (kind === "speakers") {
    return [
      { type: "image/jpeg", quality: 0.85, max: 1000 },
      { type: "image/jpeg", quality: 0.75, max: 1000 },
      { type: "image/jpeg", quality: 0.65, max: 1000 },
      { type: "image/jpeg", quality: 0.7, max: 800 },
      { type: "image/jpeg", quality: 0.6, max: 600 },
    ];
  }
  return [
    { type: "image/png", quality: 1, max: 800 },
    { type: "image/webp", quality: 0.9, max: 800 },
    { type: "image/webp", quality: 0.75, max: 800 },
    { type: "image/png", quality: 1, max: 600 },
    { type: "image/webp", quality: 0.75, max: 400 },
    { type: "image/png", quality: 1, max: 400 },
  ];
}

// A logo that is already light and not too large is used as it is. A speaker photo is always redrawn (that also removes the hidden camera data).
export function keepsAsIs(kind: ImageKind, file: { size: number; width: number; height: number }): boolean {
  return kind === "sponsors" && file.size <= MAX_TARGET_BYTES && Math.max(file.width, file.height) <= LIMITS.sponsors;
}

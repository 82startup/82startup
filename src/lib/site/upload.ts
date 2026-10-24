import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_BUCKET, checkImage, siteImagePath, type ImageKind } from "./images";

const CONTENT_TYPE = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" } as const;

type Storage = Pick<SupabaseClient, "storage">;

// Stores an admin's picture under a new random name. The kind is read from the file's own bytes, not from what the browser says.
export async function storeSiteImage(supabase: Storage, kind: ImageKind, file: File): Promise<{ ok: true; path: string } | { ok: false; reason: "type" | "size" | "save" }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = checkImage(bytes);
  if (!checked.ok) return checked;
  const path = siteImagePath(kind, crypto.randomUUID(), checked.ext);
  const { error } = await supabase.storage.from(SITE_BUCKET).upload(path, bytes, { contentType: CONTENT_TYPE[checked.ext], upsert: false });
  return error ? { ok: false, reason: "save" } : { ok: true, path };
}

// Best effort: a picture that cannot be removed is only left behind, never shown (no row points at it).
export async function removeSiteImage(supabase: Storage, path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabase.storage.from(SITE_BUCKET).remove([path]).catch(() => {});
}

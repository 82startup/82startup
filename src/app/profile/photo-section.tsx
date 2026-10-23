"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { copy } from "@/lib/copy";
import { AVATAR_BUCKET, avatarPath, checkSourceFile } from "@/lib/profile/photo";
import { PhotoError, makeAvatarBlob } from "@/lib/profile/resize";
import { createClient } from "@/lib/supabase/browser";
import { removeAvatar, setAvatar } from "./photo-actions";

type Props = { userId: string; name: string; avatarUrl: string | null };

export function PhotoSection({ userId, name, avatarUrl }: Props) {
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, startSaving] = useTransition();
  const [removeState, removeAction, removing] = useActionState(removeAvatar, {});
  const input = useRef<HTMLInputElement>(null);

  function clearPreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    if (input.current) input.current.value = "";
  }

  async function onPick(file: File | undefined) {
    setError(null);
    clearPreview();
    if (!file) return;
    const check = checkSourceFile(file);
    if (check !== "ok") {
      setError(copy.photo.errors[check]);
      if (input.current) input.current.value = "";
      return;
    }
    setReading(true);
    try {
      const blob = await makeAvatarBlob(file);
      setPreview({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      setError(e instanceof PhotoError && e.kind === "tooBig" ? copy.photo.errors.tooBig : copy.photo.errors.decode);
      if (input.current) input.current.value = "";
    } finally {
      setReading(false);
    }
  }

  function onSave() {
    if (!preview) return;
    const { blob } = preview;
    setError(null);
    startSaving(async () => {
      const path = avatarPath(userId, crypto.randomUUID());
      const { error: uploadError } = await createClient()
        .storage.from(AVATAR_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (uploadError) {
        setError(copy.photo.errors.upload);
        return;
      }
      const formData = new FormData();
      formData.set("path", path);
      const result = await setAvatar({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      clearPreview();
    });
  }

  return (
    <section className="mb-8 flex flex-col gap-3 rounded border p-4">
      <h2 className="text-lg font-semibold">{copy.photo.title}</h2>
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the picture about to be saved
          <img src={preview.url} alt={copy.photo.preview} width={96} height={96} className="h-24 w-24 flex-none rounded-full object-cover" />
        ) : (
          <Avatar name={name} url={avatarUrl} size={96} />
        )}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label={copy.photo.choose}
            disabled={reading || saving}
            onChange={(e) => onPick(e.target.files?.[0])}
            className="w-full min-w-0 text-sm"
          />
          {preview && (
            <div className="flex gap-2">
              <button type="button" onClick={onSave} disabled={saving} className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black">
                {saving ? copy.photo.saving : copy.photo.save}
              </button>
              <button type="button" onClick={clearPreview} disabled={saving} className="rounded border px-3 py-1 text-sm disabled:opacity-50">
                {copy.photo.cancel}
              </button>
            </div>
          )}
          {!preview && avatarUrl && (
            <form action={removeAction}>
              <button type="submit" disabled={removing} className="rounded border px-3 py-1 text-sm disabled:opacity-50">
                {copy.photo.remove}
              </button>
            </form>
          )}
        </div>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{copy.photo.hint}</p>
      {(error || removeState.error) && <p role="alert" className="text-sm text-red-700">{error ?? removeState.error}</p>}
    </section>
  );
}

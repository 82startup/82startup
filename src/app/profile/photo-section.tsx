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
    <section className="profile-photo">
      <div className="profile-photo-row">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the picture about to be saved
          <img src={preview.url} alt={copy.photo.preview} width={96} height={96} className="profile-photo-preview" />
        ) : (
          <Avatar name={name} url={avatarUrl} size={96} />
        )}
        <div className="profile-photo-copy">
          <h2>{copy.photo.title}</h2>
          <p className="profile-field-hint">{copy.photo.hint}</p>
          <div className="profile-photo-actions">
          {!preview && (
          <label className="community-action community-action-secondary profile-photo-pick" aria-disabled={reading || saving || undefined}>
            {copy.photo.choose}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label={copy.photo.choose}
            disabled={reading || saving}
            onChange={(e) => onPick(e.target.files?.[0])}
            className="visually-hidden"
          />
          </label>
          )}
          {preview && (
            <>
              <button type="button" onClick={onSave} disabled={saving} className="community-action">
                {saving ? copy.photo.saving : copy.photo.save}
              </button>
              <button type="button" onClick={clearPreview} disabled={saving} className="community-action community-action-secondary">
                {copy.photo.cancel}
              </button>
            </>
          )}
          {!preview && avatarUrl && (
            <form action={removeAction}>
              <button type="submit" disabled={removing} className="action-quiet">
                {copy.photo.remove}
              </button>
            </form>
          )}
          </div>
          {(error || removeState.error) && <p role="alert" className="profile-field-error">{error ?? removeState.error}</p>}
        </div>
      </div>
    </section>
  );
}

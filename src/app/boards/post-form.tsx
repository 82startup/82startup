"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Toast } from "@/components/toast";
import { copy } from "@/lib/copy";
import { cleanBody, cleanTitle, MAX_IMAGES } from "@/lib/boards/form";
import { BOARD_IMAGE_BUCKET, boardImagePath, boardImagePublicUrl } from "@/lib/boards/images";
import { makeBoardImageBlob } from "@/lib/boards/resize";
import { checkSourceFile } from "@/lib/profile/photo";
import { PhotoError } from "@/lib/profile/resize";
import { createClient } from "@/lib/supabase/browser";
import { createBoardPost, updateBoardPost } from "./actions";

type Picked = { id: string; blob: Blob; url: string };
class UploadFailed extends Error {}

function isRedirect(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

type Notice = { message: string; tone: "error" | "success" };

type Initial = { postId: string; title: string; body: string; images: string[] };

export function PostForm({ slug, userId, mode, initial }: { slug: string; userId: string; mode: "create" | "edit"; initial?: Initial }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  // Pictures already stored with the post (edit mode), by path; removing one here drops it when the post is saved.
  const initialImages = useRef<string[]>(initial?.images ?? []);
  const [kept, setKept] = useState<string[]>(initial?.images ?? []);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; body?: string }>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, startSaving] = useTransition();

  // Always start (and start again) from an empty form: this page stays alive in the background after a post is published,
  // so without a reset the next "New post" would show the previous title, text and pictures.
  function resetForm() {
    formRef.current?.reset();
    setPicked((current) => {
      for (const image of current) URL.revokeObjectURL(image.url);
      return [];
    });
    setKept(initialImages.current);
    setFieldErrors({});
  }
  useEffect(() => {
    // The cleanup runs when this page is left (kept alive but hidden) or unmounted, so coming back to it finds an empty form.
    return () => resetForm();
  }, []);

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setReading(true);
    const added: Picked[] = [];
    let message: string | null = null;
    for (const file of Array.from(files)) {
      if (kept.length + picked.length + added.length >= MAX_IMAGES) {
        message = copy.boards.errors.tooManyImages;
        break;
      }
      const check = checkSourceFile(file);
      if (check !== "ok") {
        message = copy.photo.errors[check];
        continue;
      }
      try {
        const blob = await makeBoardImageBlob(file);
        added.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
      } catch (e) {
        message = e instanceof PhotoError && e.kind === "tooBig" ? copy.photo.errors.tooBig : copy.photo.errors.decode;
      }
    }
    setPicked((current) => [...current, ...added]);
    if (message) setNotice({ message, tone: "error" });
    setReading(false);
    if (input.current) input.current.value = "";
  }

  function removePicked(id: string) {
    setPicked((current) => {
      const gone = current.find((image) => image.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return current.filter((image) => image.id !== id);
    });
  }

  function removeKept(path: string) {
    setKept((current) => current.filter((candidate) => candidate !== path));
  }

  async function removeUploaded(paths: string[]) {
    if (paths.length === 0) return;
    try {
      await createClient().storage.from(BOARD_IMAGE_BUCKET).remove(paths);
    } catch {
      console.error("board image cleanup failed");
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = cleanTitle(String(form.get("title") ?? ""));
    const body = cleanBody(String(form.get("body") ?? ""));
    setFieldErrors({ title: title ? undefined : copy.boards.errors.title, body: body ? undefined : copy.boards.errors.body });
    if (!title || !body) return;

    startSaving(async () => {
      const supabase = createClient();
      const postId = initial?.postId ?? crypto.randomUUID();
      const paths: string[] = [];
      try {
        for (const image of picked) {
          const path = boardImagePath(userId, postId, crypto.randomUUID());
          const { error } = await supabase.storage.from(BOARD_IMAGE_BUCKET).upload(path, image.blob, { contentType: "image/jpeg", cacheControl: "31536000" });
          if (error) throw new UploadFailed();
          paths.push(path);
        }
      } catch {
        await removeUploaded(paths);
        setNotice({ message: copy.boards.errors.upload, tone: "error" });
        return;
      }
      const data = new FormData();
      data.set("slug", slug);
      data.set("postId", postId);
      data.set("title", title);
      data.set("body", body);
      const finalPaths = mode === "edit" ? [...kept, ...paths] : paths;
      for (const path of finalPaths) data.append("image", path);
      let result: Awaited<ReturnType<typeof createBoardPost>>;
      try {
        result = mode === "edit" ? await updateBoardPost(data) : await createBoardPost(data);
      } catch (e) {
        // The server redirects an expired session to /login; Next rejects the call with that redirect so its boundary can navigate.
        if (isRedirect(e)) throw e;
        // The outcome is unknown (the post may exist), so the uploaded pictures are kept.
        setNotice({ message: copy.boards.errors.save, tone: "error" });
        return;
      }
      if (result.error || !result.postId) {
        await removeUploaded(paths);
        setNotice({ message: result.error ?? copy.boards.errors.save, tone: "error" });
        return;
      }
      resetForm();
      router.push(`/boards/${slug}/${result.postId}`);
    });
  }

  const busy = saving || reading;
  return (
    <form ref={formRef} className="board-form" onSubmit={onSubmit} noValidate>
      <label className="profile-field">
        <span className="profile-field-label">{copy.boards.form.title}</span>
        <input name="title" defaultValue={initial?.title} maxLength={120} placeholder={copy.boards.form.titlePlaceholder} autoComplete="off" />
        {fieldErrors.title && <span className="profile-field-error" role="alert">{fieldErrors.title}</span>}
      </label>
      <label className="profile-field">
        <span className="profile-field-label">{copy.boards.form.body}</span>
        <textarea name="body" defaultValue={initial?.body} rows={10} maxLength={5000} placeholder={copy.boards.form.bodyPlaceholder} />
        {fieldErrors.body && <span className="profile-field-error" role="alert">{fieldErrors.body}</span>}
      </label>
      <div className="profile-field">
        <span className="profile-field-label">{copy.boards.form.images}</span>
        <span className="profile-field-hint">{copy.boards.form.imagesHint}</span>
        {kept.length + picked.length > 0 && (
          <ul className="board-form-images">
            {kept.map((path) => (
              <li key={path}>
                {/* eslint-disable-next-line @next/next/no-img-element -- our own public bucket; no image optimizer configured */}
                <img src={boardImagePublicUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", path) ?? ""} alt="" />
                <button type="button" className="board-form-remove" aria-label={copy.boards.form.removeImage} onClick={() => removeKept(path)}>×</button>
              </li>
            ))}
            {picked.map((image) => (
              <li key={image.id}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the picture about to be uploaded */}
                <img src={image.url} alt="" />
                <button type="button" className="board-form-remove" aria-label={copy.boards.form.removeImage} onClick={() => removePicked(image.id)}>×</button>
              </li>
            ))}
          </ul>
        )}
        {kept.length + picked.length < MAX_IMAGES && (
          <label className="community-action community-action-secondary board-form-pick" aria-disabled={busy || undefined}>
            {copy.boards.form.addImages}
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="visually-hidden" disabled={busy} onChange={(event) => void onPick(event.target.files)} />
          </label>
        )}
      </div>
      <div className="board-form-footer">
        <Link className="action-quiet" href={initial ? `/boards/${slug}/${initial.postId}` : `/boards/${slug}`}>{copy.boards.cancel}</Link>
        <button type="submit" className="community-action" disabled={busy}>{mode === "edit" ? (saving ? copy.boards.form.saving : copy.boards.form.save) : saving ? copy.boards.form.publishing : copy.boards.form.publish}</button>
      </div>
      <Toast trigger={notice} message={notice?.message} tone={notice?.tone} />
    </form>
  );
}

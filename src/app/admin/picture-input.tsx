"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";
import type { ImageKind } from "@/lib/site/images";
import { prepareSiteImage } from "@/lib/site/resize";

const messages = copy.sponsorsAdmin.errors.picture;

// A picture box that gets the picked picture ready by itself: a big picture is made smaller in the browser, so nobody has to shrink it by hand.
// The prepared file replaces the picked one in the form, and the original is never uploaded.
export function PictureInput({ name, kind, label, serverError }: { name: string; kind: ImageKind; label: string; serverError?: string }) {
  const [status, setStatus] = useState<{ busy?: boolean; error?: string; note?: string }>({});

  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        name={name}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="text-sm"
        onChange={async (event) => {
          const input = event.currentTarget;
          const picked = input.files?.[0];
          if (!picked) return setStatus({});
          setStatus({ busy: true });
          const result = await prepareSiteImage(picked, kind);
          if (!result.ok) {
            input.value = "";
            const error = { type: messages.type, size: messages.tooLarge, decode: messages.decode, tooBig: messages.tooBig }[result.error];
            return setStatus({ error });
          }
          if (result.changed) {
            const transfer = new DataTransfer();
            transfer.items.add(result.file);
            input.files = transfer.files;
          }
          setStatus({ note: result.changed ? copy.sponsorsAdmin.errors.resized : undefined });
        }}
      />
      {status.busy && <span className="font-normal text-zinc-600 dark:text-zinc-400">{copy.sponsorsAdmin.errors.preparing}</span>}
      {status.note && <span role="status" className="font-normal text-zinc-600 dark:text-zinc-400">{status.note}</span>}
      {(status.error ?? serverError) && <span role="alert" className="font-normal text-red-700">{status.error ?? serverError}</span>}
    </label>
  );
}

import { initials, safeAvatarUrl } from "@/lib/members/avatar";

// A profile picture, or the member's initials when there is none we trust.
export function Avatar({ name, url, size = 48 }: { name: string; url: string | null; size?: number }) {
  const src = safeAvatarUrl(url);
  const box = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Google-hosted picture; no image optimizer configured
      <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" width={size} height={size} style={box} className="flex-none rounded-full object-cover" />
    );
  }
  return (
    <span aria-hidden style={box} className="flex flex-none items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold dark:bg-zinc-800">
      {initials(name)}
    </span>
  );
}
